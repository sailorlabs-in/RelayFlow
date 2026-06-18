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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  GroupPermission,
  GroupRole,
  GroupSection,
  Conversation,
} from '@chat-app/database';

import { GroupsService } from './groups.service';

@ApiTags('Groups (Servers)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Post('transfer-ownership/accept')
  @ApiOperation({ summary: 'Accept group ownership transfer request' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', example: 'random-transfer-token-hex' },
      },
    },
  })
  async acceptOwnershipTransfer(
    @CurrentUser() currentUser: { userId: string },
    @Body('token') token: string,
  ) {
    const updatedGroup = await this.groupsService.acceptOwnershipTransfer(
      token,
      currentUser.userId,
    );

    // Broadcast updated group to all members
    const members = await this.groupsService.getGroupMembers(updatedGroup.id);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.updated', updatedGroup);
    }

    return updatedGroup;
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
        avatarThumbnailUrl: {
          type: 'string',
          example:
            'https://bucket.umangsailor.com/storage/profiles/group_thumb.png',
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
  @Permissions(GroupPermission.MANAGE_GROUP)
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
        avatarThumbnailUrl: {
          type: 'string',
          example:
            'https://bucket.umangsailor.com/storage/profiles/group_thumb.png',
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
  @Permissions(GroupPermission.KICK_MEMBERS)
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
  @Permissions(GroupPermission.MANAGE_CHANNELS)
  @ApiOperation({
    summary: 'Create a new text or conversation channel inside a group',
  })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'announcements' },
        layout: { type: 'string', example: 'text' },
        allowedRoleIds: { type: 'array', items: { type: 'string' } },
        sectionId: {
          type: 'string',
          example: '56568887-b39d-4912-abeb-3c7d1457b7a9',
          nullable: true,
        },
      },
    },
  })
  async createChannel(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name: string,
    @Body('layout') layout?: 'text' | 'bubble' | 'voice',
    @Body('allowedRoleIds') allowedRoleIds?: string[],
    @Body('sectionId') sectionId?: string,
    @Body('readRoleIds') readRoleIds?: string[],
    @Body('writeRoleIds') writeRoleIds?: string[],
    @Body('hiddenFromUserIds') hiddenFromUserIds?: string[],
  ) {
    const channel = await this.groupsService.createChannel(
      groupId,
      currentUser.userId,
      name,
      layout,
      allowedRoleIds,
      sectionId,
      readRoleIds,
      writeRoleIds,
      hiddenFromUserIds,
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

  // ─── Update channel name and allowed roles inside a group ────────────────────
  @Patch(':id/channels/:channelId')
  @Permissions(GroupPermission.MANAGE_CHANNELS)
  @ApiOperation({ summary: 'Update channel configurations' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'channelId', description: 'Channel UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'announcements' },
        allowedRoleIds: { type: 'array', items: { type: 'string' } },
        readRoleIds: { type: 'array', items: { type: 'string' } },
        writeRoleIds: { type: 'array', items: { type: 'string' } },
        hiddenFromUserIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async updateChannel(
    @Param('id') groupId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name: string,
    @Body('allowedRoleIds') allowedRoleIds?: string[],
    @Body('readRoleIds') readRoleIds?: string[],
    @Body('writeRoleIds') writeRoleIds?: string[],
    @Body('hiddenFromUserIds') hiddenFromUserIds?: string[],
  ) {
    const channel = await this.groupsService.updateChannel(
      groupId,
      channelId,
      currentUser.userId,
      name,
      allowedRoleIds,
      readRoleIds,
      writeRoleIds,
      hiddenFromUserIds,
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
  async getChannels(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    const channels = await this.groupsService.getGroupChannelsForUser(
      groupId,
      currentUser.userId,
    );
    return channels;
  }

  // ─── Delete a channel inside a group ─────────────────────────────────────────
  @Delete(':id/channels/:channelId')
  @Permissions(GroupPermission.MANAGE_CHANNELS)
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

  // ─── Group Roles Management ──────────────────────────────────────────────────
  @Get(':id/roles')
  @ApiOperation({ summary: 'Get all custom roles in a group' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  async getRoles(@Param('id') groupId: string) {
    return this.groupsService.getGroupRoles(groupId);
  }

  @Post(':id/roles')
  @Permissions(GroupPermission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Create a new custom role' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Moderator' },
        color: { type: 'string', example: '#7289da' },
        permissions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async createRole(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name: string,
    @Body('color') color?: string,
    @Body('permissions') permissions?: string[],
  ) {
    const role = await this.groupsService.createRole(
      groupId,
      currentUser.userId,
      name,
      color,
      permissions,
    );

    // Broadcast update to all group members
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.role.created', { groupId, role });
    }

    return role;
  }

  @Patch(':id/roles/:roleId')
  @Permissions(GroupPermission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Update a custom role' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'roleId', description: 'Role UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Moderator' },
        color: { type: 'string', example: '#7289da' },
        permissions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async updateRole(
    @Param('id') groupId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name: string,
    @Body('color') color?: string,
    @Body('permissions') permissions?: string[],
  ) {
    const role = await this.groupsService.updateRole(
      groupId,
      roleId,
      currentUser.userId,
      name,
      color,
      permissions,
    );

    // Broadcast update to all group members
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.role.updated', { groupId, role });
    }

    return role;
  }

  @Delete(':id/roles/:roleId')
  @Permissions(GroupPermission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'roleId', description: 'Role UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @Param('id') groupId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    await this.groupsService.deleteRole(groupId, roleId, currentUser.userId);

    // Broadcast update to all group members
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.role.deleted', { groupId, roleId });
    }
  }

  @Post(':id/roles/reorder')
  @Permissions(GroupPermission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Reorder custom roles priority' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['roleIds'],
      properties: {
        roleIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Roles successfully reordered.',
    type: [GroupRole],
  })
  async reorderRoles(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('roleIds') roleIds: string[],
  ) {
    const roles = await this.groupsService.reorderRoles(
      groupId,
      currentUser.userId,
      roleIds,
    );

    // Broadcast update to all group members
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.roles.reordered', { groupId, roles });
    }

    return roles;
  }

  @Post(':id/members/:userId/roles')
  @Permissions(GroupPermission.MANAGE_ROLES)
  @ApiOperation({ summary: 'Assign custom roles to a member' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID of member' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['roleIds'],
      properties: {
        roleIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async assignMemberRoles(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('roleIds') roleIds: string[],
  ) {
    const updatedMember = await this.groupsService.assignRolesToMember(
      groupId,
      targetUserId,
      currentUser.userId,
      roleIds,
    );

    // Broadcast member update to all group members
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.member.roles.updated', {
          groupId,
          userId: targetUserId,
          roleIds,
          member: updatedMember,
        });
    }

    return updatedMember;
  }

  // ─── Group Sections/Categories Management ───
  @Post(':id/sections')
  @Permissions(GroupPermission.MANAGE_CHANNELS)
  @ApiOperation({ summary: 'Create a new group section/category' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'DAILY TALKS' },
        allowedRoleIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Section successfully created.',
    type: GroupSection,
  })
  async createSection(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name: string,
    @Body('allowedRoleIds') allowedRoleIds?: string[],
  ) {
    const section = await this.groupsService.createSection(
      groupId,
      currentUser.userId,
      name,
      allowedRoleIds || [],
    );

    // Notify all members of the group via socket
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.section.created', {
          groupId,
          section,
        });
    }

    return section;
  }

  @Patch(':id/sections/:sectionId')
  @Permissions(GroupPermission.MANAGE_CHANNELS)
  @ApiOperation({ summary: 'Update a group section/category' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'sectionId', description: 'Section UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'DAILY TALKS' },
        allowedRoleIds: { type: 'array', items: { type: 'string' } },
        position: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Section successfully updated.',
    type: GroupSection,
  })
  async updateSection(
    @Param('id') groupId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('name') name?: string,
    @Body('allowedRoleIds') allowedRoleIds?: string[],
    @Body('position') position?: number,
  ) {
    const section = await this.groupsService.updateSection(
      groupId,
      sectionId,
      currentUser.userId,
      name,
      allowedRoleIds,
      position,
    );

    // Notify all members of the group via socket
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.section.updated', {
          groupId,
          section,
        });
    }

    return section;
  }

  @Delete(':id/sections/:sectionId')
  @Permissions(GroupPermission.MANAGE_CHANNELS)
  @ApiOperation({ summary: 'Delete a group section/category' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiParam({ name: 'sectionId', description: 'Section UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Section successfully deleted.' })
  async deleteSection(
    @Param('id') groupId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    await this.groupsService.deleteSection(
      groupId,
      sectionId,
      currentUser.userId,
    );

    // Notify all members of the group via socket
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.section.deleted', {
          groupId,
          sectionId,
        });
    }
  }

  @Post(':id/sections/reorder')
  @Permissions(GroupPermission.MANAGE_CHANNELS)
  @ApiOperation({ summary: 'Reorder categories/sections' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sectionIds'],
      properties: {
        sectionIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sections successfully reordered.',
    type: [GroupSection],
  })
  async reorderSections(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('sectionIds') sectionIds: string[],
  ) {
    const sections = await this.groupsService.reorderSections(
      groupId,
      currentUser.userId,
      sectionIds,
    );

    // Notify all members of the group via socket
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.sections.reordered', {
          groupId,
          sections,
        });
    }

    return sections;
  }

  @Post(':id/channels/reorder')
  @Permissions(GroupPermission.MANAGE_CHANNELS)
  @ApiOperation({ summary: 'Reorder channels' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['channelOrders'],
      properties: {
        channelOrders: {
          type: 'array',
          items: {
            type: 'object',
            required: ['channelId', 'position'],
            properties: {
              channelId: { type: 'string' },
              sectionId: { type: 'string', nullable: true },
              position: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Channels successfully reordered.',
    type: [Conversation],
  })
  async reorderChannels(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('channelOrders')
    channelOrders: Array<{
      channelId: string;
      sectionId: string | null;
      position: number;
    }>,
  ) {
    const channels = await this.groupsService.reorderChannels(
      groupId,
      currentUser.userId,
      channelOrders,
    );

    // Notify all members of the group via socket
    const members = await this.groupsService.getGroupMembers(groupId);
    for (const member of members) {
      const userChannels = await this.groupsService.getGroupChannelsForUser(
        groupId,
        member.userId,
      );
      this.realtimeGateway.server
        .to(`user:${member.userId}`)
        .emit('group.channels.reordered', {
          groupId,
          channels: userChannels,
        });
    }

    return channels;
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Initiate group ownership transfer request' })
  @ApiParam({ name: 'id', description: 'Group UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['newOwnerId'],
      properties: {
        newOwnerId: {
          type: 'string',
          example: '56568887-b39d-4912-abeb-3c7d1457b7a9',
        },
      },
    },
  })
  async initiateOwnershipTransfer(
    @Param('id') groupId: string,
    @CurrentUser() currentUser: { userId: string },
    @Body('newOwnerId') newOwnerId: string,
  ) {
    return this.groupsService.initiateOwnershipTransfer(
      groupId,
      currentUser.userId,
      newOwnerId,
    );
  }
}
