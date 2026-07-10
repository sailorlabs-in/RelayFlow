import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  Inject,
  forwardRef,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueNames } from '@chat-app/queues';
import { User, Group, GroupMember, UpdateNote } from '@chat-app/database';
import { RedisService } from '@chat-app/redis';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { UsersService } from '../users/users.service';
import { GroupsService } from '../groups/groups.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('admin')
export class AdminController {
  // Platform service account email — hidden from admin panel
  private readonly PLATFORM_SERVICE_EMAIL = 'service@sailorlabs.in';

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
    @InjectRepository(UpdateNote)
    private readonly updateNoteRepo: Repository<UpdateNote>,
    private readonly usersService: UsersService,
    private readonly groupsService: GroupsService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtimeGateway: RealtimeGateway,
    @InjectQueue(QueueNames.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Bootstrap the first platform admin.
   * This endpoint is PUBLIC but self-seals once any admin exists.
   * Call: POST /admin/bootstrap  { "email": "you@example.com" }
   */
  @Post('bootstrap')
  async bootstrap(@Body('email') email: string) {
    if (!email || !email.trim()) {
      throw new BadRequestException('Email is required');
    }

    // Check whether any admin already exists
    const existingAdmin = await this.userRepo.findOne({
      where: { role: 'admin' },
    });
    if (existingAdmin) {
      throw new ForbiddenException(
        'Bootstrap is disabled: a platform admin already exists. Use the admin panel to manage roles.',
      );
    }

    const user = await this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException(`No user found with email: ${email}`);
    }

    user.role = 'admin';
    await this.userRepo.save(user);

    return {
      success: true,
      message: `User "${user.email}" has been promoted to platform admin. Please log in again (or refresh) to load the updated role.`,
      userId: user.id,
    };
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('users')
  async listUsers() {
    const users = await this.userRepo.find({
      select: [
        'id',
        'email',
        'username',
        'displayName',
        'avatarUrl',
        'role',
        'warnings',
        'status',
        'visibility',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
    });

    // Hide the platform service account from other admins
    const visibleUsers = users.filter(
      (u) => u.email !== this.PLATFORM_SERVICE_EMAIL,
    );

    // Merge real-time presence from Redis so the admin sees live status
    // instead of the stale DB value.
    try {
      const redis = this.redisService.getClient();
      const allPresence = await redis.hgetall('presence:status');
      if (allPresence && Object.keys(allPresence).length > 0) {
        return visibleUsers.map((u) => {
          const presenceJson = allPresence[u.id];
          if (presenceJson) {
            try {
              const presence = JSON.parse(presenceJson);
              return {
                ...u,
                status: presence.status || u.status,
                lastSeen: presence.lastSeen || null,
              };
            } catch {
              // ignore malformed presence, fall back to DB status
            }
          }
          // Not in Redis presence = offline
          return { ...u, status: 'offline', lastSeen: null };
        });
      }
    } catch {
      // Redis unavailable — return DB data as-is
    }

    return visibleUsers.map((u) => ({ ...u, lastSeen: null }));
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('users/:userId/warning')
  async warnUser(
    @Param('userId') userId: string,
    @Body('message') message: string,
  ) {
    if (!message || message.trim() === '') {
      throw new BadRequestException('Warning message is required');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const warnings = user.warnings || [];
    warnings.push(message.trim());
    user.warnings = warnings;
    const savedUser = await this.userRepo.save(user);

    // Notify warned user via WebSocket
    this.realtimeGateway.server.to(`user:${userId}`).emit('user.warned', {
      warnings: savedUser.warnings,
      latestWarning: message.trim(),
    });

    return {
      success: true,
      warnings: savedUser.warnings,
    };
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('users/:userId/role')
  async updateUserRole(
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    if (role !== 'user' && role !== 'admin') {
      throw new BadRequestException('Invalid role specified');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = role;
    const savedUser = await this.userRepo.save(user);

    // Immediately update the Redis user profile cache so PlatformAdminGuard
    // and any findById() call sees the new role without waiting for cache expiry.
    try {
      const redis = this.redisService.getClient();
      const cacheKey = `user:profile:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        const cachedUser = JSON.parse(cached);
        cachedUser.role = role;
        // Preserve the remaining TTL so we don't reset the 24 h window
        const ttl = await redis.ttl(cacheKey);
        await redis.setex(
          cacheKey,
          ttl > 0 ? ttl : 86400,
          JSON.stringify(cachedUser),
        );
      } else {
        // Cache the full updated user so future calls don't hit the DB
        await redis.setex(
          `user:profile:${userId}`,
          86400,
          JSON.stringify(savedUser),
        );
      }
    } catch {
      // Redis unavailable — DB is the source of truth, continue
    }

    // Notify updated user via WebSocket so their frontend updates instantly
    this.realtimeGateway.server.to(`user:${userId}`).emit('user.role.updated', {
      role: savedUser.role,
    });

    return {
      success: true,
      role: savedUser.role,
    };
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('groups')
  async listGroups() {
    const groups = await this.groupRepo.find({
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      groups.map(async (g) => {
        const memberCount = await this.groupMemberRepo.count({
          where: { groupId: g.id },
        });
        return {
          id: g.id,
          name: g.name,
          description: g.description,
          createdAt: g.createdAt,
          memberCount,
          owner: g.owner
            ? {
                id: g.owner.id,
                email: g.owner.email,
                username: g.owner.username,
                displayName: g.owner.displayName,
              }
            : null,
        };
      }),
    );
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('groups/:groupId/members')
  async addGroupMember(
    @Param('groupId') groupId: string,
    @Body('userId') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const addedMember = await this.groupsService.directAddMember(
      groupId,
      userId,
    );

    // Notify all group members (including the newly added user) via socket
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      const userGroup = await this.groupsService.getGroupForUser(
        groupId,
        member.userId,
      );
      if (userGroup) {
        this.realtimeGateway.server
          .to(`user:${member.userId}`)
          .emit('group.member.added', {
            groupId,
            group: userGroup,
          });
      }
    }

    return { success: true, member: addedMember };
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('users/:userId/reset')
  async resetUserDevice(@Param('userId') userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine target recipient devices
    const recipientsToNotify: string[] = [];
    if (user.loggedInDevices) {
      try {
        const devices = JSON.parse(user.loggedInDevices);
        if (Array.isArray(devices)) {
          for (const d of devices) {
            recipientsToNotify.push(`${user.id}:${d.deviceId}`);
          }
        }
      } catch {
        // ignore
      }
    }

    if (recipientsToNotify.length === 0) {
      // Fallback to userId if no device registered
      recipientsToNotify.push(user.id);
    }

    // Add job to notificationsQueue
    await this.notificationsQueue.add('send-push', {
      title: 'Silent Reset',
      body: 'silent',
      recipients: recipientsToNotify,
      silent: true,
      metadata: {
        action: 'clear-cache-reload',
      },
    });

    return {
      success: true,
      message: 'Silent hard reload command queued for user devices.',
    };
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('users/reset-all')
  async resetAllUsersDevices() {
    const users = await this.userRepo.find({
      select: ['id', 'loggedInDevices'],
    });

    const recipientsToNotify: string[] = [];
    for (const u of users) {
      let hasDevices = false;
      if (u.loggedInDevices) {
        try {
          const devices = JSON.parse(u.loggedInDevices);
          if (Array.isArray(devices) && devices.length > 0) {
            hasDevices = true;
            for (const d of devices) {
              recipientsToNotify.push(`${u.id}:${d.deviceId}`);
            }
          }
        } catch {
          // ignore
        }
      }

      if (!hasDevices) {
        recipientsToNotify.push(u.id);
      }
    }

    if (recipientsToNotify.length > 0) {
      await this.notificationsQueue.add('send-push', {
        title: 'Silent Reset All',
        body: 'silent',
        recipients: recipientsToNotify,
        silent: true,
        metadata: {
          action: 'clear-cache-reload',
        },
      });
    }

    return {
      success: true,
      message: `Silent hard reload command queued for all registered users' devices (${recipientsToNotify.length} targets).`,
    };
  }

  /**
   * Admin sends a friend request on behalf of themselves to another user.
   * This allows admins to connect with any platform user.
   */
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('users/:userId/send-friend-request')
  async adminSendFriendRequest(
    @Param('userId') targetUserId: string,
    @Request() req: any,
  ) {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      throw new ForbiddenException('Admin user context not found');
    }

    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }
    if (targetUserId === adminUserId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const friendship = await this.usersService.sendFriendRequest(
      adminUserId,
      targetUser.email,
    );

    // Notify target user via WebSocket
    if (friendship.status === 'accepted') {
      this.realtimeGateway.server
        .to(`user:${friendship.requesterId}`)
        .emit('friend.request.accepted', friendship);
      this.realtimeGateway.server
        .to(`user:${friendship.addresseeId}`)
        .emit('friend.request.accepted', friendship);
    } else {
      this.realtimeGateway.server
        .to(`user:${targetUserId}`)
        .emit('friend.request.received', friendship);
    }

    return { success: true, friendship };
  }

  /**
   * Admin updates a user's username and/or displayName.
   * The affected user receives a real-time notification with the reason.
   */
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch('users/:userId/identity')
  async adminUpdateUserIdentity(
    @Param('userId') targetUserId: string,
    @Body()
    body: {
      username?: string;
      displayName?: string;
      reason: string;
    },
  ) {
    if (!body.reason || body.reason.trim() === '') {
      throw new BadRequestException(
        'A reason is required when modifying user identity.',
      );
    }
    if (!body.username && !body.displayName) {
      throw new BadRequestException(
        'At least one of username or displayName must be provided.',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const changes: string[] = [];

    if (body.displayName !== undefined && body.displayName.trim() !== '') {
      user.displayName = body.displayName.trim();
      changes.push(`display name to "${user.displayName}"`);
    }

    if (body.username !== undefined && body.username.trim() !== '') {
      const trimmedUsername = body.username.toLowerCase().trim();
      // Check uniqueness
      const existing = await this.userRepo.findOne({
        where: { username: trimmedUsername },
      });
      if (existing && existing.id !== targetUserId) {
        throw new BadRequestException(
          `Username "${trimmedUsername}" is already taken by another user.`,
        );
      }
      user.username = trimmedUsername;
      changes.push(`username to "${user.username}"`);
    }

    const savedUser = await this.userRepo.save(user);

    // Invalidate cache
    try {
      const redis = this.redisService.getClient();
      await redis.del(`user:profile:${targetUserId}`);
    } catch {
      // ignore
    }

    // Build notification messages
    const reason = body.reason.trim();
    const notificationMessages: Array<{
      field: string;
      event: string;
      value: string;
    }> = [];

    if (body.displayName !== undefined && body.displayName.trim() !== '') {
      notificationMessages.push({
        field: 'display name',
        event: 'admin.identity.updated',
        value: savedUser.displayName ?? '',
      });
    }
    if (body.username !== undefined && body.username.trim() !== '') {
      notificationMessages.push({
        field: 'username',
        event: 'admin.identity.updated',
        value: savedUser.username ?? '',
      });
    }

    // Emit a single consolidated notification to the user
    this.realtimeGateway.server
      .to(`user:${targetUserId}`)
      .emit('admin.identity.updated', {
        userId: targetUserId,
        changes: notificationMessages.map((m) => ({
          field: m.field,
          value: m.value,
        })),
        reason,
        username: savedUser.username,
        displayName: savedUser.displayName,
      });

    // Also broadcast public profile update so all clients see the new name
    this.realtimeGateway.server.emit('user.profile.updated', {
      userId: targetUserId,
      ...(body.displayName !== undefined && {
        displayName: savedUser.displayName,
      }),
      ...(body.username !== undefined && { username: savedUser.username }),
    });

    // Queue push notification via vibe-message
    try {
      if (savedUser.notificationsEnabled !== false) {
        let devices: any[] = [];
        if (savedUser.loggedInDevices) {
          try {
            devices = JSON.parse(savedUser.loggedInDevices);
          } catch {
            devices = [];
          }
        }

        const recipientsToNotify: string[] = [];
        if (Array.isArray(devices) && devices.length > 0) {
          const activeDevices = devices.filter(
            (d: any) => d.notificationsEnabled !== false,
          );
          for (const d of activeDevices) {
            recipientsToNotify.push(`${savedUser.id}:${d.deviceId}`);
          }
        } else {
          recipientsToNotify.push(savedUser.id);
        }

        if (recipientsToNotify.length > 0) {
          const fieldDesc = changes.join(' and ');
          await this.notificationsQueue.add('send-push', {
            title: 'Account Identity Updated',
            body: `Relay Guardian AI changed your ${fieldDesc} due to: ${reason}`,
            recipients: recipientsToNotify,
            metadata: {
              type: 'admin_identity_update',
              userId: targetUserId,
              reason,
            },
          });
        }
      }
    } catch (err) {
      console.error(
        'Failed to queue admin identity update push notification',
        err,
      );
    }

    return {
      success: true,
      changes,
      user: {
        id: savedUser.id,
        username: savedUser.username,
        displayName: savedUser.displayName,
      },
    };
  }

  // ── Update Notes CRUD ───────────────────────────────────────────────────────

  /**
   * Create a new platform update note.
   * Emits a real-time event so online users see it immediately.
   */
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('update-notes')
  async createUpdateNote(
    @Body() body: { title: string; content: string },
    @Request() req: any,
  ) {
    if (!body.title?.trim()) {
      throw new BadRequestException('Title is required');
    }
    if (!body.content?.trim()) {
      throw new BadRequestException('Content is required');
    }

    const note = this.updateNoteRepo.create({
      title: body.title.trim(),
      content: body.content.trim(),
      createdBy: req.user?.userId,
    });
    const saved = await this.updateNoteRepo.save(note);

    // Broadcast to all connected clients so they can show the modal
    this.realtimeGateway.server.emit('platform.update-note.published', {
      id: saved.id,
      title: saved.title,
      content: saved.content,
      createdAt: saved.createdAt,
    });

    return { success: true, note: saved };
  }

  /**
   * List all update notes (admin management view).
   */
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('update-notes')
  async listUpdateNotes() {
    const notes = await this.updateNoteRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['author'],
    });

    return notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      author: n.author
        ? {
            id: n.author.id,
            displayName: n.author.displayName,
            username: n.author.username,
            email: n.author.email,
          }
        : null,
    }));
  }

  /**
   * Update an existing note's title and/or content.
   */
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch('update-notes/:noteId')
  async updateNote(
    @Param('noteId') noteId: string,
    @Body() body: { title?: string; content?: string },
  ) {
    const note = await this.updateNoteRepo.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('Update note not found');
    }

    if (!body.title?.trim() && !body.content?.trim()) {
      throw new BadRequestException(
        'At least one of title or content must be provided',
      );
    }

    if (body.title?.trim()) {
      note.title = body.title.trim();
    }
    if (body.content?.trim()) {
      note.content = body.content.trim();
    }

    const saved = await this.updateNoteRepo.save(note);
    return { success: true, note: saved };
  }

  /**
   * Delete an update note.
   */
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Delete('update-notes/:noteId')
  async deleteUpdateNote(@Param('noteId') noteId: string) {
    const note = await this.updateNoteRepo.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('Update note not found');
    }

    await this.updateNoteRepo.remove(note);
    return { success: true };
  }
}
