import { ConversationType } from '@chat-app/database';
import { RedisService } from '@chat-app/redis';
import {
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UseGuards,
  OnModuleInit,
} from '@nestjs/common';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueNames } from '@chat-app/queues';
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
import { NotificationService } from '../chat/notification.service';
import { UsersService } from '../users/users.service';
import { GroupsService } from '../groups/groups.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'chat',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
    private readonly notificationService: NotificationService,
    private readonly usersService: UsersService,
    private readonly groupsService: GroupsService,
    @InjectQueue(QueueNames.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  onModuleInit() {
    // Start periodic check for users who are away by autostatus for > 10 minutes
    setInterval(
      () => {
        this.checkAndCleanupAwayUsers();
      },
      2 * 60 * 1000,
    ); // Check every 2 minutes
  }

  async checkAndCleanupAwayUsers(): Promise<void> {
    try {
      const redisClient = this.redisService.getClient();
      const allPresence = await redisClient.hgetall('presence:status');
      const now = Date.now();
      const tenMinutesMs = 10 * 60 * 1000;

      for (const [userId, presenceJson] of Object.entries(allPresence)) {
        try {
          const presence = JSON.parse(presenceJson);
          if (presence.status === 'away' && presence.autoStatus === 'away') {
            const lastSeen = new Date(presence.lastSeen).getTime();
            if (now - lastSeen >= tenMinutesMs) {
              presence.status = 'offline';
              await redisClient.hset(
                'presence:status',
                userId,
                JSON.stringify(presence),
              );

              this.logger.log(
                `🔄 Auto-cleanup: User ${userId} has been away/disconnected for >10 mins. Marked offline.`,
              );

              // Broadcast status change to all connected clients
              this.server.emit('user.status.changed', {
                userId,
                status: 'offline',
                autoStatus: 'away',
              });
              // Legacy backward-compat event
              this.server.emit('user.offline', { userId });
            }
          }
        } catch {
          // ignore parsing error for corrupted individual hash fields
        }
      }
    } catch (error) {
      this.logger.error('Failed to run presence status cleanup check', error);
    }
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      let authHeader = socket.handshake.headers['authorization'];

      // Fallback to auth token or query parameters for browser WebSocket handshake compatibilities
      if (!authHeader) {
        const tokenVal =
          socket.handshake.auth?.token ||
          socket.handshake.auth?.Authorization ||
          socket.handshake.query?.token;
        if (typeof tokenVal === 'string') {
          authHeader = tokenVal;
        }
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.logger.warn(
          `❌ Socket connection rejected: Missing authorization header`,
        );
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
      const existingRaw = await redisClient.hget(
        'presence:status',
        payload.userId,
      );
      let currentStatus = 'online';
      let currentAutoStatus = 'online';
      if (existingRaw) {
        try {
          const existing = JSON.parse(existingRaw);
          // Keep DND and offline status across reconnects; reset away to online
          if (existing.status === 'dnd' || existing.status === 'offline') {
            currentStatus = existing.status;
          }
          // Preserve automatically detected status if reconnecting
          if (existing.autoStatus === 'away') {
            currentAutoStatus = 'away';
          }
        } catch {
          // Ignore invalid cached presence payloads.
        }
      }

      await redisClient.hset(
        'presence:status',
        payload.userId,
        JSON.stringify({
          userId: payload.userId,
          status: currentStatus,
          autoStatus: currentAutoStatus,
          lastSeen: new Date().toISOString(),
        }),
      );

      this.logger.log(
        `✔ Socket connected: User ${payload.userId} joined room ${userRoom} with status '${currentStatus}' (autoStatus: '${currentAutoStatus}')`,
      );

      // Broadcast status change to all other users
      this.server.emit('user.status.changed', {
        userId: payload.userId,
        status: currentStatus,
        autoStatus: currentAutoStatus,
      });
      // Legacy backward-compat event
      if (currentStatus === 'online' && currentAutoStatus === 'online') {
        this.server.emit('user.online', { userId: payload.userId });
      }

      // Fetch ALL presence data and send to the newly connected client
      const allPresence = await redisClient.hgetall('presence:status');
      const presenceList: {
        userId: string;
        status: string;
        autoStatus: string;
      }[] = [];
      for (const [uid, presenceJson] of Object.entries(allPresence)) {
        try {
          const presence = JSON.parse(presenceJson);
          presenceList.push({
            userId: uid,
            status: presence.status || 'offline',
            autoStatus: presence.autoStatus || 'online',
          });
        } catch {
          // Ignore invalid presence payloads from Redis.
        }
      }
      // Full sync with rich status strings
      socket.emit('user.presence.full.sync', { users: presenceList });
      // Legacy backward-compat sync
      socket.emit('user.presence.sync', {
        onlineUserIds: presenceList
          .filter(
            (p) =>
              p.status === 'online' ||
              p.status === 'away' ||
              p.status === 'dnd',
          )
          .map((p) => p.userId),
      });

      // Fetch ALL voice state data and send to the newly connected client
      const allVoiceRaw = await redisClient.hgetall('voice_states');
      const voiceStatesList: any[] = [];
      for (const [uid, vStateJson] of Object.entries(allVoiceRaw)) {
        try {
          const vState = JSON.parse(vStateJson);
          voiceStatesList.push({
            userId: uid,
            groupId: vState.groupId,
            channelId: vState.channelId,
            isMuted: vState.isMuted,
            isDeafened: vState.isDeafened,
          });
        } catch {
          // ignore
        }
      }
      socket.emit('voice.presence.sync', { voiceStates: voiceStatesList });
    } catch (error) {
      this.logger.error(`❌ Socket authentication error`, error);
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      const userRoom = `user:${userId}`;
      this.logger.log(
        `✔ Socket disconnected: User ${userId} left room ${userRoom}`,
      );

      // Update presence status to away on disconnect (not fully offline - could be a tab refresh)
      const redisClient = this.redisService.getClient();
      await redisClient.hset(
        'presence:status',
        userId,
        JSON.stringify({
          userId,
          status: 'away',
          autoStatus: 'away',
          lastSeen: new Date().toISOString(),
        }),
      );

      // Broadcast status change
      this.server.emit('user.status.changed', {
        userId,
        status: 'away',
        autoStatus: 'away',
      });
      // Legacy backward-compat event
      this.server.emit('user.offline', { userId });

      // Check if user was in a voice channel
      const voiceRaw = await redisClient.hget('voice_states', userId);
      if (voiceRaw) {
        try {
          const voiceState = JSON.parse(voiceRaw);
          await redisClient.hdel('voice_states', userId);
          // Broadcast that user left voice channel
          this.server.emit('voice.state.changed', {
            userId,
            groupId: voiceState.groupId,
            channelId: null,
            isMuted: false,
            isDeafened: false,
          });
        } catch (err) {
          this.logger.error(
            `Failed to handle voice state cleanup on disconnect for user ${userId}`,
            err,
          );
        }
      }
    }
  }

  @SubscribeMessage('join.conversation')
  @UseGuards(RateLimitGuard)
  async handleJoinConversation(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    this.logger.log(
      `📥 Received join.conversation for: ${JSON.stringify(conversationId)} (type: ${typeof conversationId}) from user ${userId}`,
    );

    // If conversationId is passed as an object, extract string
    const targetConvoId =
      typeof conversationId === 'object' && conversationId !== null
        ? (conversationId as any).conversationId
        : conversationId;

    const conversation = await this.chatService.getConversation(targetConvoId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.groupId) {
      const hasAccess = await this.groupsService.canUserAccessChannel(
        conversation.groupId,
        targetConvoId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          '❌ You do not have permission to access this channel.',
        );
      }
    }

    const roomName = `conv:${targetConvoId}`;

    // Self-healing: Leave all other conversation rooms safely (copying array to avoid mutation during iteration)
    const currentRooms = Array.from(socket.rooms);
    for (const room of currentRooms) {
      if (room.startsWith('conv:') && room !== roomName) {
        await socket.leave(room);
        this.logger.log(`🧹 Auto-left stale room ${room} for user ${userId}`);
      }
    }

    await socket.join(roomName);
    this.logger.log(
      `✔ User ${userId} joined room ${roomName}. Active rooms: ${Array.from(socket.rooms).join(', ')}`,
    );

    // Check if the user is away (manual or autoStatus) before marking messages as read
    const redisClient = this.redisService.getClient();
    let isUserAway = false;
    try {
      const presenceRaw = await redisClient.hget('presence:status', userId);
      if (presenceRaw) {
        const presence = JSON.parse(presenceRaw);
        isUserAway =
          presence.status === 'away' ||
          presence.autoStatus === 'away' ||
          presence.status === 'offline';
      }
    } catch (err) {
      this.logger.error(
        `Error checking presence for user ${userId} in join.conversation`,
        err,
      );
    }

    if (!isUserAway) {
      // Mark messages in this conversation as read for this user
      await this.chatService.markMessagesAsRead(targetConvoId, userId);

      const readerUser = await this.usersService.findById(userId, true);
      const readerName = readerUser.username
        ? `@${readerUser.username}`
        : `@${readerUser.email.split('@')[0]}`;

      // Notify others in the room that messages are read
      this.server.to(roomName).emit('messages.read', {
        conversationId: targetConvoId,
        readBy: userId,
        readByName: readerName,
      });
    } else {
      this.logger.log(
        `Skipping marking messages as read for user ${userId} because user is away (join.conversation)`,
      );
    }
  }

  @SubscribeMessage('leave.conversation')
  async handleLeaveConversation(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    this.logger.log(
      `📥 Received leave.conversation for: ${JSON.stringify(conversationId)} (type: ${typeof conversationId}) from user ${userId}`,
    );

    // If conversationId is passed as an object, extract string
    const targetConvoId =
      typeof conversationId === 'object' && conversationId !== null
        ? (conversationId as any).conversationId
        : conversationId;

    const roomName = `conv:${targetConvoId}`;

    await socket.leave(roomName);
    this.logger.log(
      `✔ User ${userId} left room ${roomName}. Active rooms: ${Array.from(socket.rooms).join(', ')}`,
    );
  }

  @SubscribeMessage('messages.read')
  @UseGuards(RateLimitGuard)
  async handleMarkMessagesAsRead(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;

    const targetConvoId =
      typeof conversationId === 'object' && conversationId !== null
        ? (conversationId as any).conversationId
        : conversationId;

    if (!targetConvoId) {
      return;
    }

    this.logger.log(
      `📥 Received messages.read for: ${targetConvoId} from user ${userId}`,
    );

    await this.chatService.markMessagesAsRead(targetConvoId, userId);

    const readerUser = await this.usersService.findById(userId, true);
    const readerName = readerUser.username
      ? `@${readerUser.username}`
      : `@${readerUser.email.split('@')[0]}`;

    // Notify others in the room that messages are read
    const roomName = `conv:${targetConvoId}`;
    this.server.to(roomName).emit('messages.read', {
      conversationId: targetConvoId,
      readBy: userId,
      readByName: readerName,
    });
  }

  @SubscribeMessage('send.message')
  @UseGuards(RateLimitGuard)
  async handleSendMessage(
    @MessageBody()
    body: {
      conversationId: string;
      content: string;
      media?: {
        name: string;
        thumbnailName?: string;
        url: string;
        thumbnailUrl?: string;
        type: string;
        size: number;
      }[];
    },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const { conversationId, content, media } = body;
    this.logger.log(
      `📥 Received send.message for: ${conversationId} from user ${userId}`,
    );

    const mediaItems = media || null;

    const conversation = await this.chatService.getConversation(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.groupId) {
      const hasAccess = await this.groupsService.canUserAccessChannel(
        conversation.groupId,
        conversationId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          '❌ You do not have permission to access this channel.',
        );
      }

      const canSend = await this.groupsService.hasPermission(
        conversation.groupId,
        userId,
        'send_messages',
      );
      if (!canSend) {
        throw new ForbiddenException(
          '❌ You do not have permission to send messages in this group.',
        );
      }

      if (media && media.length > 0) {
        const canAttach = await this.groupsService.hasPermission(
          conversation.groupId,
          userId,
          'attach_files',
        );
        if (!canAttach) {
          throw new ForbiddenException(
            '❌ You do not have permission to attach files in this group.',
          );
        }
      }
    }

    const members =
      await this.chatService.getConversationMembers(conversationId);

    if (conversation.type === ConversationType.DM) {
      const recipient = members.find((m) => m.userId !== userId);
      if (recipient) {
        const isFriend = await this.usersService.isFriend(
          userId,
          recipient.userId,
        );
        if (!isFriend) {
          throw new ForbiddenException(
            '❌ You can only send DM messages to accepted friends.',
          );
        }
      }
    }

    // Check active users in the conversation room to see if the recipient has it open
    const roomName = `conv:${conversationId}`;
    const activeRoomSockets = await this.server.in(roomName).fetchSockets();
    const activeUserIdsInRoom = activeRoomSockets.map((s) => s.data.userId);
    this.logger.log(
      `✉ send.message in room ${roomName}. Sockets in room: ${activeUserIdsInRoom.join(', ')}`,
    );

    // Mark as read if a recipient is in the room and is NOT away/offline
    const redisClient = this.redisService.getClient();
    const activeRecipientsInRoom = members.filter(
      (m) => m.userId !== userId && activeUserIdsInRoom.includes(m.userId),
    );

    let readReceiptUserIds: string[] = [];
    let isRead = false;
    if (activeRecipientsInRoom.length > 0) {
      const presenceChecks = await Promise.all(
        activeRecipientsInRoom.map(async (m) => {
          try {
            const presenceRaw = await redisClient.hget(
              'presence:status',
              m.userId,
            );
            if (presenceRaw) {
              const presence = JSON.parse(presenceRaw);
              const isAway =
                presence.status === 'away' ||
                presence.autoStatus === 'away' ||
                presence.status === 'offline';
              return { userId: m.userId, isActive: !isAway };
            }
            return { userId: m.userId, isActive: true }; // default to active if no presence info in Redis
          } catch {
            return { userId: m.userId, isActive: true }; // fallback
          }
        }),
      );
      readReceiptUserIds = presenceChecks
        .filter((check) => check.isActive)
        .map((check) => check.userId);
      isRead = readReceiptUserIds.length > 0;
    }

    // Save message in PostgreSQL system of record
    const message = await this.chatService.createMessage(
      conversationId,
      userId,
      content,
      isRead,
      mediaItems,
      readReceiptUserIds,
    );
    for (const member of members) {
      const memberRoom = `user:${member.userId}`;
      this.server.to(memberRoom).emit('message.new', message);
    }
    this.logger.log(
      `✔ Broadcasted new message in conversation ${conversationId} to ${members.length} members from ${userId}. isRead: ${isRead}`,
    );

    // For each active reader, emit messages.read to the SENDER so their Redux
    // state immediately reflects the read receipt on the newly sent message.
    if (readReceiptUserIds.length > 0) {
      for (const readerId of readReceiptUserIds) {
        try {
          const readerUser = await this.usersService.findById(readerId, true);
          const readerName = readerUser.username
            ? `@${readerUser.username}`
            : `@${readerUser.email.split('@')[0]}`;
          this.server.to(`user:${userId}`).emit('messages.read', {
            conversationId,
            readBy: readerId,
            readByName: readerName,
          });
        } catch (err) {
          this.logger.error(
            `Failed to emit messages.read for reader ${readerId} on new message`,
            err,
          );
        }
      }
    }

    // Dispatch push notifications to other conversation members based on their preferences
    const otherMemberIds = members
      .map((m) => m.userId)
      .filter((uid) => uid !== userId);

    if (otherMemberIds.length > 0) {
      const conversation =
        await this.chatService.getConversation(conversationId);
      const isDm = conversation
        ? conversation.type === ConversationType.DM
        : true;

      const recipientsToNotify: string[] = [];
      for (const memberId of otherMemberIds) {
        try {
          const targetUser = await this.usersService.findById(memberId);
          if (targetUser.notificationsEnabled !== false) {
            if (isDm && targetUser.notificationsDmEnabled !== false) {
              recipientsToNotify.push(memberId);
            } else if (
              !isDm &&
              targetUser.notificationsGroupEnabled !== false
            ) {
              recipientsToNotify.push(memberId);
            }
          }
        } catch (err) {
          this.logger.error(
            `Failed to fetch user ${memberId} profile for notifications`,
            err,
          );
        }
      }

      if (recipientsToNotify.length > 0) {
        // Fetch sender displayName from database
        let senderDisplayName = 'Someone';
        try {
          const sender = await this.usersService.findById(userId);
          senderDisplayName = sender.displayName || sender.email.split('@')[0];
        } catch {
          senderDisplayName = socket.data.email
            ? socket.data.email.split('@')[0]
            : 'Someone';
        }

        let pushTitle = '';
        const isDmFlag = isDm ? 'true' : 'false';
        const channelName =
          !isDm && conversation ? conversation.name || 'general' : '';
        let groupName = '';
        let groupId = '';

        if (isDm) {
          pushTitle = senderDisplayName;
        } else {
          if (conversation.groupId) {
            groupId = conversation.groupId;
            try {
              const group = await this.groupsService.getGroup(
                conversation.groupId,
              );
              if (group) {
                groupName = group.name;
              }
            } catch {
              groupName = 'Group';
            }
          }
          pushTitle = `${senderDisplayName} at ${channelName}, ${groupName || 'Group'}`;
        }

        // Structured metadata payload — FE reads this to identify active threads
        const metadataPayload = {
          message: content,
          conversationId,
          messageId: message.id,
          senderId: userId,
          senderName: senderDisplayName,
          isDm: isDmFlag,
          groupId,
          groupName,
          channelName,
        };

        this.notificationsQueue
          .add('send-push', {
            title: pushTitle,
            body:
              content ||
              (mediaItems && mediaItems.length > 0
                ? mediaItems[0].type?.startsWith('image/')
                  ? '📷 Photo'
                  : mediaItems[0].type?.startsWith('video/')
                    ? '🎥 Video'
                    : '📁 Attachment'
                : '📁 Attachment'),
            recipients: recipientsToNotify,
            metadata: metadataPayload,
          })
          .catch((err) =>
            this.logger.error('Failed to queue message notification job', err),
          );
      }
    }
  }

  @SubscribeMessage('typing.started')
  handleTypingStarted(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() socket: Socket,
  ): void {
    const userId = socket.data.userId as string;
    const roomName = `conv:${conversationId}`;
    socket.to(roomName).emit('typing.started', { conversationId, userId });
  }

  @SubscribeMessage('typing.stopped')
  handleTypingStopped(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() socket: Socket,
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
  @UseGuards(RateLimitGuard)
  async handleUserStatusUpdate(
    @MessageBody() payload: { status: string; autoStatus?: string },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const allowedStatuses = ['online', 'away', 'dnd', 'offline'];
    const safeStatus = allowedStatuses.includes(payload?.status)
      ? payload.status
      : 'online';
    const safeAutoStatus = payload?.autoStatus === 'away' ? 'away' : 'online';

    this.logger.log(
      `🟡 User ${userId} set status to '${safeStatus}' (autoStatus: '${safeAutoStatus}')`,
    );

    // Persist in Redis
    const redisClient = this.redisService.getClient();
    await redisClient.hset(
      'presence:status',
      userId,
      JSON.stringify({
        userId,
        status: safeStatus,
        autoStatus: safeAutoStatus,
        lastSeen: new Date().toISOString(),
      }),
    );

    // Broadcast status change to all connected clients
    this.server.emit('user.status.changed', {
      userId,
      status: safeStatus,
      autoStatus: safeAutoStatus,
    });

    // Acknowledge back to the requesting socket
    socket.emit('user.status.ack', {
      status: safeStatus,
      autoStatus: safeAutoStatus,
    });

    // If the user returned to online/active, mark current conversation messages as read
    if (safeStatus === 'online' && safeAutoStatus === 'online') {
      const currentRooms = Array.from(socket.rooms);
      const activeConvoRoom = currentRooms.find((r) => r.startsWith('conv:'));
      if (activeConvoRoom) {
        const activeConvoId = activeConvoRoom.split(':')[1];
        this.logger.log(
          `🔄 User ${userId} returned online/active in room ${activeConvoRoom}. Marking messages as read.`,
        );
        try {
          await this.chatService.markMessagesAsRead(activeConvoId, userId);

          const readerUser = await this.usersService.findById(userId, true);
          const readerName = readerUser.username
            ? `@${readerUser.username}`
            : `@${readerUser.email.split('@')[0]}`;

          this.server.to(activeConvoRoom).emit('messages.read', {
            conversationId: activeConvoId,
            readBy: userId,
            readByName: readerName,
          });
        } catch (err) {
          this.logger.error(
            `Failed to mark messages as read on status return for user ${userId}`,
            err,
          );
        }
      }
    }
  }

  @SubscribeMessage('delete.message')
  async handleDeleteMessage(
    @MessageBody() body: { messageId: string; conversationId: string },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const { messageId, conversationId } = body;

    const message = await this.chatService.getMessage(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException("You cannot delete someone else's message");
    }
    if (message.conversationId !== conversationId) {
      throw new BadRequestException(
        'Message does not belong to this conversation',
      );
    }

    await this.chatService.deleteMessage(messageId);

    // Broadcast to all conversation members
    const members =
      await this.chatService.getConversationMembers(conversationId);
    for (const member of members) {
      const memberRoom = `user:${member.userId}`;
      this.server
        .to(memberRoom)
        .emit('message.deleted', { messageId, conversationId });
    }
    this.logger.log(
      `✔ Broadcasted deleted message ${messageId} in conversation ${conversationId} to ${members.length} members`,
    );
  }

  @SubscribeMessage('edit.message')
  async handleEditMessage(
    @MessageBody()
    body: { messageId: string; conversationId: string; content: string },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const { messageId, conversationId, content } = body;

    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }

    const message = await this.chatService.getMessage(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException("You cannot edit someone else's message");
    }
    if (message.conversationId !== conversationId) {
      throw new BadRequestException(
        'Message does not belong to this conversation',
      );
    }

    const updatedMessage = await this.chatService.updateMessage(
      messageId,
      userId,
      content.trim(),
    );

    // Broadcast to all conversation members
    const members =
      await this.chatService.getConversationMembers(conversationId);
    for (const member of members) {
      const memberRoom = `user:${member.userId}`;
      this.server.to(memberRoom).emit('message.updated', updatedMessage);
    }
    this.logger.log(
      `✔ Broadcasted updated message ${messageId} in conversation ${conversationId} to ${members.length} members`,
    );
  }

  @SubscribeMessage('voice.join')
  async handleVoiceJoin(
    @MessageBody() payload: { groupId: string; channelId: string },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const { groupId, channelId } = payload;
    this.logger.log(
      `🎙 User ${userId} joining voice channel ${channelId} in group ${groupId}`,
    );

    const redisClient = this.redisService.getClient();
    const voiceState = {
      groupId,
      channelId,
      isMuted: false,
      isDeafened: false,
    };
    await redisClient.hset('voice_states', userId, JSON.stringify(voiceState));

    this.server.emit('voice.state.changed', {
      userId,
      groupId,
      channelId,
      isMuted: false,
      isDeafened: false,
    });
  }

  @SubscribeMessage('voice.leave')
  async handleVoiceLeave(@ConnectedSocket() socket: Socket): Promise<void> {
    const userId = socket.data.userId as string;
    this.logger.log(`🎙 User ${userId} leaving voice channel`);

    const redisClient = this.redisService.getClient();
    const voiceRaw = await redisClient.hget('voice_states', userId);
    if (voiceRaw) {
      try {
        const voiceState = JSON.parse(voiceRaw);
        await redisClient.hdel('voice_states', userId);

        this.server.emit('voice.state.changed', {
          userId,
          groupId: voiceState.groupId,
          channelId: null,
          isMuted: false,
          isDeafened: false,
        });
      } catch (err) {
        this.logger.error(`Error on voice.leave for user ${userId}`, err);
      }
    }
  }

  @SubscribeMessage('voice.state.update')
  async handleVoiceStateUpdate(
    @MessageBody() payload: { isMuted: boolean; isDeafened: boolean },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const { isMuted, isDeafened } = payload;

    const redisClient = this.redisService.getClient();
    const voiceRaw = await redisClient.hget('voice_states', userId);
    if (voiceRaw) {
      try {
        const voiceState = JSON.parse(voiceRaw);
        voiceState.isMuted = isMuted;
        voiceState.isDeafened = isDeafened;

        await redisClient.hset(
          'voice_states',
          userId,
          JSON.stringify(voiceState),
        );

        this.server.emit('voice.state.changed', {
          userId,
          groupId: voiceState.groupId,
          channelId: voiceState.channelId,
          isMuted,
          isDeafened,
        });
      } catch (err) {
        this.logger.error(
          `Error on voice.state.update for user ${userId}`,
          err,
        );
      }
    }
  }

  @SubscribeMessage('voice.signal')
  async handleVoiceSignal(
    @MessageBody() payload: { targetUserId: string; signal: any },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const senderUserId = socket.data.userId as string;
    const { targetUserId, signal } = payload;
    this.server.to(`user:${targetUserId}`).emit('voice.signal', {
      senderUserId,
      signal,
    });
  }
}
