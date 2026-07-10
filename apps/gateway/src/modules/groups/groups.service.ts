import {
  User,
  Group,
  GroupMember,
  GroupMemberRole,
  Conversation,
  ConversationMember,
  ConversationType,
  GroupInvite,
  GroupRole,
  GroupSection,
  GroupOwnershipTransfer,
} from '@chat-app/database';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly convMemberRepo: Repository<ConversationMember>,
    @InjectRepository(GroupInvite)
    private readonly groupInviteRepo: Repository<GroupInvite>,
    @InjectRepository(GroupRole)
    private readonly groupRoleRepo: Repository<GroupRole>,
    @InjectRepository(GroupSection)
    private readonly groupSectionRepo: Repository<GroupSection>,
    @InjectRepository(GroupOwnershipTransfer)
    private readonly groupOwnershipTransferRepo: Repository<GroupOwnershipTransfer>,
    private readonly emailService: EmailService,
  ) {}

  async hasPermission(
    groupId: string,
    userId: string,
    permission: string,
  ): Promise<boolean> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      return false;
    }

    const user = await this.groupRepo.manager.findOne(User, {
      where: { id: userId },
    });
    if (user && user.role === 'admin') {
      return true;
    }

    if (
      member.role === GroupMemberRole.OWNER ||
      member.role === GroupMemberRole.ADMIN
    ) {
      return true;
    }

    if (member.permissions && member.permissions.includes(permission)) {
      return true;
    }

    if (member.roleIds && member.roleIds.length > 0) {
      const roles = await this.groupRoleRepo.find({
        where: {
          id: In(member.roleIds),
          groupId,
        },
      });
      for (const role of roles) {
        if (role.permissions && role.permissions.includes(permission)) {
          return true;
        }
      }
    }

    return false;
  }

  private async isPlatformAdmin(userId: string): Promise<boolean> {
    const user = await this.groupRepo.manager.findOne(User, {
      where: { id: userId },
    });
    return user?.role === 'admin';
  }

  getPermissionsHighestManageRank(permissions: string[]): number {
    const perms = new Set<string>(permissions || []);
    if (perms.has('manage_group')) {
      return 1;
    }
    if (perms.has('manage_channels')) {
      return 2;
    }
    if (perms.has('manage_roles')) {
      return 3;
    }
    return 4;
  }

  async getMemberHighestManageRank(
    groupId: string,
    userId: string,
    member?: GroupMember,
  ): Promise<number> {
    const mem =
      member ||
      (await this.groupMemberRepo.findOne({ where: { groupId, userId } }));
    if (!mem) {
      return 5;
    }
    const user = await this.groupRepo.manager.findOne(User, {
      where: { id: mem.userId },
    });
    if (user && user.role === 'admin') {
      return 0;
    }
    if (mem.role === GroupMemberRole.OWNER) {
      return 0; // GOD
    }
    if (mem.role === GroupMemberRole.ADMIN) {
      return 1; // ADMIN gets rank 1
    }

    const perms = new Set<string>(mem.permissions || []);
    if (mem.roleIds && mem.roleIds.length > 0) {
      const roles = await this.groupRoleRepo.find({
        where: { id: In(mem.roleIds), groupId },
      });
      for (const role of roles) {
        if (role.permissions) {
          role.permissions.forEach((p) => perms.add(p));
        }
      }
    }

    return this.getPermissionsHighestManageRank(Array.from(perms));
  }

  async getMemberHighestRolePriority(
    groupId: string,
    member: GroupMember,
  ): Promise<number> {
    const user = await this.groupRepo.manager.findOne(User, {
      where: { id: member.userId },
    });
    if (user && user.role === 'admin') {
      return 0;
    }
    if (member.role === GroupMemberRole.OWNER) {
      return 0; // Owner gets highest authority
    }
    if (member.role === GroupMemberRole.ADMIN) {
      return 1; // Admin gets next highest authority
    }
    if (!member.roleIds || member.roleIds.length === 0) {
      return 1000000; // Unassigned custom roles have lowest authority
    }
    const roles = await this.groupRoleRepo.find({
      where: { id: In(member.roleIds), groupId },
    });
    if (roles.length === 0) {
      return 1000000;
    }
    // Return the minimum priority value (which represents the highest authority role)
    const priorities = roles.map((r) =>
      Math.max(r.hierarchyPriority ?? r.priority ?? 1, 1),
    );
    return Math.min(...priorities);
  }

  async getMemberHighestRolePriorityByUserId(
    groupId: string,
    userId: string,
  ): Promise<number> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      return -1;
    }
    return this.getMemberHighestRolePriority(groupId, member);
  }

  // Helper to load profiles for group members
  private async attachProfilesToMembers(
    members: GroupMember[],
  ): Promise<any[]> {
    return Promise.all(
      members.map(async (member) => {
        const user = await this.groupRepo.manager.findOne(User, {
          where: { id: member.userId },
          select: [
            'id',
            'email',
            'displayName',
            'username',
            'avatarUrl',
            'avatarThumbnailUrl',
            'status',
            'visibility',
            'role',
          ],
        });
        return { ...member, user };
      }),
    );
  }

  // ─── Create a new group (server) ─────────────────────────────────────────────
  async createGroup(
    ownerId: string,
    name: string,
    description?: string,
    memberUserIds: string[] = [],
    avatarUrl?: string,
    avatarThumbnailUrl?: string,
  ): Promise<any> {
    const iconLetter = name.trim()[0]?.toUpperCase() || 'G';

    const group = this.groupRepo.create({
      name: name.trim(),
      description,
      ownerId,
      iconLetter,
      avatarUrl,
      avatarThumbnailUrl,
    });
    const savedGroup = await this.groupRepo.save(group);

    // Add owner as first member with 'owner' role
    const allUserIds = [
      ownerId,
      ...memberUserIds.filter((id) => id !== ownerId),
    ];
    const members = allUserIds.map((userId) =>
      this.groupMemberRepo.create({
        groupId: savedGroup.id,
        userId,
        role:
          userId === ownerId ? GroupMemberRole.OWNER : GroupMemberRole.MEMBER,
      }),
    );
    const savedMembers = await this.groupMemberRepo.save(members);
    const membersWithProfiles =
      await this.attachProfilesToMembers(savedMembers);

    return {
      ...savedGroup,
      members: membersWithProfiles,
      channels: [],
      roles: [],
      sections: [],
    };
  }

  // ─── Get all groups a user is a member of ────────────────────────────────────
  async getGroupsForUser(userId: string): Promise<any[]> {
    const memberships = await this.groupMemberRepo.find({ where: { userId } });
    if (memberships.length === 0) {
      return [];
    }

    const groupIds = memberships.map((m) => m.groupId);
    const groups = await this.groupRepo.find({ where: { id: In(groupIds) } });

    // Load all members + channels for each group
    return Promise.all(
      groups.map(async (group) => {
        const members = await this.groupMemberRepo.find({
          where: { groupId: group.id },
        });
        const membersWithProfiles = await this.attachProfilesToMembers(members);

        const requesterIsPlatformAdmin = await this.isPlatformAdmin(userId);
        const requesterMembership = members.find((rm) => rm.userId === userId);
        const requesterIsGroupAdmin =
          requesterMembership?.role === GroupMemberRole.ADMIN ||
          (requesterMembership && requesterIsPlatformAdmin);
        const requesterIsGroupOwner =
          group.ownerId === userId ||
          requesterMembership?.role === GroupMemberRole.OWNER ||
          (requesterMembership && requesterIsPlatformAdmin);

        const filteredMembers = membersWithProfiles.filter((m) => {
          if (!m.isGhost) {
            return true;
          }
          return (
            m.userId === userId ||
            requesterIsPlatformAdmin ||
            requesterIsGroupOwner ||
            requesterIsGroupAdmin
          );
        });

        const allChannels = await this.conversationRepo.find({
          where: { groupId: group.id, type: ConversationType.CHANNEL },
          order: { position: 'ASC', createdAt: 'ASC' },
        });
        const channels = await this.filterChannelsForUser(
          group.id,
          userId,
          allChannels,
        );
        const roles = await this.getGroupRoles(group.id);
        const sections = await this.getGroupSectionsForUser(group.id, userId);
        return {
          ...group,
          members: filteredMembers,
          channels,
          roles,
          sections,
        };
      }),
    );
  }

  // ─── Update an existing group's settings ──────────────────────────────────────
  async updateGroup(
    groupId: string,
    requesterId: string,
    name: string,
    description?: string,
    avatarUrl?: string,
    avatarThumbnailUrl?: string,
  ): Promise<any> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_group',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage group permission can update group settings',
      );
    }

    group.name = name.trim();
    if (description !== undefined) {
      group.description = description;
    }
    if (avatarUrl !== undefined) {
      group.avatarUrl = avatarUrl;
    }
    if (avatarThumbnailUrl !== undefined) {
      group.avatarThumbnailUrl = avatarThumbnailUrl;
    }
    group.iconLetter = name.trim()[0]?.toUpperCase() || 'G';

    const savedGroup = await this.groupRepo.save(group);

    const members = await this.groupMemberRepo.find({ where: { groupId } });
    const membersWithProfiles = await this.attachProfilesToMembers(members);
    const allChannels = await this.conversationRepo.find({
      where: { groupId, type: ConversationType.CHANNEL },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
    const channels = await this.filterChannelsForUser(
      groupId,
      requesterId,
      allChannels,
    );
    const roles = await this.getGroupRoles(groupId);
    const sections = await this.getGroupSectionsForUser(groupId, requesterId);

    return {
      ...savedGroup,
      members: membersWithProfiles,
      channels,
      roles,
      sections,
    };
  }

  // ─── Add members to an existing group ────────────────────────────────────────
  async addMembers(
    groupId: string,
    requesterId: string,
    userIds: string[],
  ): Promise<any[]> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const requesterMembership = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!requesterMembership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Get all channels in the group
    const channels = await this.conversationRepo.find({
      where: { groupId, type: ConversationType.CHANNEL },
    });

    const newMembers: GroupMember[] = [];
    for (const userId of userIds) {
      const existing = await this.groupMemberRepo.findOne({
        where: { groupId, userId },
      });
      if (!existing) {
        const member = this.groupMemberRepo.create({
          groupId,
          userId,
          role: GroupMemberRole.MEMBER,
        });
        const saved = await this.groupMemberRepo.save(member);
        newMembers.push(saved);

        // Add to all existing channels
        for (const channel of channels) {
          const existingChannelMember = await this.convMemberRepo.findOne({
            where: { conversationId: channel.id, userId },
          });
          if (!existingChannelMember) {
            await this.convMemberRepo.save(
              this.convMemberRepo.create({
                conversationId: channel.id,
                userId,
              }),
            );
          }
        }
      }
    }

    return this.attachProfilesToMembers(newMembers);
  }

  // ─── Remove a member from a group ────────────────────────────────────────────
  async removeMember(
    groupId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<{ groupName: string; kickerRole: string }> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const targetUser = await this.groupRepo.manager.findOne(User, {
      where: { id: targetUserId },
    });
    const targetIsPlatformAdmin = targetUser?.role === 'admin';

    const requesterUser = await this.groupRepo.manager.findOne(User, {
      where: { id: requesterId },
    });
    const requesterIsPlatformAdmin = requesterUser?.role === 'admin';

    if (targetIsPlatformAdmin && !requesterIsPlatformAdmin) {
      throw new ForbiddenException('Cannot remove a platform-wide admin');
    }

    if (targetUserId === group.ownerId && !requesterIsPlatformAdmin) {
      throw new ForbiddenException('Cannot remove the group owner');
    }

    let kickerRole = 'Member';

    if (requesterId !== targetUserId) {
      // It is a kick action
      const requesterMembership = await this.groupMemberRepo.findOne({
        where: { groupId, userId: requesterId },
      });
      if (!requesterMembership) {
        throw new ForbiddenException('You are not a member of this group');
      }

      const targetMembership = await this.groupMemberRepo.findOne({
        where: { groupId, userId: targetUserId },
      });
      if (!targetMembership) {
        throw new NotFoundException(
          'Target user is not a member of this group',
        );
      }

      // Check permissions:
      if (!requesterIsPlatformAdmin) {
        const hasPerm = await this.hasPermission(
          groupId,
          requesterId,
          'kick_members',
        );
        if (!hasPerm) {
          throw new ForbiddenException(
            'Only group owners, admins, or members with kick permissions can remove members',
          );
        }

        if (
          (targetMembership.role === GroupMemberRole.OWNER ||
            targetMembership.role === GroupMemberRole.ADMIN) &&
          requesterMembership.role !== GroupMemberRole.OWNER
        ) {
          throw new ForbiddenException(
            'Only the group owner can remove admins or owners',
          );
        }
      }

      // Determine kicker's highest role label
      if (requesterMembership.role === GroupMemberRole.OWNER) {
        kickerRole = 'Owner';
      } else if (requesterMembership.role === GroupMemberRole.ADMIN) {
        kickerRole = 'Admin';
      } else {
        // Check custom roles
        const requesterRoleIds: string[] =
          (requesterMembership as any).roleIds || [];
        if (requesterRoleIds.length > 0) {
          const topCustomRole = await this.groupRoleRepo.findOne({
            where: { id: requesterRoleIds[0], groupId },
          });
          if (topCustomRole) {
            kickerRole = topCustomRole.name;
          }
        }
      }
    }

    await this.groupMemberRepo.delete({ groupId, userId: targetUserId });

    // Remove from all channels in this group
    const channels = await this.conversationRepo.find({
      where: { groupId, type: ConversationType.CHANNEL },
    });
    for (const channel of channels) {
      await this.convMemberRepo.delete({
        conversationId: channel.id,
        userId: targetUserId,
      });
    }

    return { groupName: group.name, kickerRole };
  }

  // ─── Create a new channel inside a group ─────────────────────────────────────
  async createChannel(
    groupId: string,
    requesterId: string,
    name: string,
    layout?: 'text' | 'bubble' | 'voice',
    allowedRoleIds?: string[],
    sectionId?: string,
    readRoleIds?: string[],
    writeRoleIds?: string[],
    hiddenFromUserIds?: string[],
    isReadOnly?: boolean,
    notificationSetting?: 'all' | 'mention' | 'none',
    hiddenFromRoleIds?: string[],
    readUserIds?: string[],
    writeUserIds?: string[],
  ): Promise<Conversation> {
    const membership = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Check for duplicate channel name
    const existing = await this.conversationRepo.findOne({
      where: { groupId, name: name.trim().toLowerCase().replace(/\s+/g, '-') },
    });
    if (existing) {
      throw new ConflictException(
        `Channel #${name} already exists in this group`,
      );
    }

    const channel = this.conversationRepo.create({
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      type: ConversationType.CHANNEL,
      groupId,
      layout: layout || 'text',
      allowedRoleIds: allowedRoleIds || [],
      readRoleIds: readRoleIds || [],
      writeRoleIds: writeRoleIds || [],
      hiddenFromUserIds: hiddenFromUserIds || [],
      hiddenFromRoleIds: hiddenFromRoleIds || [],
      readUserIds: readUserIds || [],
      writeUserIds: writeUserIds || [],
      sectionId,
      isReadOnly: isReadOnly || false,
      notificationSetting: notificationSetting || 'all',
    });
    const savedChannel = await this.conversationRepo.save(channel);

    // Add all group members to the new channel
    const groupMembers = await this.groupMemberRepo.find({
      where: { groupId },
    });
    const channelMembers = groupMembers.map((m) =>
      this.convMemberRepo.create({
        conversationId: savedChannel.id,
        userId: m.userId,
      }),
    );
    await this.convMemberRepo.save(channelMembers);

    return savedChannel;
  }

  // ─── Update channel name inside a group ──────────────────────────────────────
  async updateChannel(
    groupId: string,
    channelId: string,
    requesterId: string,
    name: string,
    allowedRoleIds?: string[],
    readRoleIds?: string[],
    writeRoleIds?: string[],
    hiddenFromUserIds?: string[],
    isReadOnly?: boolean,
    notificationSetting?: 'all' | 'mention' | 'none',
    hiddenFromRoleIds?: string[],
    readUserIds?: string[],
    writeUserIds?: string[],
  ): Promise<Conversation> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const requesterMembership = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!requesterMembership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_channels',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage channels permission can edit channels',
      );
    }

    const channel = await this.conversationRepo.findOne({
      where: { id: channelId, groupId, type: ConversationType.CHANNEL },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found in this group');
    }

    channel.name = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (allowedRoleIds !== undefined) {
      channel.allowedRoleIds = allowedRoleIds;
    }
    if (readRoleIds !== undefined) {
      channel.readRoleIds = readRoleIds;
    }
    if (writeRoleIds !== undefined) {
      channel.writeRoleIds = writeRoleIds;
    }
    if (hiddenFromUserIds !== undefined) {
      channel.hiddenFromUserIds = hiddenFromUserIds;
    }
    if (hiddenFromRoleIds !== undefined) {
      channel.hiddenFromRoleIds = hiddenFromRoleIds;
    }
    if (readUserIds !== undefined) {
      channel.readUserIds = readUserIds;
    }
    if (writeUserIds !== undefined) {
      channel.writeUserIds = writeUserIds;
    }
    if (isReadOnly !== undefined) {
      channel.isReadOnly = isReadOnly;
    }
    if (notificationSetting !== undefined) {
      channel.notificationSetting = notificationSetting;
    }
    return this.conversationRepo.save(channel);
  }

  // ─── Delete a channel inside a group ─────────────────────────────────────────
  async deleteChannel(
    groupId: string,
    channelId: string,
    requesterId: string,
  ): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const requesterMembership = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!requesterMembership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_channels',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage channels permission can delete channels',
      );
    }

    const channel = await this.conversationRepo.findOne({
      where: { id: channelId, groupId, type: ConversationType.CHANNEL },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found in this group');
    }

    // Delete message history
    await this.groupRepo.manager.delete('message', {
      conversationId: channelId,
    });
    // Delete memberships
    await this.convMemberRepo.delete({ conversationId: channelId });
    // Delete conversation entity
    await this.conversationRepo.delete({ id: channelId });
  }

  // ─── Delete a group and all its channels ─────────────────────────────────────
  async deleteGroup(groupId: string, requesterId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    const isPlatformAdmin = await this.isPlatformAdmin(requesterId);
    if (group.ownerId !== requesterId && !isPlatformAdmin) {
      throw new ForbiddenException('Only the group owner can delete the group');
    }

    // Delete all channel messages + memberships
    const channels = await this.conversationRepo.find({ where: { groupId } });
    for (const channel of channels) {
      await this.groupRepo.manager.delete('message', {
        conversationId: channel.id,
      });
      await this.convMemberRepo.delete({ conversationId: channel.id });
      await this.conversationRepo.delete({ id: channel.id });
    }

    await this.groupMemberRepo.delete({ groupId });
    await this.groupRepo.delete({ id: groupId });
  }

  // ─── Get members of a specific group ─────────────────────────────────────────
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return this.groupMemberRepo.find({ where: { groupId } });
  }

  async updateNotificationPref(
    groupId: string,
    userId: string,
    notificationPref: 'all' | 'mention' | 'none',
  ): Promise<GroupMember> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      throw new NotFoundException('Member not found in group');
    }
    member.notificationPref = notificationPref;
    member.isMuted = notificationPref === 'none';
    return this.groupMemberRepo.save(member);
  }

  async getGroupMember(
    groupId: string,
    userId: string,
  ): Promise<GroupMember | null> {
    return this.groupMemberRepo.findOne({ where: { groupId, userId } });
  }

  // ─── Get channels in a group ──────────────────────────────────────────────────
  async getGroupChannels(groupId: string): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: { groupId, type: ConversationType.CHANNEL },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async getGroupChannelsForUser(
    groupId: string,
    userId: string,
  ): Promise<Conversation[]> {
    const channels = await this.conversationRepo.find({
      where: { groupId, type: ConversationType.CHANNEL },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
    return this.filterChannelsForUser(groupId, userId, channels);
  }

  // Helper to filter channels based on user custom roles and parent section visibility
  private async filterChannelsForUser(
    groupId: string,
    userId: string,
    channels: Conversation[],
  ): Promise<Conversation[]> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      return [];
    }

    const hasManageGroup = await this.hasPermission(
      groupId,
      userId,
      'manage_group',
    );
    if (
      member.role === GroupMemberRole.OWNER ||
      member.role === GroupMemberRole.ADMIN ||
      hasManageGroup
    ) {
      return channels;
    }

    const memberRoleIds = member.roleIds || [];
    const sections = await this.getGroupSectionsForUser(groupId, userId);
    const allowedSectionIds = new Set(sections.map((s) => s.id));

    let sortedRoles: GroupRole[] = [];
    if (memberRoleIds.length > 0) {
      const roles = await this.groupRoleRepo.find({
        where: { id: In(memberRoleIds), groupId },
      });
      sortedRoles = roles.sort((a, b) => {
        const aPriority = Math.max(a.hierarchyPriority ?? a.priority ?? 1, 1);
        const bPriority = Math.max(b.hierarchyPriority ?? b.priority ?? 1, 1);
        return aPriority - bPriority;
      });
    }

    return channels.filter((channel) => {
      if (channel.sectionId && !allowedSectionIds.has(channel.sectionId)) {
        return false;
      }

      const hiddenFromUsers = channel.hiddenFromUserIds || [];
      const readUsers = channel.readUserIds || [];
      const writeUsers = channel.writeUserIds || [];

      // 1. User-level overrides (highest priority)
      if (hiddenFromUsers.includes(userId)) {
        return false;
      }
      if (writeUsers.includes(userId) || readUsers.includes(userId)) {
        return true;
      }

      // 2. Role-level evaluation (second priority)
      const hiddenFromRoles = channel.hiddenFromRoleIds || [];
      const allowedRoles = channel.allowedRoleIds || [];
      const readRoles = channel.readRoleIds || [];
      const writeRoles = channel.writeRoleIds || [];

      const isChannelPrivate =
        allowedRoles.length > 0 ||
        readRoles.length > 0 ||
        readUsers.length > 0 ||
        writeRoles.length > 0 ||
        writeUsers.length > 0;

      if (sortedRoles.length > 0) {
        const configuredRole = sortedRoles.find(
          (role) =>
            hiddenFromRoles.includes(role.id) ||
            writeRoles.includes(role.id) ||
            readRoles.includes(role.id) ||
            allowedRoles.includes(role.id),
        );

        if (configuredRole) {
          if (hiddenFromRoles.includes(configuredRole.id)) {
            return false;
          }
          if (
            writeRoles.includes(configuredRole.id) ||
            readRoles.includes(configuredRole.id) ||
            allowedRoles.includes(configuredRole.id)
          ) {
            return true;
          }
        }
      }

      // 3. Fallback/Default for users with no matching role configurations
      if (isChannelPrivate) {
        return false;
      }

      return true;
    });
  }

  async canUserAccessChannel(
    groupId: string,
    channelId: string,
    userId: string,
  ): Promise<boolean> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      return false;
    }

    const hasManageGroup = await this.hasPermission(
      groupId,
      userId,
      'manage_group',
    );
    if (
      member.role === GroupMemberRole.OWNER ||
      member.role === GroupMemberRole.ADMIN ||
      hasManageGroup
    ) {
      return true;
    }

    const channel = await this.conversationRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      return false;
    }

    if (channel.sectionId) {
      const section = await this.groupSectionRepo.findOne({
        where: { id: channel.sectionId },
      });
      if (section) {
        const allowedSections = await this.filterSectionsForUser(
          groupId,
          userId,
          [section],
        );
        if (allowedSections.length === 0) {
          return false;
        }
      }
    }

    const hiddenFromUsers = channel.hiddenFromUserIds || [];
    const readUsers = channel.readUserIds || [];
    const writeUsers = channel.writeUserIds || [];

    // 1. User-level overrides (highest priority)
    if (hiddenFromUsers.includes(userId)) {
      return false;
    }
    if (writeUsers.includes(userId) || readUsers.includes(userId)) {
      return true;
    }

    // 2. Role-level evaluation (second priority)
    const memberRoleIds = member.roleIds || [];
    const hiddenFromRoles = channel.hiddenFromRoleIds || [];
    const allowedRoles = channel.allowedRoleIds || [];
    const readRoles = channel.readRoleIds || [];
    const writeRoles = channel.writeRoleIds || [];

    const isChannelPrivate =
      allowedRoles.length > 0 ||
      readRoles.length > 0 ||
      readUsers.length > 0 ||
      writeRoles.length > 0 ||
      writeUsers.length > 0;

    if (memberRoleIds.length > 0) {
      const roles = await this.groupRoleRepo.find({
        where: { id: In(memberRoleIds), groupId },
      });
      const sortedRoles = roles.sort((a, b) => {
        const aPriority = Math.max(a.hierarchyPriority ?? a.priority ?? 1, 1);
        const bPriority = Math.max(b.hierarchyPriority ?? b.priority ?? 1, 1);
        return aPriority - bPriority;
      });

      const configuredRole = sortedRoles.find(
        (role) =>
          hiddenFromRoles.includes(role.id) ||
          writeRoles.includes(role.id) ||
          readRoles.includes(role.id) ||
          allowedRoles.includes(role.id),
      );

      if (configuredRole) {
        if (hiddenFromRoles.includes(configuredRole.id)) {
          return false;
        }
        if (
          writeRoles.includes(configuredRole.id) ||
          readRoles.includes(configuredRole.id) ||
          allowedRoles.includes(configuredRole.id)
        ) {
          return true;
        }
      }
    }

    // 3. Fallback/Default
    if (isChannelPrivate) {
      return false;
    }

    return true;
  }

  async canUserWriteToChannel(
    groupId: string,
    channelId: string,
    userId: string,
  ): Promise<boolean> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      return false;
    }

    const hasManageGroup = await this.hasPermission(
      groupId,
      userId,
      'manage_group',
    );
    if (
      member.role === GroupMemberRole.OWNER ||
      member.role === GroupMemberRole.ADMIN ||
      hasManageGroup
    ) {
      return true;
    }

    const channel = await this.conversationRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      return false;
    }

    const hasReadAccess = await this.canUserAccessChannel(
      groupId,
      channelId,
      userId,
    );
    if (!hasReadAccess) {
      return false;
    }

    // 1. User-level overrides (highest priority)
    const hiddenFromUsers = channel.hiddenFromUserIds || [];
    const readUsers = channel.readUserIds || [];
    const writeUsers = channel.writeUserIds || [];

    if (hiddenFromUsers.includes(userId)) {
      return false;
    }
    if (writeUsers.includes(userId)) {
      return true;
    }
    if (readUsers.includes(userId)) {
      // Since they are individually selected, we don't consider their roles.
      // They can write only if the channel has no write restrictions.
      const isChannelReadOnly =
        channel.isReadOnly ||
        (channel.writeRoleIds && channel.writeRoleIds.length > 0) ||
        writeUsers.length > 0;
      return !isChannelReadOnly;
    }

    // 2. Role-level evaluation (second priority)
    const memberRoleIds = member.roleIds || [];
    const hiddenFromRoles = channel.hiddenFromRoleIds || [];
    const allowedRoles = channel.allowedRoleIds || [];
    const readRoles = channel.readRoleIds || [];
    const writeRoles = channel.writeRoleIds || [];

    const isChannelReadOnly =
      channel.isReadOnly || writeRoles.length > 0 || writeUsers.length > 0;

    if (memberRoleIds.length > 0) {
      const roles = await this.groupRoleRepo.find({
        where: { id: In(memberRoleIds), groupId },
      });
      const sortedRoles = roles.sort((a, b) => {
        const aPriority = Math.max(a.hierarchyPriority ?? a.priority ?? 1, 1);
        const bPriority = Math.max(b.hierarchyPriority ?? b.priority ?? 1, 1);
        return aPriority - bPriority;
      });

      const configuredRole = sortedRoles.find(
        (role) =>
          hiddenFromRoles.includes(role.id) ||
          writeRoles.includes(role.id) ||
          readRoles.includes(role.id) ||
          allowedRoles.includes(role.id),
      );

      if (configuredRole) {
        if (hiddenFromRoles.includes(configuredRole.id)) {
          return false;
        }
        if (writeRoles.includes(configuredRole.id)) {
          return true;
        }
        if (
          readRoles.includes(configuredRole.id) ||
          allowedRoles.includes(configuredRole.id)
        ) {
          return false;
        }
      }
    }

    // 3. Fallback/Default
    return !isChannelReadOnly;
  }

  // ─── Custom Role Management ─────────────────────────────────────────────────
  async createRole(
    groupId: string,
    requesterId: string,
    name: string,
    color?: string,
    permissions?: string[],
    colorPriority?: number,
    hierarchyPriority?: number,
  ): Promise<GroupRole> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_roles',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage roles permission can manage roles',
      );
    }

    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Permission hierarchy checks
    const isPlatformAdmin = await this.isPlatformAdmin(requesterId);
    if (member.role !== GroupMemberRole.OWNER && !isPlatformAdmin) {
      const reqPriority = await this.getMemberHighestRolePriority(
        groupId,
        member,
      );
      if (hierarchyPriority !== undefined && hierarchyPriority <= reqPriority) {
        throw new ForbiddenException(
          'You cannot create a role with equal or higher authority than your own highest role',
        );
      }
      if (permissions !== undefined) {
        for (const perm of permissions) {
          const hasPerm = await this.hasPermission(groupId, requesterId, perm);
          if (!hasPerm) {
            throw new ForbiddenException(
              `You cannot assign the permission "${perm}" because you do not have it`,
            );
          }
        }
      }
    }

    let targetHierarchyPriority = hierarchyPriority;
    if (
      targetHierarchyPriority === undefined ||
      targetHierarchyPriority === 0
    ) {
      const existingRoles = await this.groupRoleRepo.find({
        where: { groupId },
      });
      if (existingRoles.length > 0) {
        targetHierarchyPriority =
          Math.max(
            ...existingRoles.map((r) =>
              Math.max(r.hierarchyPriority ?? r.priority ?? 1, 1),
            ),
          ) + 1;
      } else {
        targetHierarchyPriority = 1; // Custom roles start at 1
      }
    }

    const role = this.groupRoleRepo.create({
      groupId,
      name: name.trim(),
      color: color || '#7289da',
      permissions: permissions || [],
      priority: targetHierarchyPriority,
      colorPriority: colorPriority || 0,
      hierarchyPriority: targetHierarchyPriority,
    });
    return this.groupRoleRepo.save(role);
  }

  async updateRole(
    groupId: string,
    roleId: string,
    requesterId: string,
    name: string,
    color?: string,
    permissions?: string[],
    colorPriority?: number,
    hierarchyPriority?: number,
  ): Promise<GroupRole> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_roles',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage roles permission can manage roles',
      );
    }

    const role = await this.groupRoleRepo.findOne({
      where: { id: roleId, groupId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Permission hierarchy checks
    const isPlatformAdmin = await this.isPlatformAdmin(requesterId);
    if (member.role !== GroupMemberRole.OWNER && !isPlatformAdmin) {
      const reqPriority = await this.getMemberHighestRolePriority(
        groupId,
        member,
      );
      if (role.hierarchyPriority <= reqPriority) {
        throw new ForbiddenException(
          'You cannot edit a role with equal or higher authority than your own highest role',
        );
      }
      if (hierarchyPriority !== undefined && hierarchyPriority <= reqPriority) {
        throw new ForbiddenException(
          'You cannot set a role priority equal to or higher authority than your own highest role',
        );
      }
      if (member.roleIds && member.roleIds.includes(roleId)) {
        throw new ForbiddenException('You cannot edit your own assigned roles');
      }
      if (permissions !== undefined) {
        for (const perm of permissions) {
          const hasPerm = await this.hasPermission(groupId, requesterId, perm);
          if (!hasPerm) {
            throw new ForbiddenException(
              `You cannot assign the permission "${perm}" because you do not have it`,
            );
          }
        }
      }
    }

    role.name = name.trim();
    if (color) {
      role.color = color;
    }
    if (permissions !== undefined) {
      role.permissions = permissions;
    }
    if (colorPriority !== undefined) {
      role.colorPriority = colorPriority;
    }
    if (hierarchyPriority !== undefined) {
      role.hierarchyPriority = hierarchyPriority;
      role.priority = hierarchyPriority;
    }
    return this.groupRoleRepo.save(role);
  }

  async deleteRole(
    groupId: string,
    roleId: string,
    requesterId: string,
  ): Promise<void> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_roles',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage roles permission can manage roles',
      );
    }

    const role = await this.groupRoleRepo.findOne({
      where: { id: roleId, groupId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Permission hierarchy checks
    const isPlatformAdmin = await this.isPlatformAdmin(requesterId);
    if (member.role !== GroupMemberRole.OWNER && !isPlatformAdmin) {
      const reqPriority = await this.getMemberHighestRolePriority(
        groupId,
        member,
      );
      if (role.hierarchyPriority <= reqPriority) {
        throw new ForbiddenException(
          'You cannot delete a role with equal or higher authority than your own highest role',
        );
      }
      if (member.roleIds && member.roleIds.includes(roleId)) {
        throw new ForbiddenException(
          'You cannot delete your own assigned roles',
        );
      }
    }

    await this.groupRoleRepo.delete({ id: roleId });

    // Clean up role references in members
    const members = await this.groupMemberRepo.find({ where: { groupId } });
    for (const mem of members) {
      if (mem.roleIds && mem.roleIds.includes(roleId)) {
        mem.roleIds = mem.roleIds.filter((id) => id !== roleId);
        await this.groupMemberRepo.save(mem);
      }
    }

    // Clean up role references in channels
    const channels = await this.conversationRepo.find({ where: { groupId } });
    for (const channel of channels) {
      if (channel.allowedRoleIds && channel.allowedRoleIds.includes(roleId)) {
        channel.allowedRoleIds = channel.allowedRoleIds.filter(
          (id) => id !== roleId,
        );
        await this.conversationRepo.save(channel);
      }
    }
  }

  async reorderRoles(
    groupId: string,
    requesterId: string,
    roleIds: string[],
  ): Promise<GroupRole[]> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_roles',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage roles permission can manage roles',
      );
    }

    const roles = await this.getGroupRoles(groupId);
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    const invalidId = roleIds.some((id) => !roleMap.has(id));
    if (invalidId) {
      throw new BadRequestException('Invalid role IDs provided');
    }

    const isPlatformAdmin = await this.isPlatformAdmin(requesterId);
    if (member.role !== GroupMemberRole.OWNER && !isPlatformAdmin) {
      const reqPriority = await this.getMemberHighestRolePriority(
        groupId,
        member,
      );
      const oldRoleIds = roles.map((r) => r.id);
      for (const role of roles) {
        if (role.hierarchyPriority <= reqPriority) {
          const oldIndex = oldRoleIds.indexOf(role.id);
          const newIndex = roleIds.indexOf(role.id);
          if (newIndex !== oldIndex) {
            throw new ForbiddenException(
              `You cannot reorder roles at or above your own highest role's priority`,
            );
          }
        }
      }
    }

    for (let i = 0; i < roleIds.length; i++) {
      const roleId = roleIds[i];
      const role = roleMap.get(roleId);
      if (role) {
        role.hierarchyPriority = i + 1;
        role.priority = i + 1;
        await this.groupRoleRepo.save(role);
      }
    }

    return this.getGroupRoles(groupId);
  }

  async batchUpdateRoles(
    groupId: string,
    requesterId: string,
    rolesData: {
      id: string;
      hierarchyPriority?: number;
      colorPriority?: number;
    }[],
  ): Promise<GroupRole[]> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_roles',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage roles permission can manage roles',
      );
    }

    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const roles = await this.getGroupRoles(groupId);
    const roleMap = new Map(roles.map((r) => [r.id, r]));

    const invalidId = rolesData.some((rd) => !roleMap.has(rd.id));
    if (invalidId) {
      throw new BadRequestException('Invalid role IDs provided');
    }

    const isPlatformAdmin = await this.isPlatformAdmin(requesterId);
    if (member.role !== GroupMemberRole.OWNER && !isPlatformAdmin) {
      const reqPriority = await this.getMemberHighestRolePriority(
        groupId,
        member,
      );
      for (const rd of rolesData) {
        const role = roleMap.get(rd.id);
        if (role) {
          const hasHierarchyChanged =
            rd.hierarchyPriority !== undefined &&
            rd.hierarchyPriority !== role.hierarchyPriority;
          const hasColorChanged =
            rd.colorPriority !== undefined &&
            rd.colorPriority !== role.colorPriority;

          if (hasHierarchyChanged || hasColorChanged) {
            if (role.hierarchyPriority <= reqPriority) {
              throw new ForbiddenException(
                `You cannot edit a role with equal or higher priority (${role.hierarchyPriority}) than your own highest role's priority (${reqPriority})`,
              );
            }
            if (
              rd.hierarchyPriority !== undefined &&
              rd.hierarchyPriority <= reqPriority
            ) {
              throw new ForbiddenException(
                `You cannot set a role hierarchy priority equal to or higher than your own highest role's priority`,
              );
            }
          }
        }
      }
    }

    for (const rd of rolesData) {
      const role = roleMap.get(rd.id);
      if (role) {
        if (rd.hierarchyPriority !== undefined) {
          role.hierarchyPriority = rd.hierarchyPriority;
          role.priority = rd.hierarchyPriority;
        }
        if (rd.colorPriority !== undefined) {
          role.colorPriority = rd.colorPriority;
        }
        await this.groupRoleRepo.save(role);
      }
    }

    return this.getGroupRoles(groupId);
  }

  async getGroupRoles(groupId: string): Promise<GroupRole[]> {
    return this.groupRoleRepo.find({
      where: { groupId },
      order: {
        hierarchyPriority: 'ASC',
        colorPriority: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async assignRolesToMember(
    groupId: string,
    targetUserId: string,
    requesterId: string,
    roleIds: string[],
  ): Promise<any> {
    const requester = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!requester) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_roles',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage roles permission can assign roles',
      );
    }

    const target = await this.groupMemberRepo.findOne({
      where: { groupId, userId: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('Group member not found');
    }

    // Permission hierarchy checks
    const isPlatformAdmin = await this.isPlatformAdmin(requesterId);
    if (requester.role !== GroupMemberRole.OWNER && !isPlatformAdmin) {
      const reqPriority = await this.getMemberHighestRolePriority(
        groupId,
        requester,
      );

      // Verify roles being added/removed
      const groupRoles = await this.groupRoleRepo.find({ where: { groupId } });
      const rolesMap = new Map(groupRoles.map((r) => [r.id, r]));

      const targetCurrentRoleIds = target.roleIds || [];
      const addedRoleIds = roleIds.filter(
        (id) => !targetCurrentRoleIds.includes(id),
      );
      const removedRoleIds = targetCurrentRoleIds.filter(
        (id) => !roleIds.includes(id),
      );

      for (const roleId of addedRoleIds) {
        const role = rolesMap.get(roleId);
        if (
          role &&
          Math.max(role.hierarchyPriority ?? role.priority ?? 1, 1) <=
            reqPriority
        ) {
          throw new ForbiddenException(
            'You cannot assign a role with equal or higher authority than your own highest role',
          );
        }
      }

      for (const roleId of removedRoleIds) {
        const role = rolesMap.get(roleId);
        if (
          role &&
          Math.max(role.hierarchyPriority ?? role.priority ?? 1, 1) <=
            reqPriority
        ) {
          throw new ForbiddenException(
            'You cannot remove a role with equal or higher authority than your own highest role',
          );
        }
      }
    }

    // Verify all roleIds belong to the group
    const roles = await this.groupRoleRepo.find({ where: { groupId } });
    const groupRoleIds = roles.map((r) => r.id);
    const validRoleIds = roleIds.filter((id) => groupRoleIds.includes(id));

    target.roleIds = validRoleIds;
    const savedTarget = await this.groupMemberRepo.save(target);
    return (await this.attachProfilesToMembers([savedTarget]))[0];
  }

  async initiateOwnershipTransfer(
    groupId: string,
    requesterId: string,
    newOwnerId: string,
  ): Promise<any> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    const isPlatformAdmin = await this.isPlatformAdmin(requesterId);
    if (group.ownerId !== requesterId && !isPlatformAdmin) {
      throw new ForbiddenException(
        'Only the group owner can transfer ownership',
      );
    }

    const newOwnerMember = await this.groupMemberRepo.findOne({
      where: { groupId, userId: newOwnerId },
    });
    if (!newOwnerMember) {
      throw new NotFoundException('Target user is not a member of this group');
    }

    if (requesterId === newOwnerId) {
      throw new BadRequestException('You are already the owner of this group');
    }

    // Load new owner user details to get display name & email
    const newOwnerUser = await this.groupRepo.manager.findOne(User, {
      where: { id: newOwnerId },
    });
    if (!newOwnerUser) {
      throw new NotFoundException('Target user profile not found');
    }

    // Remove any existing transfers for this group to avoid duplication
    await this.groupOwnershipTransferRepo.delete({ groupId });

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const transfer = this.groupOwnershipTransferRepo.create({
      groupId,
      currentOwnerId: requesterId,
      newOwnerId,
      token,
      expiresAt,
    });

    await this.groupOwnershipTransferRepo.save(transfer);

    // Send accepting mail
    const displayName =
      newOwnerUser.displayName ||
      newOwnerUser.username ||
      newOwnerUser.email.split('@')[0];
    await this.emailService.sendOwnershipTransferEmail(
      newOwnerUser.email,
      displayName,
      group.name,
      token,
    );

    return { success: true };
  }

  async acceptOwnershipTransfer(token: string, userId: string): Promise<Group> {
    const transfer = await this.groupOwnershipTransferRepo.findOne({
      where: { token },
    });
    if (!transfer) {
      throw new BadRequestException('Invalid or expired transfer request');
    }

    if (transfer.expiresAt < new Date()) {
      await this.groupOwnershipTransferRepo.delete({ id: transfer.id });
      throw new BadRequestException('This transfer request has expired');
    }

    if (transfer.newOwnerId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to accept this transfer',
      );
    }

    const group = await this.groupRepo.findOne({
      where: { id: transfer.groupId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.ownerId !== transfer.currentOwnerId) {
      throw new BadRequestException('The transfer request is no longer valid');
    }

    // Perform ownership transfer
    group.ownerId = transfer.newOwnerId;
    const savedGroup = await this.groupRepo.save(group);

    // Update old owner membership role to GroupMemberRole.MEMBER
    const oldOwnerMember = await this.groupMemberRepo.findOne({
      where: { groupId: transfer.groupId, userId: transfer.currentOwnerId },
    });
    if (oldOwnerMember) {
      oldOwnerMember.role = GroupMemberRole.MEMBER;
      await this.groupMemberRepo.save(oldOwnerMember);
    }

    // Update new owner membership role to GroupMemberRole.OWNER
    const newOwnerMember = await this.groupMemberRepo.findOne({
      where: { groupId: transfer.groupId, userId: transfer.newOwnerId },
    });
    if (newOwnerMember) {
      newOwnerMember.role = GroupMemberRole.OWNER;
      await this.groupMemberRepo.save(newOwnerMember);
    }

    // Delete transfer record
    await this.groupOwnershipTransferRepo.delete({ id: transfer.id });

    // Return full updated group structure
    const fullGroup = await this.getGroupsForUser(userId);
    const updated = fullGroup.find((g) => g.id === group.id);
    return updated || savedGroup;
  }

  async getGroup(groupId: string): Promise<Group | null> {
    return this.groupRepo.findOne({ where: { id: groupId } });
  }

  // ─── Group Invite Links ──────────────────────────────────────────────────────
  async createInvite(
    groupId: string,
    creatorId: string,
    expiresIn: string,
  ): Promise<GroupInvite> {
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = await this.groupMemberRepo.findOne({
      where: { groupId, userId: creatorId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      creatorId,
      'invite_members',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'You do not have permission to invite members',
      );
    }

    let expiresAt: Date | undefined = undefined;
    if (expiresIn && expiresIn !== 'never') {
      const val = parseInt(expiresIn, 10);
      if (!isNaN(val) && val > 0) {
        const hasUnit = /[a-zA-Z]$/.test(expiresIn);
        if (hasUnit) {
          const unit = expiresIn.slice(-1);
          const num = parseInt(expiresIn.slice(0, -1), 10);
          const ms =
            unit === 'h' ? num * 3600000 : unit === 'd' ? num * 86400000 : 0;
          expiresAt = new Date(Date.now() + ms);
        } else {
          expiresAt = new Date(Date.now() + val * 1000);
        }
      }
    }

    const token = crypto.randomBytes(8).toString('hex');
    const invite = this.groupInviteRepo.create({
      groupId,
      createdBy: creatorId,
      token,
      expiresAt,
    });

    return this.groupInviteRepo.save(invite);
  }

  async listInvites(
    groupId: string,
    requesterId: string,
  ): Promise<GroupInvite[]> {
    const membership = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'invite_members',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'You do not have permission to view invite links',
      );
    }

    return this.groupInviteRepo.find({
      where: { groupId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteInvite(inviteId: string, requesterId: string): Promise<void> {
    const invite = await this.groupInviteRepo.findOne({
      where: { id: inviteId },
    });
    if (!invite) {
      throw new NotFoundException('Invite link not found');
    }

    const group = await this.getGroup(invite.groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isPlatformAdmin = await this.isPlatformAdmin(requesterId);
    const membership = await this.groupMemberRepo.findOne({
      where: { groupId: invite.groupId, userId: requesterId },
    });
    if (!membership && !isPlatformAdmin) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Only allow group owner or creator of the link to delete/revoke it
    if (
      group.ownerId !== requesterId &&
      invite.createdBy !== requesterId &&
      !isPlatformAdmin
    ) {
      throw new ForbiddenException(
        'Only the group owner or invite creator can revoke this link',
      );
    }

    await this.groupInviteRepo.delete({ id: inviteId });
  }

  async resolveInvite(token: string): Promise<Group> {
    const invite = await this.groupInviteRepo.findOne({ where: { token } });
    if (!invite) {
      throw new BadRequestException(
        '❌ This invite link is invalid or has expired',
      );
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException(
        '❌ This invite link is invalid or has expired',
      );
    }

    const group = await this.getGroup(invite.groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async acceptInvite(token: string, userId: string): Promise<Group> {
    const group = await this.resolveInvite(token);

    // Check if already a member
    const existingMember = await this.groupMemberRepo.findOne({
      where: { groupId: group.id, userId },
    });
    if (existingMember) {
      return group;
    }

    // Add member to group
    const member = this.groupMemberRepo.create({
      groupId: group.id,
      userId,
      role: GroupMemberRole.MEMBER,
    });
    await this.groupMemberRepo.save(member);

    // Get group channels
    const channels = await this.conversationRepo.find({
      where: { groupId: group.id, type: ConversationType.CHANNEL },
    });

    // Add to general channel specifically or all channels
    for (const channel of channels) {
      const existingChannelMember = await this.convMemberRepo.findOne({
        where: { conversationId: channel.id, userId },
      });
      if (!existingChannelMember) {
        await this.convMemberRepo.save(
          this.convMemberRepo.create({
            conversationId: channel.id,
            userId,
          }),
        );
      }
    }

    return group;
  }

  async createSection(
    groupId: string,
    requesterId: string,
    name: string,
    allowedRoleIds?: string[],
  ): Promise<GroupSection> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_channels',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage channels permission can manage categories',
      );
    }

    const section = this.groupSectionRepo.create({
      groupId,
      name: name.trim(),
      allowedRoleIds: allowedRoleIds || [],
    });
    return this.groupSectionRepo.save(section);
  }

  async updateSection(
    groupId: string,
    sectionId: string,
    requesterId: string,
    name?: string,
    allowedRoleIds?: string[],
    position?: number,
  ): Promise<GroupSection> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_channels',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage channels permission can manage categories',
      );
    }

    const section = await this.groupSectionRepo.findOne({
      where: { id: sectionId, groupId },
    });
    if (!section) {
      throw new NotFoundException('Category not found');
    }

    if (name !== undefined) {
      section.name = name.trim();
    }
    if (allowedRoleIds !== undefined) {
      section.allowedRoleIds = allowedRoleIds;
    }
    if (position !== undefined) {
      section.position = position;
    }

    return this.groupSectionRepo.save(section);
  }

  async deleteSection(
    groupId: string,
    sectionId: string,
    requesterId: string,
  ): Promise<void> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_channels',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage channels permission can manage categories',
      );
    }

    const section = await this.groupSectionRepo.findOne({
      where: { id: sectionId, groupId },
    });
    if (!section) {
      throw new NotFoundException('Category not found');
    }

    // Set section_id of all channels in this section to NULL
    await this.conversationRepo.update(
      { sectionId },
      { sectionId: null as any },
    );

    await this.groupSectionRepo.delete({ id: sectionId });
  }

  async getGroupSectionsForUser(
    groupId: string,
    userId: string,
  ): Promise<GroupSection[]> {
    const sections = await this.groupRepo.manager.find(GroupSection, {
      where: { groupId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
    return this.filterSectionsForUser(groupId, userId, sections);
  }

  private async filterSectionsForUser(
    groupId: string,
    userId: string,
    sections: GroupSection[],
  ): Promise<GroupSection[]> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      return [];
    }

    if (
      member.role === GroupMemberRole.OWNER ||
      member.role === GroupMemberRole.ADMIN
    ) {
      return sections;
    }

    const memberRoleIds = member.roleIds || [];

    return sections.filter((section) => {
      const allowed = section.allowedRoleIds || [];
      if (allowed.length === 0) {
        return true;
      }
      return allowed.some((roleId) => memberRoleIds.includes(roleId));
    });
  }

  async reorderSections(
    groupId: string,
    requesterId: string,
    sectionIds: string[],
  ): Promise<GroupSection[]> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_channels',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage channels permission can manage categories',
      );
    }

    await Promise.all(
      sectionIds.map(async (sectionId, index) => {
        await this.groupSectionRepo.update(
          { id: sectionId, groupId },
          { position: index },
        );
      }),
    );

    return this.getGroupSectionsForUser(groupId, requesterId);
  }

  async reorderChannels(
    groupId: string,
    requesterId: string,
    channelOrders: {
      channelId: string;
      sectionId: string | null;
      position: number;
    }[],
  ): Promise<Conversation[]> {
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const hasPerm = await this.hasPermission(
      groupId,
      requesterId,
      'manage_channels',
    );
    if (!hasPerm) {
      throw new ForbiddenException(
        'Only group owners, admins, or members with manage channels permission can manage channels',
      );
    }

    await Promise.all(
      channelOrders.map(async (order) => {
        await this.conversationRepo.update(
          { id: order.channelId, groupId },
          {
            sectionId: order.sectionId as any,
            position: order.position,
          },
        );
      }),
    );

    return this.conversationRepo.find({
      where: { groupId, type: ConversationType.CHANNEL },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async toggleGhostMode(groupId: string, userId: string): Promise<GroupMember> {
    const isPlatformAdmin = await this.isPlatformAdmin(userId);
    if (!isPlatformAdmin) {
      throw new ForbiddenException('Only platform admins can set ghost mode');
    }

    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this group');
    }

    member.isGhost = !member.isGhost;
    return this.groupMemberRepo.save(member);
  }

  async isGhostAdmin(groupId: string, userId: string): Promise<boolean> {
    const isPlatformAdmin = await this.isPlatformAdmin(userId);
    if (!isPlatformAdmin) {
      return false;
    }
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    return member?.isGhost === true;
  }

  async directAddMember(groupId: string, userId: string): Promise<any> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const existing = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    });
    if (existing) {
      throw new BadRequestException('User is already a member of this group');
    }

    const member = this.groupMemberRepo.create({
      groupId,
      userId,
      role: GroupMemberRole.MEMBER,
    });
    const saved = await this.groupMemberRepo.save(member);

    // Add to all channels
    const channels = await this.conversationRepo.find({
      where: { groupId, type: ConversationType.CHANNEL },
    });
    for (const channel of channels) {
      const existingChannelMember = await this.convMemberRepo.findOne({
        where: { conversationId: channel.id, userId },
      });
      if (!existingChannelMember) {
        await this.convMemberRepo.save(
          this.convMemberRepo.create({
            conversationId: channel.id,
            userId,
          }),
        );
      }
    }

    return (await this.attachProfilesToMembers([saved]))[0];
  }

  async getGroupForUser(groupId: string, userId: string): Promise<any | null> {
    const groups = await this.getGroupsForUser(userId);
    return groups.find((g) => g.id === groupId) || null;
  }

  async canUserSeeMember(
    groupId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (requesterId === targetUserId) {
      return true;
    }

    const targetMember = await this.groupMemberRepo.findOne({
      where: { groupId, userId: targetUserId },
    });
    if (!targetMember) {
      return false;
    }

    if (!targetMember.isGhost) {
      return true;
    }

    // Requester must be part of the group to see anyone
    const requesterMember = await this.groupMemberRepo.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!requesterMember) {
      return false;
    }

    // Check platform admin
    const requesterUser = await this.groupRepo.manager.findOne(User, {
      where: { id: requesterId },
    });
    if (requesterUser?.role === 'admin') {
      return true;
    }

    // Check group owner
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (
      group?.ownerId === requesterId ||
      requesterMember.role === GroupMemberRole.OWNER
    ) {
      return true;
    }

    // Check group admin
    if (requesterMember.role === GroupMemberRole.ADMIN) {
      return true;
    }

    return false;
  }
}
