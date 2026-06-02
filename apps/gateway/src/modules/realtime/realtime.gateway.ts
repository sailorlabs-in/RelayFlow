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

      // Register presence inside Redis
      const redisClient = this.redisService.getClient();
      await redisClient.hset('presence:status', payload.userId, JSON.stringify({
        status: 'online',
        lastSeen: new Date().toISOString(),
      }));

      this.logger.log(`✔ Socket connected: User ${payload.userId} joined room ${userRoom}`);

      // Broadcast user online status to all other users
      this.server.emit('user.online', { userId: payload.userId });

      // Fetch all online users from Redis to sync with the newly connected user
      const allPresence = await redisClient.hgetall('presence:status');
      const onlineUserIds: string[] = [];
      for (const [uid, presenceJson] of Object.entries(allPresence)) {
        try {
          const presence = JSON.parse(presenceJson);
          if (presence.status === 'online') {
            onlineUserIds.push(uid);
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      // Emit the initial list of online users to the newly connected user's socket
      socket.emit('user.presence.sync', { onlineUserIds });

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

      // Update presence status to offline in Redis
      const redisClient = this.redisService.getClient();
      await redisClient.hset('presence:status', userId, JSON.stringify({
        status: 'offline',
        lastSeen: new Date().toISOString(),
      }));

      // Broadcast user offline status
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
}
