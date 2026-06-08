import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from '../../constants/config';

const getAuthHeaders = (token: string | null) => ({
  headers: {
    Authorization: token ? `Bearer ${token}` : '',
  },
});

export interface GroupChannel {
  id: string;
  name: string;
  groupId: string;
  type: 'channel';
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
  user?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    status?: string;
  };
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  iconLetter: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  channels: GroupChannel[];
}

export interface GroupsState {
  groups: Group[];
  activeGroupId: string | null;
  activeChannelId: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: GroupsState = {
  groups: [] as Group[],
  activeGroupId: null,
  activeChannelId: null,
  status: 'idle',
  error: null,
};

// ── Fetch all groups for the current user ─────────────────────────────────────
export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.get(
        `${API_URL}/groups`,
        getAuthHeaders(state.auth.accessToken),
      );
      return response.data.data as Group[];
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
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.post(
        `${API_URL}/groups`,
        payload,
        getAuthHeaders(state.auth.accessToken),
      );
      return response.data.data as Group;
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
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.patch(
        `${API_URL}/groups/${payload.groupId}`,
        {
          name: payload.name,
          description: payload.description,
          avatarUrl: payload.avatarUrl,
        },
        getAuthHeaders(state.auth.accessToken),
      );
      return response.data.data as Group;
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
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.post(
        `${API_URL}/groups/${payload.groupId}/members`,
        { userIds: payload.userIds },
        getAuthHeaders(state.auth.accessToken),
      );
      return { groupId: payload.groupId, members: response.data.data };
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
    payload: { groupId: string; name: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.post(
        `${API_URL}/groups/${payload.groupId}/channels`,
        { name: payload.name },
        getAuthHeaders(state.auth.accessToken),
      );
      return {
        groupId: payload.groupId,
        channel: response.data.data as GroupChannel,
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
    payload: { groupId: string; channelId: string; name: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.patch(
        `${API_URL}/groups/${payload.groupId}/channels/${payload.channelId}`,
        { name: payload.name },
        getAuthHeaders(state.auth.accessToken),
      );
      return {
        groupId: payload.groupId,
        channel: response.data.data as GroupChannel,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to rename channel.',
      );
    }
  },
);

// ── Delete a channel ───────────────────────────────────────────────────────────
export const deleteChannel = createAsyncThunk(
  'groups/deleteChannel',
  async (
    payload: { groupId: string; channelId: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      await axios.delete(
        `${API_URL}/groups/${payload.groupId}/channels/${payload.channelId}`,
        getAuthHeaders(state.auth.accessToken),
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

// ── Remove a member (kick or leave) ───────────────────────────────────────────
export const removeGroupMember = createAsyncThunk(
  'groups/removeMember',
  async (
    payload: { groupId: string; userId: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as {
        auth: { accessToken: string | null; user: { id: string } | null };
      };
      await axios.delete(
        `${API_URL}/groups/${payload.groupId}/members/${payload.userId}`,
        getAuthHeaders(state.auth.accessToken),
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
  async (groupId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      await axios.delete(
        `${API_URL}/groups/${groupId}`,
        getAuthHeaders(state.auth.accessToken),
      );
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
  socketChannelCreated,
  socketChannelUpdated,
  socketChannelDeleted,
} = groupsSlice.actions;

export default groupsSlice.reducer;
