import { createAsyncThunk } from '@reduxjs/toolkit';
import ApiRequest from '../../utils/ApiRequest';
import type {
  Group,
  GroupChannel,
  GroupMember,
  GroupRole,
  GroupSection,
} from './groupsTypes';

// ── Fetch all groups for the current user ─────────────────────────────────────
export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiRequest('/groups', 'get', {}, true);
      return response.data as Group[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to load groups.',
      );
    }
  },
);

// ── Create a new group ────────────────────────────────────────────────────────
export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (
    payload: {
      name: string;
      description?: string;
      memberUserIds?: string[];
      avatarUrl?: string;
      avatarThumbnailUrl?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest('/groups', 'post', payload, true);
      return response.data as Group;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to create group.',
      );
    }
  },
);

// ── Update a group ────────────────────────────────────────────────────────────
export const updateGroup = createAsyncThunk(
  'groups/updateGroup',
  async (
    payload: {
      groupId: string;
      name: string;
      description?: string;
      avatarUrl?: string;
      avatarThumbnailUrl?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}`,
        'patch',
        {
          name: payload.name,
          description: payload.description,
          avatarUrl: payload.avatarUrl,
          avatarThumbnailUrl: payload.avatarThumbnailUrl,
        },
        true,
      );
      return response.data as Group;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to update group settings.',
      );
    }
  },
);

// ── Add members to a group ────────────────────────────────────────────────────
export const addGroupMembers = createAsyncThunk(
  'groups/addGroupMembers',
  async (
    payload: { groupId: string; userIds: string[] },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/members`,
        'post',
        { userIds: payload.userIds },
        true,
      );
      return { groupId: payload.groupId, members: response.data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to add members.',
      );
    }
  },
);

// ── Create a channel inside a group ──────────────────────────────────────────
export const createChannel = createAsyncThunk(
  'groups/createChannel',
  async (
    payload: {
      groupId: string;
      name: string;
      layout?: 'text' | 'bubble' | 'voice';
      allowedRoleIds?: string[];
      sectionId?: string;
      readRoleIds?: string[];
      writeRoleIds?: string[];
      hiddenFromUserIds?: string[];
      hiddenFromRoleIds?: string[];
      readUserIds?: string[];
      writeUserIds?: string[];
      denyWriteRoleIds?: string[];
      denyWriteUserIds?: string[];
      isReadOnly?: boolean;
      notificationSetting?: 'all' | 'mention' | 'none';
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/channels`,
        'post',
        {
          name: payload.name,
          layout: payload.layout || 'text',
          allowedRoleIds: payload.allowedRoleIds || [],
          sectionId: payload.sectionId,
          readRoleIds: payload.readRoleIds || [],
          writeRoleIds: payload.writeRoleIds || [],
          hiddenFromUserIds: payload.hiddenFromUserIds || [],
          hiddenFromRoleIds: payload.hiddenFromRoleIds || [],
          readUserIds: payload.readUserIds || [],
          writeUserIds: payload.writeUserIds || [],
          denyWriteRoleIds: payload.denyWriteRoleIds || [],
          denyWriteUserIds: payload.denyWriteUserIds || [],
          isReadOnly: payload.isReadOnly || false,
          notificationSetting: payload.notificationSetting || 'all',
        },
        true,
      );
      return {
        groupId: payload.groupId,
        channel: response.data as GroupChannel,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to create channel.',
      );
    }
  },
);

// ── Update a channel name ──────────────────────────────────────────────────────
export const updateChannel = createAsyncThunk(
  'groups/updateChannel',
  async (
    payload: {
      groupId: string;
      channelId: string;
      name: string;
      allowedRoleIds?: string[];
      readRoleIds?: string[];
      writeRoleIds?: string[];
      hiddenFromUserIds?: string[];
      hiddenFromRoleIds?: string[];
      readUserIds?: string[];
      writeUserIds?: string[];
      denyWriteRoleIds?: string[];
      denyWriteUserIds?: string[];
      isReadOnly?: boolean;
      notificationSetting?: 'all' | 'mention' | 'none';
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/channels/${payload.channelId}`,
        'patch',
        {
          name: payload.name,
          allowedRoleIds: payload.allowedRoleIds,
          readRoleIds: payload.readRoleIds,
          writeRoleIds: payload.writeRoleIds,
          hiddenFromUserIds: payload.hiddenFromUserIds,
          hiddenFromRoleIds: payload.hiddenFromRoleIds,
          readUserIds: payload.readUserIds,
          writeUserIds: payload.writeUserIds,
          denyWriteRoleIds: payload.denyWriteRoleIds,
          denyWriteUserIds: payload.denyWriteUserIds,
          isReadOnly: payload.isReadOnly,
          notificationSetting: payload.notificationSetting,
        },
        true,
      );
      return {
        groupId: payload.groupId,
        channel: response.data as GroupChannel,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to update channel.',
      );
    }
  },
);

