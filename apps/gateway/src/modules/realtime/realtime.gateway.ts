import { RedisService } from '@chat-app/redis';
import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { AuthService } from '../auth/auth.service';
import { ChatService } from '../chat/chat.service';
 

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'chat',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly chatService: ChatService,
    private readonly redisService: RedisService
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      let authHeader = socket.handshake.headers['authorization'];
      
      // Fallback to auth token or query parameters for browser WebSocket handshake compatibilities
      if (!authHeader) {
        const tokenVal = socket.handshake.auth?.token || socket.handshake.auth?.Authorization || socket.handshake.query?.token;
        if (typeof tokenVal === 'string') {
          authHeader = tokenVal;
        }
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.logger.warn(`❌ Socket connection rejected: Missing authorization header`);
        socket.disconnect(true);
        return;
      }

      const token = authHeader.split(' ')[1];
      const payload = await this.authService.validateToken(token);
      
      // Bind connection identity
      socket.data.userId = payload.userId;
      socket.data.email = payload.email;

      // Join private user room (allows targeting all devices owned by user)
      const userRoom = `user:${payload.userId}`;
      await socket.join(userRoom);

      // Register presence inside Redis — respect existing user-set status (e.g. DND)
      const redisClient = this.redisService.getClient();
      const existingRaw = await redisClient.hget('presence:status', payload.userId);
      let currentStatus = 'online';
      if (existingRaw) {
        try {
          const existing = JSON.parse(existingRaw);
          // Keep DND status across reconnects; reset away/offline to online
          if (existing.status === 'dnd') {
            currentStatus = 'dnd';
          }
        } catch (_) {}
      }

      await redisClient.hset('presence:status', payload.userId, JSON.stringify({
        userId: payload.userId,
        status: currentStatus,
        lastSeen: new Date().toISOString(),
      }));

      this.logger.log(`✔ Socket connected: User ${payload.userId} joined room ${userRoom} with status '${currentStatus}'`);

      // Broadcast status change to all other users
      this.server.emit('user.status.changed', { userId: payload.userId, status: currentStatus });
      // Legacy backward-compat event
      this.server.emit('user.online', { userId: payload.userId });

      // Fetch ALL presence data and send to the newly connected client
      const allPresence = await redisClient.hgetall('presence:status');
      const presenceList: { userId: string; status: string }[] = [];
      for (const [uid, presenceJson] of Object.entries(allPresence)) {
        try {
          const presence = JSON.parse(presenceJson);
          presenceList.push({ userId: uid, status: presence.status || 'offline' });
        } catch (_) {}
      }
      // Full sync with rich status strings
      socket.emit('user.presence.full.sync', { users: presenceList });
      // Legacy backward-compat sync
      socket.emit('user.presence.sync', { onlineUserIds: presenceList.filter(p => p.status === 'online' || p.status === 'away' || p.status === 'dnd').map(p => p.userId) });

    } catch (error) {
      this.logger.error(`❌ Socket authentication error`, error);
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      const userRoom = `user:${userId}`;
      this.logger.log(`✔ Socket disconnected: User ${userId} left room ${userRoom}`);

      // Update presence status to away on disconnect (not fully offline - could be a tab refresh)
      const redisClient = this.redisService.getClient();
      await redisClient.hset('presence:status', userId, JSON.stringify({
        userId,
        status: 'away',
        lastSeen: new Date().toISOString(),
      }));

      // Broadcast status change
      this.server.emit('user.status.changed', { userId, status: 'away' });
      // Legacy backward-compat event
      this.server.emit('user.offline', { userId });
    }
  }

  @SubscribeMessage('join.conversation')
  async handleJoinConversation(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() socket: Socket
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const roomName = `conv:${conversationId}`;
    
    await socket.join(roomName);
    this.logger.log(`✔ User ${userId} joined room ${roomName}`);
  }

  @SubscribeMessage('send.message')
  async handleSendMessage(
    @MessageBody() body: { conversationId: string; content: string },
    @ConnectedSocket() socket: Socket
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const { conversationId, content } = body;

    // Save message in PostgreSQL system of record
    const message = await this.chatService.createMessage(conversationId, userId, content);

    // Fetch all conversation members to broadcast to each participant's private user room
    const members = await this.chatService.getConversationMembers(conversationId);
    for (const member of members) {
      const memberRoom = `user:${member.userId}`;
      this.server.to(memberRoom).emit('message.new', message);
    }
    this.logger.log(`✔ Broadcasted new message in conversation ${conversationId} to ${members.length} members from ${userId}`);
  }

  @SubscribeMessage('typing.started')
  handleTypingStarted(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() socket: Socket
  ): void {
    const userId = socket.data.userId as string;
    const roomName = `conv:${conversationId}`;
    socket.to(roomName).emit('typing.started', { conversationId, userId });
  }

  @SubscribeMessage('typing.stopped')
  handleTypingStopped(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() socket: Socket
  ): void {
    const userId = socket.data.userId as string;
    const roomName = `conv:${conversationId}`;
    socket.to(roomName).emit('typing.stopped', { conversationId, userId });
  }

  /**
   * Handle manual status updates from the client.
   * Allows users to set 'online', 'away', 'dnd', or 'offline'.
   */
  @SubscribeMessage('user.status.update')
  async handleUserStatusUpdate(
    @MessageBody('status') status: string,
    @ConnectedSocket() socket: Socket
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const allowedStatuses = ['online', 'away', 'dnd', 'offline'];
    const safeStatus = allowedStatuses.includes(status) ? status : 'online';

    this.logger.log(`🟡 User ${userId} manually set status to '${safeStatus}'`);

    // Persist in Redis
    const redisClient = this.redisService.getClient();
    await redisClient.hset('presence:status', userId, JSON.stringify({
      userId,
      status: safeStatus,
      lastSeen: new Date().toISOString(),
    }));

    // Broadcast status change to all connected clients
    this.server.emit('user.status.changed', { userId, status: safeStatus });

    // Acknowledge back to the requesting socket
    socket.emit('user.status.ack', { status: safeStatus });
  }
}
