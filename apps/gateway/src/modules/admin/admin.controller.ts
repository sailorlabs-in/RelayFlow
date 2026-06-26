import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Inject,
  forwardRef,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueNames } from '@chat-app/queues';
import { User, Group, GroupMember } from '@chat-app/database';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { UsersService } from '../users/users.service';
import { GroupsService } from '../groups/groups.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
    private readonly usersService: UsersService,
    private readonly groupsService: GroupsService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtimeGateway: RealtimeGateway,
    @InjectQueue(QueueNames.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
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
    return this.userRepo.find({
      select: [
        'id',
        'email',
        'username',
        'displayName',
        'avatarUrl',
        'role',
        'warnings',
        'status',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
    });
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

    // Notify updated user via WebSocket
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
}
