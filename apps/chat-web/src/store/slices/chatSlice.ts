import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from '../../constants/config';

import type { User } from './authSlice';

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name?: string;
  lastMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages array
  hasMoreMessages: Record<string, boolean>; // conversationId -> hasMore
  typingUsers: Record<string, Record<string, boolean>>; // conversationId -> { userId -> isTyping }
  onlineUsers: Record<string, string>; // userId -> presence status: 'online' | 'away' | 'dnd' | 'offline'
  searchResults: User[];
  userProfiles: Record<string, User>; // userId -> user profile metadata cache
  convoRecipients: Record<string, string>; // conversationId -> recipientUserId mapping
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  hasMoreMessages: {},
  typingUsers: {},
  onlineUsers: {},
  searchResults: [],
  userProfiles: {},
  convoRecipients: {},
  status: 'idle',
  error: null,
};

// Axios configuration utility to append bearer token dynamically
const getAuthHeaders = (token: string | null) => ({
  headers: {
    Authorization: token ? `Bearer ${token}` : '',
  },
});

// Thunk to fetch conversations a user participates in
export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.get(
        `${API_URL}/chat/conversations?userId=${userId}`,
        getAuthHeaders(state.auth.accessToken),
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to load conversations.',
      );
    }
  },
);

// Thunk to fetch paginated messages for a conversation
export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (
    payload: { conversationId: string; limit?: number; offset?: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const { conversationId, limit = 50, offset = 0 } = payload;
      const response = await axios.get(
        `${API_URL}/chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
        getAuthHeaders(state.auth.accessToken),
      );
      return { conversationId, messages: response.data.data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to retrieve chat history.',
      );
    }
  },
);

// Thunk to create a new DM or group conversation
export const createConversation = createAsyncThunk(
  'chat/createConversation',
  async (
    payload: { userIds: string[]; recipient: User },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.post(
        `${API_URL}/chat/conversations`,
        { userIds: payload.userIds },
        getAuthHeaders(state.auth.accessToken),
      );
      return { conversation: response.data.data, recipient: payload.recipient };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to start conversation.',
      );
    }
  },
);

// Thunk to search for active users
export const searchUsers = createAsyncThunk(
  'chat/searchUsers',
  async (query: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.get(
        `${API_URL}/users/search?query=${query}`,
        getAuthHeaders(state.auth.accessToken),
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'User lookup failed.',
      );
    }
  },
);

// Thunk to fetch a specific user profile
export const fetchUserProfile = createAsyncThunk(
  'chat/fetchUserProfile',
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.get(
        `${API_URL}/users/${userId}`,
        getAuthHeaders(state.auth.accessToken),
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to fetch user profile.',
      );
    }
  },
);

// Thunk to delete a conversation thread
export const deleteConversation = createAsyncThunk(
  'chat/deleteConversation',
  async (conversationId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      await axios.delete(
        `${API_URL}/chat/conversations/${conversationId}`,
        getAuthHeaders(state.auth.accessToken),
      );
      return conversationId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to delete conversation.',
      );
    }
  },
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    clearChatError: (state) => {
      state.error = null;
    },
    // Reducers to merge real-time WebSocket events directly into state
    socketReceiveMessage: (state, action: PayloadAction<Message>) => {
      const msg = action.payload;
      if (!state.messages[msg.conversationId]) {
        state.messages[msg.conversationId] = [];
      }

      // Prevent duplicates in history
      const exists = state.messages[msg.conversationId].some(
        (m) => m.id === msg.id,
      );
      if (!exists) {
        // Appending to the end of message array (ordered chronologically ascending for rendering)
        // Note: API returns desc, so we reverse it when loading, then append
        state.messages[msg.conversationId].push(msg);
      }

      // Update lastMessage on the conversation object in state.conversations
      const convoIndex = state.conversations.findIndex(
        (c) => c.id === msg.conversationId,
      );
      if (convoIndex !== -1) {
        const convo = state.conversations[convoIndex];
        convo.lastMessage = msg;
        // Move to the top of the sidebar list
        state.conversations.splice(convoIndex, 1);
        state.conversations.unshift(convo);
      }
    },
    socketUpdatePresence: (
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean }>,
    ) => {
      const { userId, isOnline } = action.payload;
      // Only downgrade to offline; don't overwrite away/dnd/offline with online from a generic event
      if (!isOnline) {
        state.onlineUsers[userId] = 'offline';
      } else if (!state.onlineUsers[userId]) {
        state.onlineUsers[userId] = 'online';
      }
    },
    // Granular status update from presence.changed socket events
    socketUpdateUserStatus: (
      state,
      action: PayloadAction<{
        userId: string;
        status: string;
        autoStatus?: string;
      }>,
    ) => {
      const { userId, status, autoStatus } = action.payload;
      state.onlineUsers[userId] =
        status === 'online' ? autoStatus || 'online' : status;
    },
    socketUpdateTyping: (
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        isTyping: boolean;
      }>,
    ) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = {};
      }
      state.typingUsers[conversationId][userId] = isTyping;
    },
    socketDeleteMessage: (
      state,
      action: PayloadAction<{ messageId: string; conversationId: string }>,
    ) => {
      const { messageId, conversationId } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].filter(
          (m) => m.id !== messageId,
        );
      }

      // Update lastMessage in the conversation list if needed
      const convo = state.conversations.find((c) => c.id === conversationId);
      if (convo) {
        const convoMessages = state.messages[conversationId] || [];
        if (convoMessages.length > 0) {
          convo.lastMessage = convoMessages[convoMessages.length - 1];
        } else {
          convo.lastMessage = null;
        }
      }
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    // Handle real-time conversation deletion pushed by the server (when the other participant deletes the thread)
    socketRemoveConversation: (state, action: PayloadAction<string>) => {
      const deletedId = action.payload;
      state.conversations = state.conversations.filter(
        (c) => c.id !== deletedId,
      );
      if (state.activeConversationId === deletedId) {
        state.activeConversationId = null;
      }
      delete state.messages[deletedId];
      delete state.hasMoreMessages[deletedId];
      delete state.convoRecipients[deletedId];
    },
    socketMarkMessagesAsRead: (
      state,
      action: PayloadAction<{ conversationId: string; readBy: string }>,
    ) => {
      const { conversationId, readBy } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].map(
          (m) => {
            if (m.senderId !== readBy) {
              return { ...m, isRead: true };
            }
            return m;
          },
        );
      }
      // Update lastMessage on the conversation object
      const convo = state.conversations.find((c) => c.id === conversationId);
      if (convo && convo.lastMessage && convo.lastMessage.senderId !== readBy) {
        convo.lastMessage.isRead = true;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch conversations
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.conversations = action.payload;
        state.error = null;

        // Parse conversation members dynamically to populate convoRecipients mapping on mount
        const currentUserId = action.meta.arg;
        action.payload.forEach((convo: any) => {
          if (convo.type === 'dm' && convo.members) {
            const recipient = convo.members.find(
              (m: any) => m.userId !== currentUserId,
            );
            if (recipient) {
              state.convoRecipients[convo.id] = recipient.userId;
            }
          }
        });
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // Fetch messages
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { conversationId, messages } = action.payload;
        const limit = action.meta.arg.limit || 50;
        const offset = action.meta.arg.offset || 0;

        // Reverse messages because typeorm fetched DESC, but chat feeds display chronologically (ASC)
        const reversed = [...messages].reverse();

        if (offset === 0) {
          state.messages[conversationId] = reversed;
        } else {
          const currentMsgs = state.messages[conversationId] || [];
          const existingIds = new Set(currentMsgs.map((m) => m.id));
          const filteredReversed = reversed.filter(
            (m) => !existingIds.has(m.id),
          );
          state.messages[conversationId] = [
            ...filteredReversed,
            ...currentMsgs,
          ];
        }

        // If we received fewer messages than the limit, we know there are no more messages to load
        state.hasMoreMessages[conversationId] = messages.length === limit;
        state.error = null;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // Create conversation
    builder
      .addCase(createConversation.pending, (state) => {
        state.error = null;
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        const { conversation, recipient } = action.payload;
        const exists = state.conversations.some(
          (c) => c.id === conversation.id,
        );
        if (!exists) {
          state.conversations.unshift(conversation); // Add new convo to top of sidebar
        }
        state.activeConversationId = conversation.id;
        state.userProfiles[recipient.id] = recipient;
        state.convoRecipients[conversation.id] = recipient.id;
        state.error = null;
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Search users
    builder.addCase(
      searchUsers.fulfilled,
      (state, action: PayloadAction<User[]>) => {
        state.searchResults = action.payload;
      },
    );

    // Fetch user profile
    builder.addCase(
      fetchUserProfile.fulfilled,
      (state, action: PayloadAction<User>) => {
        const user = action.payload;
        state.userProfiles[user.id] = user;
      },
    );

    // Delete conversation thread
    builder.addCase(
      deleteConversation.fulfilled,
      (state, action: PayloadAction<string>) => {
        const deletedId = action.payload;
        state.conversations = state.conversations.filter(
          (c) => c.id !== deletedId,
        );
        if (state.activeConversationId === deletedId) {
          state.activeConversationId = null;
        }
        delete state.messages[deletedId];
        delete state.hasMoreMessages[deletedId];
        delete state.convoRecipients[deletedId];
      },
    );
  },
});

export const {
  setActiveConversation,
  clearChatError,
  socketReceiveMessage,
  socketUpdatePresence,
  socketUpdateUserStatus,
  socketUpdateTyping,
  socketDeleteMessage,
  clearSearchResults,
  socketRemoveConversation,
  socketMarkMessagesAsRead,
} = chatSlice.actions;

export default chatSlice.reducer;
