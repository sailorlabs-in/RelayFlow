import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RealtimeGateway } from '../realtime/realtime.gateway';

import { GroupsService } from './groups.service';

@ApiTags('Groups (Servers)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  // ─── Resolve and Accept invite links (must be placed before generic :id routes) ───
  @Get('invite/resolve/:token')
  @ApiOperation({ summary: 'Resolve group details from invite token' })
  @ApiParam({ name: 'token', description: 'Invite token' })
  async resolveInvite(@Param('token') token: string) {
    return this.groupsService.resolveInvite(token);
  }

  @Post('invite/accept/:token')
  @ApiOperation({ summary: 'Join a group using invite token' })
  @ApiParam({ name: 'token', description: 'Invite token' })
  async acceptInvite(
    @Param('token') token: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    const group = await this.groupsService.acceptInvite(
      token,
      currentUser.userId,
    );

    // Notify all members of the group about the new member via socket
    const groupDetails = await this.groupsService.getGroupsForUser(
      currentUser.userId,
    );
    const updatedGroup = groupDetails.find((g) => g.id === group.id);

    this.realtimeGateway.server
      .to(`user:${currentUser.userId}`)
      .emit('group.member.added', {
        groupId: group.id,
        group: updatedGroup,
      });

    const members = await this.groupsService.getGroupMembers(group.id);
    for (const member of members) {
      if (member.userId !== currentUser.userId) {
        this.realtimeGateway.server
          .to(`user:${member.userId}`)
          .emit('group.member.added', {
            groupId: group.id,
            group: updatedGroup,
          });
      }
    }

    return group;
  }

  // ─── Group Invite Links Management ───
  @Post(':id/invites')
  @ApiOperation({ summary: 'Create group invite link' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { expiresIn: { type: 'string', example: '1h' } },
    },
  })
  async createInvite(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('expiresIn') expiresIn?: string,
  ) {
    return this.groupsService.createInvite(
      groupId,
      currentUser.userId,
      expiresIn || 'never',
    );
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'Get active invite links for a group' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  async getInvites(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    return this.groupsService.listInvites(groupId, currentUser.userId);
  }

  @Delete(':id/invites/:inviteId')
  @ApiOperation({ summary: 'Revoke group invite link' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'inviteId', description: 'Invite UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInvite(
    @Param('id') groupId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    await this.groupsService.deleteInvite(inviteId, currentUser.userId);
  }

  // ─── Create a new group ───────────────────────────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Create a new group (server)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'My Awesome Server' },
        description: { type: 'string', example: 'A cool group for friends' },
        memberUserIds: { type: 'array', items: { type: 'string' } },
        avatarUrl: {
          type: 'string',
          example: 'https://bucket.umangsailor.com/storage/profiles/group.png',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Group created successfully.' })
  async createGroup(
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('memberUserIds') memberUserIds?: string[],
    @Body('avatarUrl') avatarUrl?: string,
    @Body('avatarThumbnailUrl') avatarThumbnailUrl?: string,
  ) {
    const group = await this.groupsService.createGroup(
      currentUser.userId,
      name,
      description,
      memberUserIds || [],
      avatarUrl,
      avatarThumbnailUrl,
    );

    // Notify all invited members about the new group via socket
    const allMemberIds = group.members.map((m: any) => m.userId);
    for (const userId of allMemberIds) {
      this.realtimeGateway.server
        .to(`user:${userId}`)
        .emit('group.created', group);
    }

    return group;
  }

  // ─── Get all groups for the current user ──────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get all groups the current user belongs to' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200, description: 'List of groups.' })
  async getGroups(@CurrentUser() currentUser: { userId: string }) {
    const groups = await this.groupsService.getGroupsForUser(
      currentUser.userId,
    );
    return groups;
  }

  // ─── Update group name/description ───────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({ summary: 'Update group name, description, and avatar' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'My Awesome Server' },
        description: { type: 'string', example: 'A cool group for friends' },
        avatarUrl: {
          type: 'string',
          example: 'https://bucket.umangsailor.com/storage/profiles/group.png',
        },
      },
    },
  })
  async updateGroup(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('avatarUrl') avatarUrl?: string,
    @Body('avatarThumbnailUrl') avatarThumbnailUrl?: string,
  ) {
    const updatedGroup = await this.groupsService.updateGroup(
      groupId,
      currentUser.userId,
      name,
      description,
      avatarUrl,
      avatarThumbnailUrl,
    );

    // Notify all group members about the update via socket
    const allMemberIds = updatedGroup.members.map((m: any) => m.userId);
    for (const userId of allMemberIds) {
      this.realtimeGateway.server
        .to(`user:${userId}`)
        .emit('group.updated', updatedGroup);
    }

    return updatedGroup;
  }

  // ─── Add members to a group ───────────────────────────────────────────────────
  @Post(':id/members')
  @ApiOperation({ summary: 'Add members to a group' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userIds'],
      properties: {
        userIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async addMembers(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('userIds') userIds: string[],
  ) {
    const newMembers = await this.groupsService.addMembers(
      groupId,
      currentUser.userId,
      userIds,
    );

    // Notify newly added members about the group
    const groups = await this.groupsService.getGroupsForUser(
      currentUser.userId,
    );
    const updatedGroup = groups.find((g) => g.id === groupId);

    for (const member of newMembers) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.member.added', {
          groupId,
          group: updatedGroup,
        });
    }

    return newMembers;
  }

  // ─── Remove a member from a group ────────────────────────────────────────────
  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from a group' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to remove' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    await this.groupsService.removeMember(
      groupId,
      currentUser.userId,
      targetUserId,
    );

    // Notify the removed user
    this.realtimeGateway.server
      .to(`user:${targetUserId}`)
      .emit('group.member.removed', { groupId });
  }

  // ─── Create a channel inside a group ─────────────────────────────────────────
  @Post(':id/channels')
  @ApiOperation({ summary: 'Create a new text channel inside a group' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string', example: 'announcements' } },
    },
  })
  async createChannel(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name: string,
  ) {
    const channel = await this.groupsService.createChannel(
      groupId,
      currentUser.userId,
      name,
    );

    // Notify all group members about the new channel
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.channel.created', {
          groupId,
          channel,
        });
    }

    return channel;
  }

  // ─── Update channel name inside a group ──────────────────────────────────────
  @Patch(':id/channels/:channelId')
  @ApiOperation({ summary: 'Update channel name' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'channelId', description: 'Channel UUID' })
  async updateChannel(
    @Param('id') groupId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name: string,
  ) {
    const channel = await this.groupsService.updateChannel(
      groupId,
      channelId,
      currentUser.userId,
      name,
    );

    // Notify all group members about the channel update
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.channel.updated', {
          groupId,
          channel,
        });
    }

    return channel;
  }

  // ─── Get channels in a group ──────────────────────────────────────────────────
  @Get(':id/channels')
  @ApiOperation({ summary: 'List all text channels in a group' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  async getChannels(@Param('id') groupId: string) {
    const channels = await this.groupsService.getGroupChannels(groupId);
    return channels;
  }

  // ─── Delete a channel inside a group ─────────────────────────────────────────
  @Delete(':id/channels/:channelId')
  @ApiOperation({ summary: 'Delete a text channel inside a group' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'channelId', description: 'Channel UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChannel(
    @Param('id') groupId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    const members = await this.groupsService.getGroupMembers(groupId);
    await this.groupsService.deleteChannel(
      groupId,
      channelId,
      currentUser.userId,
    );

    // Notify all group members about the channel deletion
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.channel.deleted', {
          groupId,
          channelId,
        });
    }
  }

  // ─── Delete a group ───────────────────────────────────────────────────────────
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group and all its channels' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    const members = await this.groupsService.getGroupMembers(groupId);
    await this.groupsService.deleteGroup(groupId, currentUser.userId);

    // Notify all members about the group deletion
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.deleted', { groupId });
    }
  }
}
