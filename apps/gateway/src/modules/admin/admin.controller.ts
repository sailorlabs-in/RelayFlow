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
}
