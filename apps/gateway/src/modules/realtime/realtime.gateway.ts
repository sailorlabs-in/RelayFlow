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
      const authHeader = socket.handshake.headers['authorization'];
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

      // Broadcast user online status
      this.server.emit('user.online', { userId: payload.userId });

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

    // Broadcast to conversation participants room
    const roomName = `conv:${conversationId}`;
    this.server.to(roomName).emit('message.new', message);
    this.logger.log(`✔ Broadcasted new message in room ${roomName} from ${userId}`);
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
