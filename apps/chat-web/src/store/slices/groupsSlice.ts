import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type {
  Group,
  GroupChannel,
  GroupMember,
  GroupRole,
  GroupSection,
  GroupsState,
} from './groupsTypes';
import { initialGroupsState, sortRoles } from './groupsTypes';
import {
  fetchGroups,
  createGroup,
  updateGroup,
  addGroupMembers,
  createChannel,
  updateChannel,
  deleteChannel,
  updateGroupNotificationPref,
  removeGroupMember,
  deleteGroup,
  fetchGroupInvites,
  createGroupInvite,
  revokeGroupInvite,
  fetchGroupRoles,
  createGroupRole,
  updateGroupRole,
  deleteGroupRole,
  reorderGroupRoles,
  batchUpdateGroupRoles,
  assignMemberRoles,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  reorderChannels,
} from './groupsThunks';

export * from './groupsTypes';
export * from './groupsThunks';

const initialState: GroupsState = initialGroupsState;

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setActiveGroup: (state, action: PayloadAction<string | null>) => {
      state.activeGroupId = action.payload;
      // Always clear the active channel when switching groups so the user
      // lands on the empty landing page instead of auto-opening a thread.
      state.activeChannelId = null;
    },
    setActiveChannel: (state, action: PayloadAction<string | null>) => {
      state.activeChannelId = action.payload;
    },
    clearGroupsError: (state) => {
      state.error = null;
    },
    // Socket event reducers
    socketGroupCreated: (state, action: PayloadAction<Group>) => {
      const exists = state.groups.some((g) => g.id === action.payload.id);
      if (!exists) {
        state.groups.push(action.payload);
      }
    },
    socketGroupUpdated: (state, action: PayloadAction<Group>) => {
      const idx = state.groups.findIndex((g) => g.id === action.payload.id);
      if (idx !== -1) {
        const existingChannels = state.groups[idx].channels;
        state.groups[idx] = {
          ...state.groups[idx],
          ...action.payload,
          channels: action.payload.channels || existingChannels,
        };
      }
    },
    socketGroupDeleted: (state, action: PayloadAction<string>) => {
      state.groups = state.groups.filter((g) => g.id !== action.payload);
      if (state.activeGroupId === action.payload) {
        state.activeGroupId = null;
        state.activeChannelId = null;
      }
    },
    socketGroupMemberAdded: (
      state,
      action: PayloadAction<{ groupId: string; group: Group }>,
    ) => {
      const { group } = action.payload;
      const idx = state.groups.findIndex((g) => g.id === group.id);
      if (idx !== -1) {
        state.groups[idx] = group;
      } else {
        state.groups.push(group);
      }
    },
    socketGroupMemberRemoved: (
      state,
      action: PayloadAction<{ groupId: string }>,
    ) => {
      state.groups = state.groups.filter(
        (g) => g.id !== action.payload.groupId,
      );
      if (state.activeGroupId === action.payload.groupId) {
        state.activeGroupId = null;
        state.activeChannelId = null;
      }
    },
    socketGroupMemberProfileUpdated: (
      state,
      action: PayloadAction<{
        userId: string;
        displayName?: string;
        username?: string;
        avatarUrl?: string;
        avatarThumbnailUrl?: string;
      }>,
    ) => {
      const { userId, displayName, username, avatarUrl, avatarThumbnailUrl } =
        action.payload;
      // Walk every group and patch the matching member's embedded user object
      for (const group of state.groups) {
        for (const member of group.members) {
          if (member.userId === userId && member.user) {
            if (displayName !== undefined) {
              member.user.displayName = displayName;
            }
            if (username !== undefined) {
              member.user.username = username;
            }
            if (avatarUrl !== undefined) {
              member.user.avatarUrl = avatarUrl;
            }
            if (avatarThumbnailUrl !== undefined) {
              member.user.avatarThumbnailUrl = avatarThumbnailUrl;
            }
          }
        }
      }
    },
    socketChannelCreated: (
      state,
      action: PayloadAction<{
        groupId: string;
        channel: GroupChannel;
        userId?: string;
      }>,
    ) => {
      const { groupId, channel, userId } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        if (userId && !canUserAccessChannelLocal(group, channel, userId)) {
          return;
        }
        const exists = group.channels.some((c) => c.id === channel.id);
        if (!exists) {
          group.channels.push(channel);
        }
      }
    },
    socketChannelUpdated: (
      state,
      action: PayloadAction<{
        groupId: string;
        channel: GroupChannel;
        userId?: string;
      }>,
    ) => {
      const { groupId, channel, userId } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.channels)) {
        const cIdx = group.channels.findIndex((c) => c.id === channel.id);
        const canAccess = userId
          ? canUserAccessChannelLocal(group, channel, userId)
          : true;

        if (canAccess) {
          if (cIdx !== -1) {
            group.channels[cIdx] = channel;
          } else {
            group.channels.push(channel);
          }
        } else {
          if (cIdx !== -1) {
            group.channels.splice(cIdx, 1);
          }
          if (
            state.activeGroupId === groupId &&
            state.activeChannelId === channel.id
          ) {
            const remainingChannels = group.channels.filter((c) =>
              userId ? canUserAccessChannelLocal(group, c, userId) : true,
            );
            state.activeChannelId = remainingChannels[0]?.id || null;
          }
        }
      }
    },
    socketChannelDeleted: (
      state,
      action: PayloadAction<{ groupId: string; channelId: string }>,
    ) => {
      const { groupId, channelId } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.channels)) {
        group.channels = group.channels.filter((c) => c.id !== channelId);
      }
      if (
        state.activeGroupId === groupId &&
        state.activeChannelId === channelId
      ) {
        state.activeChannelId = group?.channels?.[0]?.id || null;
      }
    },
    socketRoleCreated: (
      state,
      action: PayloadAction<{ groupId: string; role: GroupRole }>,
    ) => {
      const { groupId, role } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        if (!group.roles) {
          group.roles = [];
        }
        const exists = group.roles.some((r) => r.id === role.id);
        if (!exists) {
          group.roles.push(role);
        }
        group.roles = sortRoles(group.roles);
      }
    },
    socketRoleUpdated: (
      state,
      action: PayloadAction<{ groupId: string; role: GroupRole }>,
    ) => {
      const { groupId, role } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.roles)) {
        const rIdx = group.roles.findIndex((r) => r.id === role.id);
        if (rIdx !== -1) {
          group.roles[rIdx] = role;
          group.roles = sortRoles(group.roles);
        }
      }
    },
    socketRoleDeleted: (
      state,
      action: PayloadAction<{ groupId: string; roleId: string }>,
    ) => {
      const { groupId, roleId } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        if (Array.isArray(group.roles)) {
          group.roles = group.roles.filter((r) => r.id !== roleId);
        }
        // Clean up role references in members
        if (Array.isArray(group.members)) {
          group.members = group.members.map((m) => {
            if (m.roleIds && m.roleIds.includes(roleId)) {
              return { ...m, roleIds: m.roleIds.filter((id) => id !== roleId) };
            }
            return m;
          });
        }
        // Clean up role references in channels
        if (Array.isArray(group.channels)) {
          group.channels = group.channels.map((c) => {
            if (c.allowedRoleIds && c.allowedRoleIds.includes(roleId)) {
              return {
                ...c,
                allowedRoleIds: c.allowedRoleIds.filter((id) => id !== roleId),
              };
            }
            return c;
          });
        }
      }
    },
    socketRolesReordered: (
      state,
      action: PayloadAction<{ groupId: string; roles: GroupRole[] }>,
    ) => {
      const { groupId, roles } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        group.roles = sortRoles(roles);
      }
    },
    socketMemberRolesUpdated: (
      state,
      action: PayloadAction<{
        groupId: string;
        userId: string;
        roleIds: string[];
        member?: GroupMember;
      }>,
    ) => {
      const { groupId, userId, roleIds, member } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.members)) {
        const mIdx = group.members.findIndex((m) => m.userId === userId);
        if (mIdx !== -1) {
          group.members[mIdx] = {
            ...group.members[mIdx],
            roleIds,
            ...(member || {}),
          };
        }
      }
    },
    socketSectionCreated: (
      state,
      action: PayloadAction<{ groupId: string; section: GroupSection }>,
    ) => {
      const { groupId, section } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        if (!group.sections) {
          group.sections = [];
        }
        const exists = group.sections.some((s) => s.id === section.id);
        if (!exists) {
          group.sections.push(section);
        }
      }
    },
    socketSectionUpdated: (
      state,
      action: PayloadAction<{ groupId: string; section: GroupSection }>,
    ) => {
      const { groupId, section } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.sections)) {
        const sIdx = group.sections.findIndex((s) => s.id === section.id);
        if (sIdx !== -1) {
          group.sections[sIdx] = section;
        }
      }
    },
    socketSectionDeleted: (
      state,
      action: PayloadAction<{ groupId: string; sectionId: string }>,
    ) => {
      const { groupId, sectionId } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.sections)) {
        group.sections = group.sections.filter((s) => s.id !== sectionId);
        if (Array.isArray(group.channels)) {
          group.channels = group.channels.map((c) =>
            c.sectionId === sectionId ? { ...c, sectionId: undefined } : c,
          );
        }
      }
    },
    socketSectionsReordered: (
      state,
      action: PayloadAction<{ groupId: string; sections: GroupSection[] }>,
    ) => {
      const { groupId, sections } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        group.sections = sections;
      }
    },
    socketChannelsReordered: (
      state,
      action: PayloadAction<{ groupId: string; channels: GroupChannel[] }>,
    ) => {
      const { groupId, channels } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        group.channels = channels;
      }
    },
    socketVoiceStateChanged: (
      state,
      action: PayloadAction<{
        userId: string;
        groupId: string;
        channelId: string | null;
        isMuted: boolean;
        isDeafened: boolean;
      }>,
    ) => {
      const { userId, groupId, channelId, isMuted, isDeafened } =
        action.payload;
      if (!channelId) {
        delete state.voiceStates[userId];
      } else {
        state.voiceStates[userId] = {
          userId,
          groupId,
          channelId,
          isMuted,
          isDeafened,
        };
      }
    },
    socketVoicePresenceSync: (
      state,
      action: PayloadAction<{
        voiceStates: {
          userId: string;
          groupId: string;
          channelId: string;
          isMuted: boolean;
          isDeafened: boolean;
        }[];
      }>,
    ) => {
      const newStates: Record<string, any> = {};
      action.payload.voiceStates.forEach((vs) => {
        newStates[vs.userId] = vs;
      });
      state.voiceStates = newStates;
    },
    localSetSelfVoiceChannel: (state, action: PayloadAction<string | null>) => {
      state.activeVoiceChannelId = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch groups
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.groups = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // Create group
    builder
      .addCase(createGroup.fulfilled, (state, action) => {
        if (!action.payload || !action.payload.id) {
          return;
        }
        if (!Array.isArray(state.groups)) {
          state.groups = [];
        }
        const exists = state.groups.some((g) => g.id === action.payload.id);
        if (!exists) {
          state.groups.push(action.payload);
        }
        state.activeGroupId = action.payload.id;
        state.activeChannelId = action.payload.channels?.[0]?.id || null;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Update group
    builder.addCase(updateGroup.fulfilled, (state, action) => {
      const idx = state.groups.findIndex((g) => g.id === action.payload.id);
      if (idx !== -1) {
        state.groups[idx] = action.payload;
      }
    });

    // Add members
    builder.addCase(addGroupMembers.fulfilled, (state, action) => {
      const group = state.groups.find((g) => g.id === action.payload.groupId);
      if (group) {
        action.payload.members.forEach((m: any) => {
          const exists = group.members.some((mem) => mem.id === m.id);
          if (!exists) {
            group.members.push(m);
          }
        });
      }
    });

    // Create channel
    builder.addCase(createChannel.fulfilled, (state, action) => {
      const { groupId, channel } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        const exists = group.channels.some((c) => c.id === channel.id);
        if (!exists) {
          group.channels.push(channel);
        }
      }
      state.activeChannelId = channel.id;
    });

    // Update channel
    builder.addCase(updateChannel.fulfilled, (state, action) => {
      const { groupId, channel } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.channels)) {
        const cIdx = group.channels.findIndex((c) => c.id === channel.id);
        if (cIdx !== -1) {
          group.channels[cIdx] = channel;
        }
      }
    });

    // Delete channel
    builder.addCase(deleteChannel.fulfilled, (state, action) => {
      const { groupId, channelId } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.channels)) {
        group.channels = group.channels.filter((c) => c.id !== channelId);
      }
      if (
        state.activeGroupId === groupId &&
        state.activeChannelId === channelId
      ) {
        state.activeChannelId = group?.channels?.[0]?.id || null;
      }
    });

    // Remove group member
    builder.addCase(removeGroupMember.fulfilled, (state, action) => {
      const { groupId, userId, isCurrentUser } = action.payload;
      if (isCurrentUser) {
        state.groups = state.groups.filter((g) => g.id !== groupId);
        if (state.activeGroupId === groupId) {
          state.activeGroupId = null;
          state.activeChannelId = null;
        }
      } else {
        const group = state.groups.find((g) => g.id === groupId);
        if (group) {
          group.members = group.members.filter((m) => m.userId !== userId);
        }
      }
    });

    // Delete group
    builder.addCase(deleteGroup.fulfilled, (state, action) => {
      state.groups = state.groups.filter((g) => g.id !== action.payload);
      if (state.activeGroupId === action.payload) {
        state.activeGroupId = null;
        state.activeChannelId = null;
      }
    });

    // Fetch group invites
    builder
      .addCase(fetchGroupInvites.pending, (state) => {
        state.isInvitesLoading = true;
      })
      .addCase(fetchGroupInvites.fulfilled, (state, action) => {
        state.invites = action.payload || [];
        state.isInvitesLoading = false;
      })
      .addCase(fetchGroupInvites.rejected, (state) => {
        state.isInvitesLoading = false;
      });

    // Create group invite
    builder
      .addCase(createGroupInvite.pending, (state) => {
        state.isGeneratingInvite = true;
      })
      .addCase(createGroupInvite.fulfilled, (state) => {
        state.isGeneratingInvite = false;
      })
      .addCase(createGroupInvite.rejected, (state) => {
        state.isGeneratingInvite = false;
      });

    // Revoke group invite
    builder.addCase(revokeGroupInvite.fulfilled, (state, action) => {
      state.invites = state.invites.filter((inv) => inv.id !== action.payload);
    });

    // Fetch group roles
    builder.addCase(fetchGroupRoles.fulfilled, (state, action) => {
      const { groupId, roles } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        group.roles = sortRoles(roles);
      }
    });

    // Create group role
    builder.addCase(createGroupRole.fulfilled, (state, action) => {
      const { groupId, role } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        if (!group.roles) {
          group.roles = [];
        }
        const exists = group.roles.some((r) => r.id === role.id);
        if (!exists) {
          group.roles.push(role);
        }
        group.roles = sortRoles(group.roles);
      }
    });

    // Update group role
    builder.addCase(updateGroupRole.fulfilled, (state, action) => {
      const { groupId, role } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.roles)) {
        const rIdx = group.roles.findIndex((r) => r.id === role.id);
        if (rIdx !== -1) {
          group.roles[rIdx] = role;
          group.roles = sortRoles(group.roles);
        }
      }
    });

    // Reorder group roles
    builder.addCase(reorderGroupRoles.fulfilled, (state, action) => {
      const { groupId, roles } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        group.roles = sortRoles(roles);
      }
    });

    // Batch update group roles
    builder.addCase(batchUpdateGroupRoles.fulfilled, (state, action) => {
      const { groupId, roles } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        group.roles = sortRoles(roles);
      }
    });

    // Delete group role
    builder.addCase(deleteGroupRole.fulfilled, (state, action) => {
      const { groupId, roleId } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        if (Array.isArray(group.roles)) {
          group.roles = group.roles.filter((r) => r.id !== roleId);
        }
        if (Array.isArray(group.members)) {
          group.members = group.members.map((m) => {
            if (m.roleIds && m.roleIds.includes(roleId)) {
              return { ...m, roleIds: m.roleIds.filter((id) => id !== roleId) };
            }
            return m;
          });
        }
        if (Array.isArray(group.channels)) {
          group.channels = group.channels.map((c) => {
            if (c.allowedRoleIds && c.allowedRoleIds.includes(roleId)) {
              return {
                ...c,
                allowedRoleIds: c.allowedRoleIds.filter((id) => id !== roleId),
              };
            }
            return c;
          });
        }
      }
    });

    // Assign member roles
    builder.addCase(assignMemberRoles.fulfilled, (state, action) => {
      const { groupId, userId, roleIds, member } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.members)) {
        const mIdx = group.members.findIndex((m) => m.userId === userId);
        if (mIdx !== -1) {
          group.members[mIdx] = {
            ...group.members[mIdx],
            roleIds,
            ...(member || {}),
          };
        }
      }
    });

    // Update group notification preference
    builder.addCase(updateGroupNotificationPref.fulfilled, (state, action) => {
      const { groupId, userId, notificationPref } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.members)) {
        const mIdx = group.members.findIndex((m) => m.userId === userId);
        if (mIdx !== -1) {
          group.members[mIdx].notificationPref = notificationPref;
          group.members[mIdx].isMuted = notificationPref === 'none';
        }
      }
    });

    // Create section
    builder.addCase(createSection.fulfilled, (state, action) => {
      const { groupId, section } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        if (!group.sections) {
          group.sections = [];
        }
        const exists = group.sections.some((s) => s.id === section.id);
        if (!exists) {
          group.sections.push(section);
        }
      }
    });

    // Update section
    builder.addCase(updateSection.fulfilled, (state, action) => {
      const { groupId, section } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.sections)) {
        const sIdx = group.sections.findIndex((s) => s.id === section.id);
        if (sIdx !== -1) {
          group.sections[sIdx] = section;
        }
      }
    });

    // Delete section
    builder.addCase(deleteSection.fulfilled, (state, action) => {
      const { groupId, sectionId } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.sections)) {
        group.sections = group.sections.filter((s) => s.id !== sectionId);
        if (Array.isArray(group.channels)) {
          group.channels = group.channels.map((c) =>
            c.sectionId === sectionId ? { ...c, sectionId: undefined } : c,
          );
        }
      }
    });

    // Reorder sections
    builder.addCase(reorderSections.fulfilled, (state, action) => {
      const { groupId, sections } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        group.sections = sections;
      }
    });

    // Reorder channels
    builder.addCase(reorderChannels.fulfilled, (state, action) => {
      const { groupId, channels } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        group.channels = channels;
      }
    });
  },
});

