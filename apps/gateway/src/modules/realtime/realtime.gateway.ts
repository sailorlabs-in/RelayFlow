import { ConversationType, GroupMemberRole } from '@chat-app/database';
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
import { UsersService } from '../users/users.service';
import { GroupsService } from '../groups/groups.service';

function isUserMentioned(content: string, user: any): boolean {
  if (!content) {
    return false;
  }
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('@everyone')) {
    return true;
  }

  if (
    user.username &&
    lowerContent.includes(`@${user.username.toLowerCase()}`)
  ) {
    return true;
  }

  if (
    user.displayName &&
    lowerContent.includes(`@${user.displayName.toLowerCase()}`)
  ) {
    return true;
  }

  const emailPrefix = user.email.split('@')[0].toLowerCase();
  if (lowerContent.includes(`@${emailPrefix}`)) {
    return true;
  }

  return false;
}

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
      const payload = await this.authService.validateTokenAndSession(
        token,
        undefined,
        socket.handshake.headers['user-agent'] as string,
        socket.handshake.address,
      );

      // Bind connection identity
      socket.data.userId = payload.userId;
      socket.data.email = payload.email;
      socket.data.deviceId = payload.deviceId;

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
        lastSeen: new Date().toISOString(),
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
        lastSeen?: string;
      }[] = [];
      for (const [uid, presenceJson] of Object.entries(allPresence)) {
        try {
          const presence = JSON.parse(presenceJson);
          presenceList.push({
            userId: uid,
            status: presence.status || 'offline',
            autoStatus: presence.autoStatus || 'online',
            lastSeen: presence.lastSeen || undefined,
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

  async disconnectDevice(userId: string, deviceId: string): Promise<void> {
    try {
      const sockets = await this.server.in(`user:${userId}`).fetchSockets();
      for (const socket of sockets) {
        if (socket.data.deviceId === deviceId) {
          this.logger.log(
            `🔌 Disconnecting revoked session for user ${userId} on device ${deviceId}`,
          );
          socket.disconnect(true);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to disconnect sockets for user ${userId} device ${deviceId}`,
        error,
      );
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      const userRoom = `user:${userId}`;
      this.logger.log(
        `✔ Socket disconnected: User ${userId} left room ${userRoom}`,
      );

      // Check if user still has other active connections open
      const sockets = await this.server.in(userRoom).fetchSockets();
      const activeSockets = sockets.filter((s) => s.id !== socket.id);
      if (activeSockets.length > 0) {
        this.logger.log(
          `🔄 User ${userId} disconnected a socket, but has ${activeSockets.length} active sockets remaining. Skipping presence/voice cleanup.`,
        );
        return;
      }

      const redisClient = this.redisService.getClient();

      // Clean up voice state immediately if no active connections remain
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

      // Update presence status to away immediately (if they reconnect, it will go back to online; if they don't, it will become offline after 10s)
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
        lastSeen: new Date().toISOString(),
      });
      // Legacy backward-compat event
      this.server.emit('user.offline', { userId });

      // Debounce checking if they reconnect within 10 seconds before marking fully offline
      setTimeout(async () => {
        try {
          const checkSockets = await this.server.in(userRoom).fetchSockets();
          const remainingSockets = checkSockets.filter(
            (s) => s.id !== socket.id,
          );
          if (remainingSockets.length === 0) {
            const redisCheck = this.redisService.getClient();
            const existingRaw = await redisCheck.hget(
              'presence:status',
              userId,
            );
            let currentStatus = 'offline';
            const currentAutoStatus = 'offline';

            if (existingRaw) {
              try {
                const existing = JSON.parse(existingRaw);
                // Keep manual status like 'dnd' if they set it
                if (existing.status === 'dnd') {
                  currentStatus = 'dnd';
                }
              } catch {
                //error
              }
            }

            const lastSeenTime = new Date().toISOString();

            await redisCheck.hset(
              'presence:status',
              userId,
              JSON.stringify({
                userId,
                status: currentStatus,
                autoStatus: currentAutoStatus,
                lastSeen: lastSeenTime,
              }),
            );

            this.server.emit('user.status.changed', {
              userId,
              status: currentStatus,
              autoStatus: currentAutoStatus,
              lastSeen: lastSeenTime,
            });
            this.server.emit('user.offline', { userId });

            this.logger.log(
              `🔄 User ${userId} did not reconnect within 10s. Marked ${currentStatus}.`,
            );
          } else {
            this.logger.log(
              `🔄 User ${userId} reconnected within 10s (${remainingSockets.length} sockets active). Keeping status online.`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error in handleDisconnect delayed offline check for user ${userId}`,
            error,
          );
        }
      }, 10000); // 10 seconds delay
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
      parentId?: string;
      media?: {
        name: string;
        thumbnailName?: string;
        url: string;
        thumbnailUrl?: string;
        type: string;
        size: number;
      }[];
      isMarkdown?: boolean;
    },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const { conversationId, content, media, parentId, isMarkdown } = body;
    this.logger.log(
      `📥 Received send.message for: ${conversationId} from user ${userId} (parentId: ${parentId})`,
    );

    const mediaItems = media || undefined;

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

      const canWriteChannel = await this.groupsService.canUserWriteToChannel(
        conversation.groupId,
        conversationId,
        userId,
      );
      if (!canWriteChannel) {
        throw new ForbiddenException(
          '❌ You do not have permission to send messages in this channel.',
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
      parentId,
      isMarkdown,
    );
    for (const member of members) {
      if (conversation && conversation.groupId) {
        const hasAccess = await this.groupsService.canUserAccessChannel(
          conversation.groupId,
          conversationId,
          member.userId,
        );
        if (!hasAccess) {
          continue;
        }
      }
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
      // Track whether each recipient was notified due to a direct @mention
      // so the frontend can surface the notification even if the channel is active
      let notificationIsMention = false;
      for (const memberId of otherMemberIds) {
        try {
          const targetUser = await this.usersService.findById(memberId);
          if (targetUser.notificationsEnabled === false) {
            continue;
          }

          let shouldNotify = false;
          let wasMentioned = false;
          if (isDm) {
            if (targetUser.notificationsDmEnabled !== false) {
              shouldNotify = true;
            }
          } else if (conversation && conversation.groupId) {
            // 1. Channel read access check
            const hasAccess = await this.groupsService.canUserAccessChannel(
              conversation.groupId,
              conversation.id,
              memberId,
            );
            if (!hasAccess) {
              continue;
            }

            // 2. Channel notification preference permission
            const channelSetting = conversation.notificationSetting || 'all';
            if (channelSetting === 'none') {
              continue;
            }

            // 3. Group notification setting check
            const groupMember = await this.groupsService.getGroupMember(
              conversation.groupId,
              memberId,
            );
            const groupPref = groupMember?.notificationPref || 'all';
            if (groupPref === 'none') {
              continue;
            }

            // 4. User overall group notification enablement check
            if (targetUser.notificationsGroupEnabled === false) {
              continue;
            }

            // 5. User overall group notification preference check
            const userPref = targetUser.groupNotificationPref || 'all';
            if (userPref === 'none') {
              continue;
            }

            // Decide notification based on preferences
            const isMentionOnly =
              channelSetting === 'mention' ||
              groupPref === 'mention' ||
              userPref === 'mention';
            if (isMentionOnly) {
              if (isUserMentioned(content, targetUser)) {
                shouldNotify = true;
                wasMentioned = true;
              }
            } else {
              // Still flag if the content happens to mention them even in 'all' mode
              wasMentioned = isUserMentioned(content, targetUser);
              shouldNotify = true;
            }
          }

          if (shouldNotify) {
            if (wasMentioned) {
              notificationIsMention = true;
            }
            let devices: any[] = [];
            if (targetUser.loggedInDevices) {
              try {
                devices = JSON.parse(targetUser.loggedInDevices);
              } catch {
                devices = [];
              }
            }

            if (Array.isArray(devices) && devices.length > 0) {
              const activeDevices = devices.filter(
                (d: any) => d.notificationsEnabled !== false,
              );
              for (const d of activeDevices) {
                recipientsToNotify.push(`${targetUser.id}:${d.deviceId}`);
              }
            } else {
              // Fallback for backward compatibility
              recipientsToNotify.push(targetUser.id);
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
          if (conversation?.groupId) {
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

        // Structured metadata payload — FE reads this to identify active threads.
        // isMention=true tells the frontend to bypass active-channel suppression
        // so the user always sees an @mention notification even if they are
        // currently viewing the channel.
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
          isMention: notificationIsMention,
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

    const redisClient = this.redisService.getClient();
    const lastSeenTime = new Date().toISOString();
    await redisClient.hset(
      'presence:status',
      userId,
      JSON.stringify({
        userId,
        status: safeStatus,
        autoStatus: safeAutoStatus,
        lastSeen: lastSeenTime,
      }),
    );

    // Broadcast status change to all connected clients
    this.server.emit('user.status.changed', {
      userId,
      status: safeStatus,
      autoStatus: safeAutoStatus,
      lastSeen: lastSeenTime,
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
      const convo = await this.chatService.getConversation(conversationId);
      if (convo && convo.groupId) {
        const canDeleteOthers = await this.groupsService.hasPermission(
          convo.groupId,
          userId,
          'delete_other_messages',
        );
        if (!canDeleteOthers) {
          throw new ForbiddenException(
            "You do not have permission to delete someone else's message",
          );
        }
      } else {
        throw new ForbiddenException(
          "You cannot delete someone else's message",
        );
      }
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

  @SubscribeMessage('toggle.reaction')
  async handleToggleReaction(
    @MessageBody()
    body: { messageId: string; conversationId: string; emoji: string },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const { messageId, conversationId, emoji } = body;

    if (!emoji) {
      throw new BadRequestException('Emoji cannot be empty');
    }

    const message = await this.chatService.getMessage(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.conversationId !== conversationId) {
      throw new BadRequestException(
        'Message does not belong to this conversation',
      );
    }

    const updatedMessage = await this.chatService.toggleMessageReaction(
      messageId,
      userId,
      emoji,
    );

    // Broadcast to all conversation members
    const members =
      await this.chatService.getConversationMembers(conversationId);
    for (const member of members) {
      const memberRoom = `user:${member.userId}`;
      this.server.to(memberRoom).emit('message.updated', updatedMessage);
    }
    this.logger.log(
      `✔ Broadcasted updated reactions on message ${messageId} in conversation ${conversationId} to ${members.length} members`,
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

    // Check if voice channel was empty BEFORE user joins
    const allVoiceRaw = await redisClient.hgetall('voice_states');
    let isChannelEmpty = true;
    for (const [uid, vStateJson] of Object.entries(allVoiceRaw)) {
      if (uid === userId) {
        continue;
      }
      try {
        const vState = JSON.parse(vStateJson);
        if (vState.channelId === channelId) {
          isChannelEmpty = false;
          break;
        }
      } catch (err) {
        // Ignore json parse error
      }
    }

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

    // If channel was empty, notify all other accessible group members
    if (isChannelEmpty) {
      try {
        const conversation = await this.chatService.getConversation(channelId);
        const group = await this.groupsService.getGroup(groupId);
        if (conversation && group) {
          const channelName = conversation.name || 'voice';
          const groupName = group.name;

          let joinerName = 'Someone';
          try {
            const joiner = await this.usersService.findById(userId);
            joinerName = joiner.displayName || joiner.email.split('@')[0];
          } catch {
            joinerName = socket.data.email
              ? socket.data.email.split('@')[0]
              : 'Someone';
          }

          const members = await this.groupsService.getGroupMembers(groupId);
          const recipientsToNotify: string[] = [];

          for (const member of members) {
            if (member.userId === userId) {
              continue;
            }

            try {
              // Check channel access
              const hasAccess = await this.groupsService.canUserAccessChannel(
                groupId,
                channelId,
                member.userId,
              );
              if (!hasAccess) {
                continue;
              }

              // Check notification preference - empty voice channel join is not a mention/ping,
              // so notify only if they have set it to 'all' notifications.
              const targetUser = await this.usersService.findById(
                member.userId,
              );
              if (targetUser.notificationsGroupEnabled === false) {
                continue;
              }
              if (targetUser.groupNotificationPref !== 'all') {
                continue;
              }
              if (member.notificationPref !== 'all') {
                continue;
              }

              let devices: any[] = [];
              if (targetUser.loggedInDevices) {
                try {
                  devices = JSON.parse(targetUser.loggedInDevices);
                } catch {
                  devices = [];
                }
              }

              if (Array.isArray(devices) && devices.length > 0) {
                const activeDevices = devices.filter(
                  (d: any) => d.notificationsEnabled !== false,
                );
                for (const d of activeDevices) {
                  recipientsToNotify.push(`${targetUser.id}:${d.deviceId}`);
                }
              } else {
                recipientsToNotify.push(targetUser.id);
              }
            } catch (err) {
              this.logger.error(
                `Failed to check notification status for member ${member.userId}`,
                err,
              );
            }
          }

          if (recipientsToNotify.length > 0) {
            const pushTitle = `🎙 Voice Channel Active`;
            const pushBody = `${joinerName} joined #${channelName} in ${groupName}. Join them!`;
            const metadataPayload = {
              conversationId: channelId,
              groupId,
              groupName,
              channelName,
              type: 'voice_active',
            };

            await this.sendPushNotificationHelper(
              recipientsToNotify,
              pushTitle,
              pushBody,
              metadataPayload,
            );
          }
        }
      } catch (err) {
        this.logger.error(
          'Failed to trigger voice channel active notification',
          err,
        );
      }
    }
  }

  @SubscribeMessage('voice.ping.nonjoined')
  async handleVoicePingNonJoined(
    @MessageBody() payload: { groupId: string; channelId: string },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const userId = socket.data.userId as string;
    const { groupId, channelId } = payload;
    this.logger.log(
      `🎙 User ${userId} pinging all non-joined users in voice channel ${channelId} in group ${groupId}`,
    );

    // 1. Get current voice states in Redis to find who is joined
    const redisClient = this.redisService.getClient();
    const allVoiceRaw = await redisClient.hgetall('voice_states');
    const joinedUserIds = new Set<string>();
    for (const [uid, vStateJson] of Object.entries(allVoiceRaw)) {
      try {
        const vState = JSON.parse(vStateJson);
        if (vState.channelId === channelId) {
          joinedUserIds.add(uid);
        }
      } catch (err) {
        // Ignore json parse error
      }
    }

    // 2. Fetch all members of the group
    const members = await this.groupsService.getGroupMembers(groupId);
    const recipientsToNotify: string[] = [];

    // Fetch details of group and channel
    const conversation = await this.chatService.getConversation(channelId);
    if (!conversation) {
      return;
    }
    const group = await this.groupsService.getGroup(groupId);
    if (!group) {
      return;
    }

    const groupName = group.name;
    const channelName = conversation.name || 'voice';

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

    for (const member of members) {
      if (member.userId === userId || joinedUserIds.has(member.userId)) {
        continue;
      }

      try {
        // Check access
        const hasAccess = await this.groupsService.canUserAccessChannel(
          groupId,
          channelId,
          member.userId,
        );
        if (!hasAccess) {
          continue;
        }

        // Check settings
        const targetUser = await this.usersService.findById(member.userId);
        if (targetUser.notificationsGroupEnabled === false) {
          continue;
        }
        if (targetUser.groupNotificationPref === 'none') {
          continue;
        }
        if (member.notificationPref === 'none') {
          continue;
        }

        // Add recipients
        let devices: any[] = [];
        if (targetUser.loggedInDevices) {
          try {
            devices = JSON.parse(targetUser.loggedInDevices);
          } catch {
            devices = [];
          }
        }

        if (Array.isArray(devices) && devices.length > 0) {
          const activeDevices = devices.filter(
            (d: any) => d.notificationsEnabled !== false,
          );
          for (const d of activeDevices) {
            recipientsToNotify.push(`${targetUser.id}:${d.deviceId}`);
          }
        } else {
          recipientsToNotify.push(targetUser.id);
        }
      } catch (err) {
        this.logger.error(
          `Failed to process user ${member.userId} for voice ping notification`,
          err,
        );
      }
    }

    if (recipientsToNotify.length > 0) {
      const pushTitle = `🎙 Voice Channel Ping`;
      const pushBody = `${senderDisplayName} is pinging you to join #${channelName} in ${groupName}`;
      const metadataPayload = {
        conversationId: channelId,
        groupId,
        groupName,
        channelName,
        type: 'voice_ping',
      };

      await this.sendPushNotificationHelper(
        recipientsToNotify,
        pushTitle,
        pushBody,
        metadataPayload,
      );
    }
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

  @SubscribeMessage('voice.disconnect.user')
  async handleVoiceDisconnectUser(
    @MessageBody() payload: { groupId: string; targetUserId: string },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    // eslint-disable-next-line no-useless-catch
    try {
      const requesterId = socket.data.userId as string;
      const { groupId, targetUserId } = payload;
      this.logger.log(
        `🎙 User ${requesterId} requesting disconnect of user ${targetUserId} in group ${groupId}`,
      );

      if (targetUserId === requesterId) {
        throw new BadRequestException('You cannot force disconnect yourself.');
      }

      const group = await this.groupsService.getGroup(groupId);
      if (!group) {
        throw new NotFoundException('Group not found');
      }

      const members = await this.groupsService.getGroupMembers(groupId);
      const member = members.find((x) => x.userId === requesterId);
      if (!member) {
        throw new ForbiddenException('You are not a member of this group');
      }

      const targetMember = members.find((x) => x.userId === targetUserId);
      if (!targetMember) {
        throw new NotFoundException(
          'Target user is not a member of this group',
        );
      }

      const isOwner = group.ownerId === requesterId;
      const isAdmin = member.role === GroupMemberRole.ADMIN;
      const hasManageRoles = await this.groupsService.hasPermission(
        groupId,
        requesterId,
        'manage_roles',
      );
      const hasManageGroup = await this.groupsService.hasPermission(
        groupId,
        requesterId,
        'manage_group',
      );

      if (!isOwner && !isAdmin && !hasManageRoles && !hasManageGroup) {
        throw new ForbiddenException(
          '❌ You do not have permission to disconnect users from voice channels.',
        );
      }

      // Enforcement of priority/rank check
      // "smaller no priority can change the larger one but larger one cannot change smaller no and own"
      // So if requesterRank >= targetRank, the requester cannot disconnect the target (except if they are the owner)
      if (!isOwner) {
        const requesterRank =
          await this.groupsService.getMemberHighestManageRank(
            groupId,
            requesterId,
            member,
          );
        const targetRank = await this.groupsService.getMemberHighestManageRank(
          groupId,
          targetUserId,
          targetMember,
        );

        if (requesterRank >= targetRank) {
          throw new ForbiddenException(
            '❌ You cannot disconnect a member with equal or higher permissions than your own.',
          );
        }
      }

      const redisClient = this.redisService.getClient();
      const voiceRaw = await redisClient.hget('voice_states', targetUserId);
      if (voiceRaw) {
        try {
          const voiceState = JSON.parse(voiceRaw);
          await redisClient.hdel('voice_states', targetUserId);

          // Notify everyone that the user disconnected/left the voice channel
          this.server.emit('voice.state.changed', {
            userId: targetUserId,
            groupId: voiceState.groupId,
            channelId: null,
            isMuted: false,
            isDeafened: false,
          });

          // Specifically notify the disconnected user's socket so it updates its local state (leaves the WebRTC room, closes audio etc.)
          this.server
            .to(`user:${targetUserId}`)
            .emit('voice.force.disconnect', {
              groupId,
              channelId: voiceState.channelId,
            });

          this.logger.log(
            `🎙 User ${targetUserId} was disconnected by ${requesterId}`,
          );
        } catch (err: any) {
          this.logger.error(
            `Error on voice disconnect for user ${targetUserId}`,
            err,
          );
        }
      }
    } catch (globalErr: any) {
      throw globalErr;
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

  private async sendPushNotificationHelper(
    recipientsToNotify: string[],
    title: string,
    body: string,
    metadata: any,
  ) {
    if (recipientsToNotify.length === 0) {
      return;
    }
    this.notificationsQueue
      .add('send-push', {
        title,
        body,
        recipients: recipientsToNotify,
        metadata,
      })
      .catch((err) =>
        this.logger.error('Failed to queue voice notification job', err),
      );
  }
}
