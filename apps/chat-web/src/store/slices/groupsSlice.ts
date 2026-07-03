import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiRequest from '../../utils/ApiRequest';

export interface GroupRole {
  id: string;
  groupId: string;
  name: string;
  color: string;
  permissions?: string[];
  priority?: number;
  colorPriority?: number;
  hierarchyPriority?: number;
  createdAt: string;
}

const sortRoles = (roles: GroupRole[]) => {
  return [...roles].sort((a, b) => {
    const hpA = a.hierarchyPriority ?? a.priority ?? 1000000;
    const hpB = b.hierarchyPriority ?? b.priority ?? 1000000;
    if (hpA !== hpB) {
      return hpA - hpB;
    }

    // Sort by colorPriority ASC, but 0/unset goes to the end
    const cpA = a.colorPriority ?? 0;
    const cpB = b.colorPriority ?? 0;
    if (cpA !== cpB) {
      if (cpA <= 0) {
        return 1;
      }
      if (cpB <= 0) {
        return -1;
      }
      return cpA - cpB;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
};

export interface GroupSection {
  id: string;
  groupId: string;
  name: string;
  position: number;
  allowedRoleIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupChannel {
  id: string;
  name: string;
  groupId: string;
  type: 'channel';
  layout: 'text' | 'bubble' | 'voice';
  allowedRoleIds?: string[];
  readRoleIds?: string[];
  writeRoleIds?: string[];
  hiddenFromUserIds?: string[];
  hiddenFromRoleIds?: string[];
  readUserIds?: string[];
  writeUserIds?: string[];
  isReadOnly?: boolean;
  notificationSetting?: 'all' | 'mention' | 'none';
  createdAt: string;
  updatedAt: string;
  sectionId?: string;
  position: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  roleIds?: string[];
  permissions?: string[];
  isMuted?: boolean;
  notificationPref?: 'all' | 'mention' | 'none';
  isGhost?: boolean;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    avatarThumbnailUrl?: string;
    status?: string;
    role?: string;
  };
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  iconLetter: string;
  avatarUrl?: string;
  avatarThumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  channels: GroupChannel[];
  roles: GroupRole[];
  sections: GroupSection[];
}

export interface GroupsState {
  groups: Group[];
  activeGroupId: string | null;
  activeChannelId: string | null;
  invites: any[];
  isInvitesLoading: boolean;
  isGeneratingInvite: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  activeVoiceChannelId: string | null;
  voiceStates: Record<
    string,
    {
      userId: string;
      groupId: string;
      channelId: string;
      isMuted: boolean;
      isDeafened: boolean;
    }
  >;
}

const initialState: GroupsState = {
  groups: [] as Group[],
  activeGroupId: null,
  activeChannelId: null,
  invites: [],
  isInvitesLoading: false,
  isGeneratingInvite: false,
  status: 'idle',
  error: null,
  activeVoiceChannelId: null,
  voiceStates: {},
};

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
      return response.data; // joined group info
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

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setActiveGroup: (state, action: PayloadAction<string | null>) => {
      state.activeGroupId = action.payload;
      // Auto-select first channel when switching groups
      if (action.payload) {
        const groupList = Array.isArray(state.groups) ? state.groups : [];
        const group = groupList.find((g) => g.id === action.payload);
        state.activeChannelId = group?.channels?.[0]?.id || null;
      } else {
        state.activeChannelId = null;
      }
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
      action: PayloadAction<{ groupId: string; channel: GroupChannel }>,
    ) => {
      const { groupId, channel } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group) {
        const exists = group.channels.some((c) => c.id === channel.id);
        if (!exists) {
          group.channels.push(channel);
        }
      }
    },
    socketChannelUpdated: (
      state,
      action: PayloadAction<{ groupId: string; channel: GroupChannel }>,
    ) => {
      const { groupId, channel } = action.payload;
      const group = state.groups.find((g) => g.id === groupId);
      if (group && Array.isArray(group.channels)) {
        const cIdx = group.channels.findIndex((c) => c.id === channel.id);
        if (cIdx !== -1) {
          group.channels[cIdx] = channel;
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