export const {
  setActiveGroup,
  setActiveChannel,
  clearGroupsError,
  socketGroupCreated,
  socketGroupUpdated,
  socketGroupDeleted,
  socketGroupMemberAdded,
  socketGroupMemberRemoved,
  socketGroupMemberProfileUpdated,
  socketChannelCreated,
  socketChannelUpdated,
  socketChannelDeleted,
  socketRoleCreated,
  socketRoleUpdated,
  socketRoleDeleted,
  socketRolesReordered,
  socketMemberRolesUpdated,
  socketSectionCreated,
  socketSectionUpdated,
  socketSectionDeleted,
  socketSectionsReordered,
  socketChannelsReordered,
  socketVoiceStateChanged,
  socketVoicePresenceSync,
  localSetSelfVoiceChannel,
} = groupsSlice.actions;

export default groupsSlice.reducer;

function canUserAccessChannelLocal(
  group: Group,
  channel: GroupChannel,
  userId: string,
): boolean {
  const member = group.members.find((m) => m.userId === userId);
  if (!member) {
    return false;
  }

  // Group owner, admin, or manage_group/manage_channels bypasses visibility checks
  const hasManageGroup =
    member.permissions && member.permissions.includes('manage_group');
  const hasManageChannels =
    member.permissions && member.permissions.includes('manage_channels');

  if (
    member.role === 'owner' ||
    member.role === 'admin' ||
    member.user?.role === 'admin' ||
    hasManageGroup ||
    hasManageChannels
  ) {
    return true;
  }

  // Check parent section/category access first
  if (channel.sectionId && group.sections) {
    const section = group.sections.find((s) => s.id === channel.sectionId);
    if (
      section &&
      section.allowedRoleIds &&
      section.allowedRoleIds.length > 0
    ) {
      const allowedRoles = section.allowedRoleIds;
      const memberRoleIds = member.roleIds || [];
      const hasSectionAccess = allowedRoles.some((roleId) =>
        memberRoleIds.includes(roleId),
      );
      if (!hasSectionAccess) {
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

  if (memberRoleIds.length > 0 && group.roles) {
    const userRoles = group.roles.filter((role) =>
      memberRoleIds.includes(role.id),
    );
    const sortedRoles = [...userRoles].sort((a, b) => {
      const hpA = a.hierarchyPriority ?? a.priority ?? 1000000;
      const hpB = b.hierarchyPriority ?? b.priority ?? 1000000;
      return hpA - hpB;
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

  // 3. Everyone override (third priority)
  if (hiddenFromRoles.includes('everyone')) {
    return false;
  }
  if (
    allowedRoles.includes('everyone') ||
    readRoles.includes('everyone') ||
    writeRoles.includes('everyone')
  ) {
    return true;
  }

  // 4. Fallback/Default
  if (hiddenFromRoles.includes('everyone')) {
    return false;
  }

  return true;
}