// ── Delete a channel ───────────────────────────────────────────────────────────
export const deleteChannel = createAsyncThunk(
  'groups/deleteChannel',
  async (
    payload: { groupId: string; channelId: string },
    { rejectWithValue },
  ) => {
    try {
      await ApiRequest(
        `/groups/${payload.groupId}/channels/${payload.channelId}`,
        'delete',
        {},
        true,
      );
      return { groupId: payload.groupId, channelId: payload.channelId };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to delete channel.',
      );
    }
  },
);

// ── Update Group Notification Preference ──────────────────────────────────────
export const updateGroupNotificationPref = createAsyncThunk(
  'groups/updateGroupNotificationPref',
  async (
    payload: {
      groupId: string;
      userId: string;
      notificationPref: 'all' | 'mention' | 'none';
    },
    { rejectWithValue },
  ) => {
    try {
      await ApiRequest(
        `/groups/${payload.groupId}/notification-pref`,
        'put',
        { notificationPref: payload.notificationPref },
        true,
      );
      return {
        groupId: payload.groupId,
        userId: payload.userId,
        notificationPref: payload.notificationPref,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to update group notification preference.',
      );
    }
  },
);

// ── Remove a member (kick or leave) ───────────────────────────────────────────
export const removeGroupMember = createAsyncThunk(
  'groups/removeMember',
  async (
    payload: { groupId: string; userId: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as {
        auth: { user: { id: string } | null };
      };
      await ApiRequest(
        `/groups/${payload.groupId}/members/${payload.userId}`,
        'delete',
        {},
        true,
      );
      const isCurrentUser = state.auth.user?.id === payload.userId;
      return {
        groupId: payload.groupId,
        userId: payload.userId,
        isCurrentUser,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to remove member.',
      );
    }
  },
);

// ── Delete a group ────────────────────────────────────────────────────────────
export const deleteGroup = createAsyncThunk(
  'groups/deleteGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      await ApiRequest(`/groups/${groupId}`, 'delete', {}, true);
      return groupId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to delete group.',
      );
    }
  },
);

// ── Fetch active invite links for a group ─────────────────────────────────────
export const fetchGroupInvites = createAsyncThunk(
  'groups/fetchGroupInvites',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        `/groups/${groupId}/invites`,
        'get',
        {},
        true,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to load invites.',
      );
    }
  },
);

// ── Create a new group invite link ────────────────────────────────────────────
export const createGroupInvite = createAsyncThunk(
  'groups/createGroupInvite',
  async (
    payload: { groupId: string; expiresIn: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/invites`,
        'post',
        { expiresIn: payload.expiresIn },
        true,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to generate invite link.',
      );
    }
  },
);

// ── Revoke an invite link ─────────────────────────────────────────────────────
export const revokeGroupInvite = createAsyncThunk(
  'groups/revokeGroupInvite',
  async (
    payload: { groupId: string; inviteId: string },
    { rejectWithValue },
  ) => {
    try {
      await ApiRequest(
        `/groups/${payload.groupId}/invites/${payload.inviteId}`,
        'delete',
        {},
        true,
      );
      return payload.inviteId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to revoke invite link.',
      );
    }
  },
);

// ── Resolve an invite token to get group details ──────────────────────────────
export const resolveGroupInvite = createAsyncThunk(
  'groups/resolveGroupInvite',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        `/groups/invite/resolve/${token}`,
        'get',
        {},
        true,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'This invite link is invalid or has expired.',
      );
    }
  },
);

// ── Accept group invite (join the group) ──────────────────────────────────────
export const acceptGroupInvite = createAsyncThunk(
  'groups/acceptGroupInvite',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        `/groups/invite/accept/${token}`,
        'post',
        {},
        true,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to join group.',
      );
    }
  },
);

// ── Fetch roles for a group ───────────────────────────────────────────────────
export const fetchGroupRoles = createAsyncThunk(
  'groups/fetchGroupRoles',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        `/groups/${groupId}/roles`,
        'get',
        {},
        true,
      );
      return { groupId, roles: response.data as GroupRole[] };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to load roles.',
      );
    }
  },
);

// ── Create a group role ───────────────────────────────────────────────────────
export const createGroupRole = createAsyncThunk(
  'groups/createGroupRole',
  async (
    payload: {
      groupId: string;
      name: string;
      color?: string;
      permissions?: string[];
      colorPriority?: number;
      hierarchyPriority?: number;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/roles`,
        'post',
        {
          name: payload.name,
          color: payload.color,
          permissions: payload.permissions,
          colorPriority: payload.colorPriority,
          hierarchyPriority: payload.hierarchyPriority,
        },
        true,
      );
      return { groupId: payload.groupId, role: response.data as GroupRole };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to create role.',
      );
    }
  },
);

