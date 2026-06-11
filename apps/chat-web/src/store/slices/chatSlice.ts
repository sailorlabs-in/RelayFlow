import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiRequest from '../../utils/ApiRequest';

import type { User } from './authSlice';

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name?: string;
  lastMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageMediaItem {
  name: string;
  thumbnailName?: string;
  url: string;
  thumbnailUrl?: string;
  type: string;
  size: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead?: boolean;
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  media?: MessageMediaItem[];
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages array
  hasMoreMessages: Record<string, boolean>; // conversationId -> hasMore
  typingUsers: Record<string, Record<string, boolean>>; // conversationId -> { userId -> isTyping }
  onlineUsers: Record<string, string>; // userId -> presence status: 'online' | 'away' | 'dnd' | 'offline'
  searchResults: User[];
  friendSearchResults: User[];
  userProfiles: Record<string, User>; // userId -> user profile metadata cache
  convoRecipients: Record<string, string>; // conversationId -> recipientUserId mapping
  friends: User[];
  pendingRequests: {
    incoming: any[];
    outgoing: any[];
  };
  /** Conversation IDs whose in-app notifications are muted by the current user (local-only). */
  mutedConversationIds: string[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

/** Load muted conversation IDs from localStorage for a given userId. */
function loadMutedConvoIds(userId?: string | null): string[] {
  if (typeof window === 'undefined' || !userId) {
    return [];
  }
  try {
    const raw = localStorage.getItem(`rf-muted-convos-${userId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  hasMoreMessages: {},
  typingUsers: {},
  onlineUsers: {},
  searchResults: [],
  friendSearchResults: [],
  userProfiles: {},
  convoRecipients: {},
  friends: [],
  pendingRequests: {
    incoming: [],
    outgoing: [],
  },
  mutedConversationIds: [],
  status: 'idle',
  error: null,
};

// Thunk to fetch conversations a user participates in
export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        `/chat/conversations?userId=${userId}`,
        'get',
        {},
        true,
      );
      return response.data;
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
    { rejectWithValue },
  ) => {
    try {
      const { conversationId, limit = 50, offset = 0 } = payload;
      const response = await ApiRequest(
        `/chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
        'get',
        {},
        true,
      );
      return { conversationId, messages: response.data };
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
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        '/chat/conversations',
        'post',
        { userIds: payload.userIds },
        true,
      );
      return { conversation: response.data, recipient: payload.recipient };
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
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        `/users/search?query=${query}`,
        'get',
        {},
        true,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'User lookup failed.',
      );
    }
  },
);

// Thunk to search for user profiles to add as friends
export const searchFriendUsers = createAsyncThunk(
  'chat/searchFriendUsers',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        `/users/search-friend?query=${query}`,
        'get',
        {},
        true,
      );
      return response.data; // array of users
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Friend search failed.',
      );
    }
  },
);

// Thunk to fetch a specific user profile
export const fetchUserProfile = createAsyncThunk(
  'chat/fetchUserProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(`/users/${userId}`, 'get', {}, true);
      return response.data;
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
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await ApiRequest(
        `/chat/conversations/${conversationId}`,
        'delete',
        {},
        true,
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

// Thunk to fetch accepted friends
export const fetchFriends = createAsyncThunk(
  'chat/fetchFriends',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiRequest('/users/friends', 'get', {}, true);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to load friends.',
      );
    }
  },
);

// Thunk to fetch pending friend requests
export const fetchPendingRequests = createAsyncThunk(
  'chat/fetchPendingRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        '/users/friends/requests',
        'get',
        {},
        true,
      );
      return response.data; // { incoming, outgoing }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to load friend requests.',
      );
    }
  },
);

// Thunk to send a friend request
export const sendFriendRequest = createAsyncThunk(
  'chat/sendFriendRequest',
  async (emailOrUsername: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        '/users/friends/request',
        'post',
        { emailOrUsername },
        true,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to send friend request.',
      );
    }
  },
);

// Thunk to accept a friend request
export const acceptFriendRequest = createAsyncThunk(
  'chat/acceptFriendRequest',
  async (requestId: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        `/users/friends/requests/${requestId}/accept`,
        'post',
        {},
        true,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to accept friend request.',
      );
    }
  },
);

// Thunk to decline/cancel a friend request
export const declineFriendRequest = createAsyncThunk(
  'chat/declineFriendRequest',
  async (requestId: string, { rejectWithValue }) => {
    try {
      await ApiRequest(
        `/users/friends/requests/${requestId}/decline`,
        'post',
        {},
        true,
      );
      return requestId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to decline friend request.',
      );
    }
  },
);

