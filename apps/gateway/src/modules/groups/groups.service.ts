import { User, Group, GroupMember, GroupMemberRole, Conversation, ConversationMember, ConversationType } from '@chat-app/database';
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

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
  ) {}

  // Helper to load profiles for group members
  private async attachProfilesToMembers(members: GroupMember[]): Promise<any[]> {
    return Promise.all(
      members.map(async (member) => {
        const user = await this.groupRepo.manager.findOne(User, {
          where: { id: member.userId },
          select: ['id', 'email', 'displayName', 'avatarUrl', 'status', 'visibility'],
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
  ): Promise<any> {
    const iconLetter = name.trim()[0]?.toUpperCase() || 'G';

    const group = this.groupRepo.create({ name: name.trim(), description, ownerId, iconLetter });
    const savedGroup = await this.groupRepo.save(group);

    // Add owner as first member with 'owner' role
    const allUserIds = [ownerId, ...memberUserIds.filter((id) => id !== ownerId)];
    const members = allUserIds.map((userId) =>
      this.groupMemberRepo.create({
        groupId: savedGroup.id,
        userId,
        role: userId === ownerId ? GroupMemberRole.OWNER : GroupMemberRole.MEMBER,
      }),
    );
    const savedMembers = await this.groupMemberRepo.save(members);
    const membersWithProfiles = await this.attachProfilesToMembers(savedMembers);

    // Create a default "general" channel
    const generalChannel = this.conversationRepo.create({
      name: 'general',
      type: ConversationType.CHANNEL,
      groupId: savedGroup.id,
    });
    const savedChannel = await this.conversationRepo.save(generalChannel);

    // Add all group members to the general channel
    const channelMembers = allUserIds.map((userId) =>
      this.convMemberRepo.create({ conversationId: savedChannel.id, userId }),
    );
    await this.convMemberRepo.save(channelMembers);

    return { ...savedGroup, members: membersWithProfiles, channels: [savedChannel] };
  }

  // ─── Get all groups a user is a member of ────────────────────────────────────
  async getGroupsForUser(userId: string): Promise<any[]> {
    const memberships = await this.groupMemberRepo.find({ where: { userId } });
    if (memberships.length === 0) {return [];}

    const groupIds = memberships.map((m) => m.groupId);
    const groups = await this.groupRepo.find({ where: { id: In(groupIds) } });

    // Load all members + channels for each group
    return Promise.all(
      groups.map(async (group) => {
        const members = await this.groupMemberRepo.find({ where: { groupId: group.id } });
        const membersWithProfiles = await this.attachProfilesToMembers(members);
        const channels = await this.conversationRepo.find({
          where: { groupId: group.id, type: ConversationType.CHANNEL },
          order: { createdAt: 'ASC' },
        });
        return { ...group, members: membersWithProfiles, channels };
      }),
    );
  }

  // ─── Update an existing group's settings ──────────────────────────────────────
  async updateGroup(
    groupId: string,
    requesterId: string,
    name: string,
    description?: string,
  ): Promise<any> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {throw new NotFoundException('Group not found');}

    const requesterMembership = await this.groupMemberRepo.findOne({ where: { groupId, userId: requesterId } });
    if (!requesterMembership || requesterMembership.role !== GroupMemberRole.OWNER) {
      throw new ForbiddenException('Only the group owner can update group settings');
    }

    group.name = name.trim();
    if (description !== undefined) {
      group.description = description;
    }
    group.iconLetter = name.trim()[0]?.toUpperCase() || 'G';

    const savedGroup = await this.groupRepo.save(group);

    const members = await this.groupMemberRepo.find({ where: { groupId } });
    const membersWithProfiles = await this.attachProfilesToMembers(members);
    const channels = await this.conversationRepo.find({
      where: { groupId, type: ConversationType.CHANNEL },
      order: { createdAt: 'ASC' },
    });

    return { ...savedGroup, members: membersWithProfiles, channels };
  }

  // ─── Add members to an existing group ────────────────────────────────────────
  async addMembers(groupId: string, requesterId: string, userIds: string[]): Promise<any[]> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {throw new NotFoundException('Group not found');}

    const requesterMembership = await this.groupMemberRepo.findOne({ where: { groupId, userId: requesterId } });
    if (!requesterMembership) {throw new ForbiddenException('You are not a member of this group');}

    // Get all channels in the group
    const channels = await this.conversationRepo.find({ where: { groupId, type: ConversationType.CHANNEL } });

    const newMembers: GroupMember[] = [];
    for (const userId of userIds) {
      const existing = await this.groupMemberRepo.findOne({ where: { groupId, userId } });
      if (!existing) {
        const member = this.groupMemberRepo.create({ groupId, userId, role: GroupMemberRole.MEMBER });
        const saved = await this.groupMemberRepo.save(member);
        newMembers.push(saved);

        // Add to all existing channels
        for (const channel of channels) {
          const existingChannelMember = await this.convMemberRepo.findOne({
            where: { conversationId: channel.id, userId },
          });
          if (!existingChannelMember) {
            await this.convMemberRepo.save(this.convMemberRepo.create({ conversationId: channel.id, userId }));
          }
        }
      }
    }

    return this.attachProfilesToMembers(newMembers);
  }

  // ─── Remove a member from a group ────────────────────────────────────────────
  async removeMember(groupId: string, requesterId: string, targetUserId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {throw new NotFoundException('Group not found');}

    if (group.ownerId !== requesterId && requesterId !== targetUserId) {
      throw new ForbiddenException('Only the group owner can remove members');
    }

    if (targetUserId === group.ownerId) {
      throw new ForbiddenException('Cannot remove the group owner');
    }

    await this.groupMemberRepo.delete({ groupId, userId: targetUserId });

    // Remove from all channels in this group
    const channels = await this.conversationRepo.find({ where: { groupId, type: ConversationType.CHANNEL } });
    for (const channel of channels) {
      await this.convMemberRepo.delete({ conversationId: channel.id, userId: targetUserId });
    }
  }

  // ─── Create a new channel inside a group ─────────────────────────────────────
  async createChannel(groupId: string, requesterId: string, name: string): Promise<Conversation> {
    const membership = await this.groupMemberRepo.findOne({ where: { groupId, userId: requesterId } });
    if (!membership) {throw new ForbiddenException('You are not a member of this group');}

    // Check for duplicate channel name
    const existing = await this.conversationRepo.findOne({ where: { groupId, name: name.trim().toLowerCase().replace(/\s+/g, '-') } });
    if (existing) {throw new ConflictException(`Channel #${name} already exists in this group`);}

    const channel = this.conversationRepo.create({
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      type: ConversationType.CHANNEL,
      groupId,
    });
    const savedChannel = await this.conversationRepo.save(channel);

    // Add all group members to the new channel
    const groupMembers = await this.groupMemberRepo.find({ where: { groupId } });
    const channelMembers = groupMembers.map((m) =>
      this.convMemberRepo.create({ conversationId: savedChannel.id, userId: m.userId }),
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
  ): Promise<Conversation> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {throw new NotFoundException('Group not found');}

    const requesterMembership = await this.groupMemberRepo.findOne({ where: { groupId, userId: requesterId } });
    if (!requesterMembership) {throw new ForbiddenException('You are not a member of this group');}

    if (requesterMembership.role !== GroupMemberRole.OWNER && requesterMembership.role !== GroupMemberRole.ADMIN) {
      throw new ForbiddenException('Only group owners or admins can rename channels');
    }

    const channel = await this.conversationRepo.findOne({
      where: { id: channelId, groupId, type: ConversationType.CHANNEL },
    });
    if (!channel) {throw new NotFoundException('Channel not found in this group');}

    if (channel.name === 'general') {
      throw new ForbiddenException('Cannot rename the general channel');
    }

    channel.name = name.trim().toLowerCase().replace(/\s+/g, '-');
    return this.conversationRepo.save(channel);
  }

  // ─── Delete a channel inside a group ─────────────────────────────────────────
  async deleteChannel(
    groupId: string,
    channelId: string,
    requesterId: string,
  ): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {throw new NotFoundException('Group not found');}

    const requesterMembership = await this.groupMemberRepo.findOne({ where: { groupId, userId: requesterId } });
    if (!requesterMembership) {throw new ForbiddenException('You are not a member of this group');}

    if (requesterMembership.role !== GroupMemberRole.OWNER && requesterMembership.role !== GroupMemberRole.ADMIN) {
      throw new ForbiddenException('Only group owners or admins can delete channels');
    }

    const channel = await this.conversationRepo.findOne({
      where: { id: channelId, groupId, type: ConversationType.CHANNEL },
    });
    if (!channel) {throw new NotFoundException('Channel not found in this group');}

    if (channel.name === 'general') {
      throw new ForbiddenException('Cannot delete the general channel');
    }

    // Delete message history
    await this.groupRepo.manager.delete('message', { conversationId: channelId });
    // Delete memberships
    await this.convMemberRepo.delete({ conversationId: channelId });
    // Delete conversation entity
    await this.conversationRepo.delete({ id: channelId });
  }

  // ─── Delete a group and all its channels ─────────────────────────────────────
  async deleteGroup(groupId: string, requesterId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {throw new NotFoundException('Group not found');}
    if (group.ownerId !== requesterId) {throw new ForbiddenException('Only the group owner can delete the group');}

    // Delete all channel messages + memberships
    const channels = await this.conversationRepo.find({ where: { groupId } });
    for (const channel of channels) {
      await this.groupRepo.manager.delete('message', { conversationId: channel.id });
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

  // ─── Get channels in a group ──────────────────────────────────────────────────
  async getGroupChannels(groupId: string): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: { groupId, type: ConversationType.CHANNEL },
      order: { createdAt: 'ASC' },
    });
  }
}