// ── Update a group role ───────────────────────────────────────────────────────
export const updateGroupRole = createAsyncThunk(
  'groups/updateGroupRole',
  async (
    payload: {
      groupId: string;
      roleId: string;
      name: string;
      color?: string;
      permissions?: string[];
      colorPriority?: number;
      hierarchyPriority?: number;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/roles/${payload.roleId}`,
        'patch',
        {
          name: payload.name,
          color: payload.color,
          permissions: payload.permissions,
          colorPriority: payload.colorPriority,
          hierarchyPriority: payload.hierarchyPriority,
        },
        true,
      );
      return { groupId: payload.groupId, role: response.data as GroupRole };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to update role.',
      );
    }
  },
);

// ── Delete a group role ───────────────────────────────────────────────────────
export const deleteGroupRole = createAsyncThunk(
  'groups/deleteGroupRole',
  async (payload: { groupId: string; roleId: string }, { rejectWithValue }) => {
    try {
      await ApiRequest(
        `/groups/${payload.groupId}/roles/${payload.roleId}`,
        'delete',
        {},
        true,
      );
      return { groupId: payload.groupId, roleId: payload.roleId };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to delete role.',
      );
    }
  },
);

// ── Reorder group roles ──────────────────────────────────────────────────────
export const reorderGroupRoles = createAsyncThunk(
  'groups/reorderGroupRoles',
  async (
    payload: {
      groupId: string;
      roleIds: string[];
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/roles/reorder`,
        'post',
        { roleIds: payload.roleIds },
        true,
      );
      return { groupId: payload.groupId, roles: response.data as GroupRole[] };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to reorder roles.',
      );
    }
  },
);

// ── Batch update group roles priorities ──────────────────────────────────────
export const batchUpdateGroupRoles = createAsyncThunk(
  'groups/batchUpdateGroupRoles',
  async (
    payload: {
      groupId: string;
      roles: {
        id: string;
        hierarchyPriority?: number;
        colorPriority?: number;
      }[];
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/roles/batch`,
        'post',
        { roles: payload.roles },
        true,
      );
      return { groupId: payload.groupId, roles: response.data as GroupRole[] };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to batch update roles.',
      );
    }
  },
);

// ── Assign roles to member ─────────────────────────────────────────────────────
export const assignMemberRoles = createAsyncThunk(
  'groups/assignMemberRoles',
  async (
    payload: { groupId: string; userId: string; roleIds: string[] },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/members/${payload.userId}/roles`,
        'post',
        { roleIds: payload.roleIds },
        true,
      );
      return {
        groupId: payload.groupId,
        userId: payload.userId,
        roleIds: payload.roleIds,
        member: response.data as GroupMember,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to assign roles to member.',
      );
    }
  },
);

// ── Create a section inside a group ──────────────────────────────────────────
export const createSection = createAsyncThunk(
  'groups/createSection',
  async (
    payload: {
      groupId: string;
      name: string;
      allowedRoleIds?: string[];
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/sections`,
        'post',
        {
          name: payload.name,
          allowedRoleIds: payload.allowedRoleIds || [],
        },
        true,
      );
      return {
        groupId: payload.groupId,
        section: response.data as GroupSection,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to create category.',
      );
    }
  },
);

// ── Update a section inside a group ──────────────────────────────────────────
export const updateSection = createAsyncThunk(
  'groups/updateSection',
  async (
    payload: {
      groupId: string;
      sectionId: string;
      name: string;
      allowedRoleIds?: string[];
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/sections/${payload.sectionId}`,
        'patch',
        {
          name: payload.name,
          allowedRoleIds: payload.allowedRoleIds,
        },
        true,
      );
      return {
        groupId: payload.groupId,
        section: response.data as GroupSection,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to update category.',
      );
    }
  },
);

// ── Delete a section inside a group ──────────────────────────────────────────
export const deleteSection = createAsyncThunk(
  'groups/deleteSection',
  async (
    payload: {
      groupId: string;
      sectionId: string;
    },
    { rejectWithValue },
  ) => {
    try {
      await ApiRequest(
        `/groups/${payload.groupId}/sections/${payload.sectionId}`,
        'delete',
        {},
        true,
      );
      return { groupId: payload.groupId, sectionId: payload.sectionId };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to delete category.',
      );
    }
  },
);

// ── Reorder sections inside a group ──────────────────────────────────────────
export const reorderSections = createAsyncThunk(
  'groups/reorderSections',
  async (
    payload: {
      groupId: string;
      sectionIds: string[];
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/sections/reorder`,
        'post',
        { sectionIds: payload.sectionIds },
        true,
      );
      return {
        groupId: payload.groupId,
        sections: response.data as GroupSection[],
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to reorder categories.',
      );
    }
  },
);

// ── Reorder channels inside a group ──────────────────────────────────────────
export const reorderChannels = createAsyncThunk(
  'groups/reorderChannels',
  async (
    payload: {
      groupId: string;
      channelOrders: {
        channelId: string;
        sectionId: string | null;
        position: number;
      }[];
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        `/groups/${payload.groupId}/channels/reorder`,
        'post',
        { channelOrders: payload.channelOrders },
        true,
      );
      return {
        groupId: payload.groupId,
        channels: response.data as GroupChannel[],
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to reorder channels.',
      );
    }
  },
);