// Thunk to remove a friend
export const removeFriend = createAsyncThunk(
  'chat/removeFriend',
  async (friendId: string, { rejectWithValue }) => {
    try {
      await ApiRequest(`/users/friends/${friendId}`, 'delete', {}, true);
      return friendId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to remove friend.',
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
      if (!isOnline) {
        state.onlineUsers[userId] = 'offline';
      } else {
        const current = state.onlineUsers[userId];
        if (!current || current === 'offline') {
          state.onlineUsers[userId] = 'online';
        }
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
    socketUpdateMessage: (state, action: PayloadAction<Message>) => {
      const updatedMsg = action.payload;
      const { id, conversationId } = updatedMsg;

      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].map(
          (m) => (m.id === id ? updatedMsg : m),
        );
      }

      // Update lastMessage in the conversation list if it matches this message
      const convo = state.conversations.find((c) => c.id === conversationId);
      if (convo && convo.lastMessage?.id === id) {
        convo.lastMessage = updatedMsg;
      }
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.friendSearchResults = [];
    },
    /**
     * Load muted conversation IDs from localStorage for the signed-in user.
     * Called once after session restore / login.
     */
    loadMutedConversations: (state, action: PayloadAction<string>) => {
      state.mutedConversationIds = loadMutedConvoIds(action.payload);
    },
    /**
     * Toggle the mute state for a specific conversation thread.
     * Persists to localStorage keyed by userId so state survives refresh.
     */
    toggleMuteConversation: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>,
    ) => {
      const { conversationId, userId } = action.payload;
      const idx = state.mutedConversationIds.indexOf(conversationId);
      if (idx === -1) {
        state.mutedConversationIds.push(conversationId);
      } else {
        state.mutedConversationIds.splice(idx, 1);
      }
      // Persist to localStorage
      if (typeof window !== 'undefined' && userId) {
        try {
          localStorage.setItem(
            `rf-muted-convos-${userId}`,
            JSON.stringify(state.mutedConversationIds),
          );
        } catch {
          // Ignore storage errors
        }
      }
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
    socketReceiveFriendRequest: (state, action: PayloadAction<any>) => {
      const request = action.payload;
      if (!state.pendingRequests) {
        state.pendingRequests = { incoming: [], outgoing: [] };
      }
      const exists = state.pendingRequests.incoming.some(
        (r) => r.id === request.id,
      );
      if (!exists) {
        state.pendingRequests.incoming.push(request);
      }
    },
    socketFriendRequestAccepted: (
      state,
      action: PayloadAction<{ friendshipId: string; friend: any }>,
    ) => {
      const { friendshipId, friend } = action.payload;
      if (state.pendingRequests) {
        state.pendingRequests.incoming = state.pendingRequests.incoming.filter(
          (r) => r.id !== friendshipId,
        );
        state.pendingRequests.outgoing = state.pendingRequests.outgoing.filter(
          (r) => r.id !== friendshipId,
        );
      }
      if (!state.friends) {
        state.friends = [];
      }
      const exists = state.friends.some((f) => f.id === friend.id);
      if (!exists) {
        state.friends.push(friend);
      }
    },
    socketFriendRequestDeclined: (
      state,
      action: PayloadAction<{ requestId: string }>,
    ) => {
      const { requestId } = action.payload;
      if (state.pendingRequests) {
        state.pendingRequests.incoming = state.pendingRequests.incoming.filter(
          (r) => r.id !== requestId,
        );
        state.pendingRequests.outgoing = state.pendingRequests.outgoing.filter(
          (r) => r.id !== requestId,
        );
      }
    },
    socketFriendRemoved: (
      state,
      action: PayloadAction<{ friendId: string }>,
    ) => {
      const { friendId } = action.payload;
      if (state.friends) {
        state.friends = state.friends.filter((f) => f.id !== friendId);
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

    // Search friend users
    builder.addCase(
      searchFriendUsers.fulfilled,
      (state, action: PayloadAction<User[]>) => {
        state.friendSearchResults = action.payload;
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

    // Fetch friends
    builder.addCase(
      fetchFriends.fulfilled,
      (state, action: PayloadAction<User[]>) => {
        state.friends = action.payload;
      },
    );

    // Fetch pending requests
    builder.addCase(
      fetchPendingRequests.fulfilled,
      (state, action: PayloadAction<{ incoming: any[]; outgoing: any[] }>) => {
        state.pendingRequests = action.payload;
      },
    );

    // Send friend request
    builder.addCase(
      sendFriendRequest.fulfilled,
      (state, action: PayloadAction<any>) => {
        state.pendingRequests.outgoing.push(action.payload);
      },
    );

    // Accept friend request
    builder.addCase(
      acceptFriendRequest.fulfilled,
      (state, action: PayloadAction<any>) => {
        const acceptedRequest = action.payload;
        state.pendingRequests.incoming = state.pendingRequests.incoming.filter(
          (req) => req.id !== acceptedRequest.id,
        );
        if (acceptedRequest.requester) {
          state.friends.push(acceptedRequest.requester);
        }
      },
    );

    // Decline/Cancel friend request
    builder.addCase(
      declineFriendRequest.fulfilled,
      (state, action: PayloadAction<string>) => {
        const requestId = action.payload;
        state.pendingRequests.incoming = state.pendingRequests.incoming.filter(
          (req) => req.id !== requestId,
        );
        state.pendingRequests.outgoing = state.pendingRequests.outgoing.filter(
          (req) => req.id !== requestId,
        );
      },
    );

    // Remove friend
    builder.addCase(
      removeFriend.fulfilled,
      (state, action: PayloadAction<string>) => {
        const friendId = action.payload;
        state.friends = state.friends.filter((f) => f.id !== friendId);
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
  socketUpdateMessage,
  clearSearchResults,
  socketRemoveConversation,
  socketMarkMessagesAsRead,
  socketReceiveFriendRequest,
  socketFriendRequestAccepted,
  socketFriendRequestDeclined,
  socketFriendRemoved,
  loadMutedConversations,
  toggleMuteConversation,
} = chatSlice.actions;

export default chatSlice.reducer;
