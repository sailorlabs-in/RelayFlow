import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import { PrintLog } from '../utils/logger';
import { showToast } from '../components/toast';

import { logoutUser } from './slices/authSlice';
import type { Message } from './slices/chatSlice';
import {
  socketReceiveMessage,
  socketUpdatePresence,
  socketUpdateUserStatus,
  socketUpdateTyping,
  socketDeleteMessage,
  socketRemoveConversation,
  fetchConversations,
  socketMarkMessagesAsRead,
} from './slices/chatSlice';
import type { Group } from './slices/groupsSlice';
import {
  socketGroupCreated,
  socketGroupUpdated,
  socketGroupDeleted,
  socketGroupMemberAdded,
  socketGroupMemberRemoved,
  socketChannelCreated,
  socketChannelUpdated,
  socketChannelDeleted,
} from './slices/groupsSlice';

import { SOCKET_URL } from '../constants/config';
import { store } from './index';

class SocketManager {
  private socket: Socket | null = null;
  private connectErrorCount = 0;

  connect(token: string) {
    if (this.socket) {
      PrintLog('🔌 Socket already connected or connecting.');
      return;
    }

    PrintLog('🔌 Connecting to WebSocket server:', SOCKET_URL);
    this.connectErrorCount = 0;

    // Secure custom handshake options for multi-transport (polling and websockets) browser compatibility
    const bearerToken = `Bearer ${token}`;
    this.socket = io(SOCKET_URL, {
      extraHeaders: {
        Authorization: bearerToken,
      },
      auth: {
        token: bearerToken,
      },
      query: {
        token: bearerToken,
      },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // -------------------------------------------------------------
    // Register Real-time Listeners
    // -------------------------------------------------------------
    this.socket.on('connect', () => {
      PrintLog('✔ Socket successfully connected with ID:', this.socket?.id);
      this.connectErrorCount = 0;

      // Auto-broadcast manual status upon connection/reconnection to sync with server presence
      const state = store.getState() as { auth: { user: any } };
      if (state.auth?.user) {
        const manualStatus = state.auth.user.status || 'online';
        this.updateStatus(manualStatus, 'online');
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.connectErrorCount++;
      if (this.connectErrorCount >= 3) {
        showToast.error('unable to connects the server');
        this.disconnect();
        store.dispatch(logoutUser());
        this.connectErrorCount = 0;
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('❌ Socket disconnected. Reason:', reason);
    });

    // Handle new message arrival
    this.socket.on('message.new', (message: Message) => {
      PrintLog('💬 Socket message.new event received:', message);
      store.dispatch(socketReceiveMessage(message));

      // Keep conversations in sync: fetch list if it's a new conversation thread
      const state = store.getState() as {
        chat: any;
        auth: { user: any };
        groups: { groups: any[] };
      };
      if (state.chat && state.chat.conversations && state.auth.user) {
        // Bypass if this is a group channel message
        const isChannel = state.groups?.groups?.some((g) =>
          g.channels?.some((c: any) => c.id === message.conversationId),
        );
        if (isChannel) {
          return;
        }

        const exists = state.chat.conversations.some(
          (c: any) => c.id === message.conversationId,
        );
        if (!exists) {
          store.dispatch(fetchConversations(state.auth.user.id));
        }
      }
    });

    // Handle messages read notification
    this.socket.on(
      'messages.read',
      (data: { conversationId: string; readBy: string }) => {
        PrintLog('📖 Socket messages.read event received:', data);
        store.dispatch(socketMarkMessagesAsRead(data));
      },
    );

    // Handle online status broadcasts
    this.socket.on('user.online', (data: { userId: string }) => {
      PrintLog('🟢 User came online:', data.userId);
      store.dispatch(
        socketUpdatePresence({ userId: data.userId, isOnline: true }),
      );
    });

    this.socket.on('user.offline', (data: { userId: string }) => {
      PrintLog('🔴 User went offline:', data.userId);
      store.dispatch(
        socketUpdatePresence({ userId: data.userId, isOnline: false }),
      );
    });

    // Handle presence synchronization for newly connected socket
    this.socket.on(
      'user.presence.sync',
      (data: { onlineUserIds: string[] }) => {
        PrintLog('🟢 Presence sync received:', data.onlineUserIds);
        data.onlineUserIds.forEach((userId) => {
          store.dispatch(socketUpdatePresence({ userId, isOnline: true }));
        });
      },
    );

    // Handle typing indicators
    this.socket.on(
      'typing.started',
      (data: { conversationId: string; userId: string }) => {
        store.dispatch(
          socketUpdateTyping({
            conversationId: data.conversationId,
            userId: data.userId,
            isTyping: true,
          }),
        );
      },
    );

    this.socket.on(
      'typing.stopped',
      (data: { conversationId: string; userId: string }) => {
        store.dispatch(
          socketUpdateTyping({
            conversationId: data.conversationId,
            userId: data.userId,
            isTyping: false,
          }),
        );
      },
    );

    // Handle real-time conversation deletion (when the other participant removes the thread)
    this.socket.on(
      'conversation.deleted',
      (data: {
        conversationId: string;
        deletedBy?: string;
        deletedById?: string;
      }) => {
        PrintLog('🗑️ Socket conversation.deleted event received:', data);

        const state = store.getState() as { auth: { user: any } };
        const currentUserId = state.auth?.user?.id;

        if (
          data.deletedById &&
          currentUserId &&
          data.deletedById !== currentUserId
        ) {
          showToast.warning(
            `${data.deletedBy || 'Someone'} removed all messages with you.`,
          );
        }

        store.dispatch(socketRemoveConversation(data.conversationId));
      },
    );

    // Handle real-time message deletion
    this.socket.on(
      'message.deleted',
      (data: { messageId: string; conversationId: string }) => {
        PrintLog('🗑️ Socket message.deleted event received:', data);
        store.dispatch(socketDeleteMessage(data));
      },
    );

    // Handle granular presence/status changes broadcast by the server
    this.socket.on(
      'user.status.changed',
      (data: { userId: string; status: string; autoStatus?: string }) => {
        PrintLog(
          `🟡 User status changed: ${data.userId} -> ${data.status} (autoStatus: ${data.autoStatus})`,
        );
        store.dispatch(
          socketUpdateUserStatus({
            userId: data.userId,
            status: data.status,
            autoStatus: data.autoStatus,
          }),
        );
      },
    );

    // Handle initial presence sync (includes status strings)
    this.socket.on(
      'user.presence.full.sync',
      (data: {
        users: { userId: string; status: string; autoStatus?: string }[];
      }) => {
        PrintLog('🟢 Full presence sync received:', data.users.length, 'users');
        data.users.forEach(({ userId, status, autoStatus }) => {
          store.dispatch(
            socketUpdateUserStatus({ userId, status, autoStatus }),
          );
        });
      },
    );

    // ── Group / Server socket events ─────────────────────────────────────────
    this.socket.on('group.created', (group: Group) => {
      PrintLog('🏠 Socket group.created:', group.id);
      store.dispatch(socketGroupCreated(group));
    });

    this.socket.on('group.updated', (group: Group) => {
      PrintLog('🏠 Socket group.updated:', group.id);
      store.dispatch(socketGroupUpdated(group));
    });

    this.socket.on('group.deleted', (data: { groupId: string }) => {
      PrintLog('🗑️ Socket group.deleted:', data.groupId);
      store.dispatch(socketGroupDeleted(data.groupId));
      showToast.warning('A group you were in has been deleted.');
    });

    this.socket.on(
      'group.member.added',
      (data: { groupId: string; group: Group }) => {
        PrintLog('👤 Socket group.member.added:', data.groupId);
        store.dispatch(socketGroupMemberAdded(data));
      },
    );

    this.socket.on('group.member.removed', (data: { groupId: string }) => {
      PrintLog('👤 Socket group.member.removed:', data.groupId);
      store.dispatch(socketGroupMemberRemoved(data));
      showToast.warning('You were removed from a group.');
    });

    this.socket.on(
      'group.channel.created',
      (data: { groupId: string; channel: any }) => {
        PrintLog('📢 Socket group.channel.created:', data.channel.id);
        store.dispatch(socketChannelCreated(data));
      },
    );

    this.socket.on(
      'group.channel.updated',
      (data: { groupId: string; channel: any }) => {
        PrintLog('📢 Socket group.channel.updated:', data.channel.id);
        store.dispatch(socketChannelUpdated(data));
      },
    );

    this.socket.on(
      'group.channel.deleted',
      (data: { groupId: string; channelId: string }) => {
        PrintLog('📢 Socket group.channel.deleted:', data.channelId);
        store.dispatch(socketChannelDeleted(data));
      },
    );
  }

  // -------------------------------------------------------------
  // Emitters
  // -------------------------------------------------------------
  joinConversation(conversationId: string) {
    if (this.socket?.connected) {
      PrintLog(`📡 Emitting join.conversation for room: ${conversationId}`);
      this.socket.emit('join.conversation', { conversationId });
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
      PrintLog(`📡 Emitting leave.conversation for room: ${conversationId}`);
      this.socket.emit('leave.conversation', { conversationId });
    }
  }

  sendMessage(conversationId: string, content: string) {
    if (this.socket?.connected) {
      PrintLog(`📡 Emitting send.message for room ${conversationId}:`, content);
      this.socket.emit('send.message', { conversationId, content });
    } else {
      console.error('❌ Cannot send message: Socket is not connected');
      showToast.error('Cannot send message: Socket is not connected');
      this.disconnect();
      setTimeout(() => {
        store.dispatch(logoutUser());
      }, 3000);
    }
  }

  startTyping(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing.started', { conversationId });
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing.stopped', { conversationId });
    }
  }

  deleteMessage(messageId: string, conversationId: string) {
    if (this.socket?.connected) {
      PrintLog(
        `📡 Emitting delete.message for messageId=${messageId} in conversationId=${conversationId}`,
      );
      this.socket.emit('delete.message', { messageId, conversationId });
    }
  }

  /**
   * Emit a manual status update to the server.
   * status: 'online' | 'away' | 'dnd' | 'offline'
   * autoStatus?: 'online' | 'away'
   */
  updateStatus(status: string, autoStatus?: string) {
    if (this.socket?.connected) {
      PrintLog(
        `📡 Emitting user.status.update: status=${status}, autoStatus=${autoStatus}`,
      );
      this.socket.emit('user.status.update', {
        status,
        autoStatus: autoStatus || 'online',
      });
    }
  }

  disconnect() {
    if (this.socket) {
      PrintLog('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectErrorCount = 0;
  }
}

export const socketManager = new SocketManager();
