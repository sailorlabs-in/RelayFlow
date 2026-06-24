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
  socketUpdateMessage,
  socketRemoveConversation,
  fetchConversations,
  socketMarkMessagesAsRead,
  socketReceiveFriendRequest,
  socketFriendRequestAccepted,
  socketFriendRequestDeclined,
  socketFriendRemoved,
  setActiveConversation,
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
  setActiveChannel,
  localSetSelfVoiceChannel,
} from './slices/groupsSlice';

import { SOCKET_URL } from '../constants/config';
import { store } from './index';

class SocketManager {
  private socket: Socket | null = null;
  private token: string | null = null;
  private isReconnecting = false;
  private listenersRegistered = false;

  connect(token: string) {
    if (this.socket) {
      PrintLog('🔌 Socket already connected or connecting.');
      return;
    }

    PrintLog('🔌 Connecting to WebSocket server:', SOCKET_URL);

    this.token = token;
    this.registerFocusListeners();

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
      reconnection: false, // Control reconnection manually
    });

    // -------------------------------------------------------------
    // Register Real-time Listeners
    // -------------------------------------------------------------
    this.socket.on('connect', () => {
      PrintLog('✔ Socket successfully connected with ID:', this.socket?.id);

      // Auto-broadcast manual status upon connection/reconnection to sync with server presence
      const state = store.getState() as {
        auth: { user: any };
        chat: { activeConversationId: string | null };
      };
      if (state.auth?.user) {
        const manualStatus = state.auth.user.status || 'online';
        this.updateStatus(manualStatus, 'online');
      }

      // Rejoin active conversation room to ensure real-time read receipt tracking succeeds
      if (
        state.chat?.activeConversationId &&
        state.chat.activeConversationId !== 'friends'
      ) {
        PrintLog(
          `📡 Rejoining active conversation room: ${state.chat.activeConversationId}`,
        );
        this.joinConversation(state.chat.activeConversationId);
      }
    });

    this.socket.on('connect_error', (error) => {
      PrintLog('❌ Socket connection error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      PrintLog('❌ Socket disconnected. Reason:', reason);
      // If disconnected due to network/server issue (not user manual logout)
      if (reason !== 'io client disconnect') {
        if (typeof document !== 'undefined' && document.hasFocus()) {
          this.reconnectWithRetry();
        } else {
          PrintLog(
            '❌ Disconnected, but site not in focus. Reconnection will trigger on focus.',
          );
        }
      }
    });

    // Handle new message arrival
    this.socket.on('message.new', (message: Message) => {
      PrintLog('💬 Socket message.new event received:', message);
      store.dispatch(socketReceiveMessage(message));

      const state = store.getState() as {
        chat: any;
        auth: { user: any };
        groups: { groups: any[] };
      };

      // Mark as read immediately if the receiver has this conversation active
      if (
        state.chat?.activeConversationId === message.conversationId &&
        state.auth?.user?.id !== message.senderId
      ) {
        PrintLog(
          `📖 Active viewer marking received message as read: ${message.id}`,
        );
        this.markMessagesAsRead(message.conversationId);
      }

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
          store.dispatch(fetchConversations());
        }
      }
    });

    // Handle messages read notification
    this.socket.on(
      'messages.read',
      (data: {
        conversationId: string;
        readBy: string;
        readByName?: string;
      }) => {
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

    // Handle real-time message editing
    this.socket.on('message.updated', (message: Message) => {
      PrintLog('📝 Socket message.updated event received:', message);
      store.dispatch(socketUpdateMessage(message));
    });

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
    });

    this.socket.on(
      'group.member.added',
      (data: { groupId: string; group: Group }) => {
        PrintLog('👤 Socket group.member.added:', data.groupId);
        store.dispatch(socketGroupMemberAdded(data));
      },
    );

    this.socket.on(
      'group.member.removed',
      (data: { groupId: string; groupName?: string; kickerRole?: string }) => {
        PrintLog('👤 Socket group.member.removed:', data.groupId);
        if (data.groupName && data.kickerRole) {
          showToast.error(
            `${data.kickerRole} kicked you out from ${data.groupName}`,
          );
        }
        store.dispatch(socketGroupMemberRemoved(data));
      },
    );

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

    this.socket.on(
      'group.role.created',
      (data: { groupId: string; role: any }) => {
        PrintLog('🏷️ Socket group.role.created:', data.role.id);
        store.dispatch(socketRoleCreated(data));
      },
    );

    this.socket.on(
      'group.role.updated',
      (data: { groupId: string; role: any }) => {
        PrintLog('🏷️ Socket group.role.updated:', data.role.id);
        store.dispatch(socketRoleUpdated(data));
      },
    );

    this.socket.on(
      'group.role.deleted',
      (data: { groupId: string; roleId: string }) => {
        PrintLog('🗑️ Socket group.role.deleted:', data.roleId);
        store.dispatch(socketRoleDeleted(data));
      },
    );

    this.socket.on(
      'group.roles.reordered',
      (data: { groupId: string; roles: any[] }) => {
        PrintLog('🏷️ Socket group.roles.reordered:', data.groupId);
        store.dispatch(socketRolesReordered(data));
      },
    );

    this.socket.on(
      'group.member.roles.updated',
      (data: {
        groupId: string;
        userId: string;
        roleIds: string[];
        member?: any;
      }) => {
        PrintLog(
          '👤 Socket group.member.roles.updated:',
          data.userId,
          data.roleIds,
        );
        store.dispatch(socketMemberRolesUpdated(data));
      },
    );

    this.socket.on(
      'group.section.created',
      (data: { groupId: string; section: any }) => {
        PrintLog('📂 Socket group.section.created:', data.section.id);
        store.dispatch(socketSectionCreated(data));
      },
    );

    this.socket.on(
      'group.section.updated',
      (data: { groupId: string; section: any }) => {
        PrintLog('📂 Socket group.section.updated:', data.section.id);
        store.dispatch(socketSectionUpdated(data));
      },
    );

    this.socket.on(
      'group.section.deleted',
      (data: { groupId: string; sectionId: string }) => {
        PrintLog('📂 Socket group.section.deleted:', data.sectionId);
        store.dispatch(socketSectionDeleted(data));
      },
    );

    this.socket.on(
      'group.sections.reordered',
      (data: { groupId: string; sections: any[] }) => {
        PrintLog('📂 Socket group.sections.reordered:', data.groupId);
        store.dispatch(socketSectionsReordered(data));
      },
    );

    this.socket.on(
      'group.channels.reordered',
      (data: { groupId: string; channels: any[] }) => {
        PrintLog('📂 Socket group.channels.reordered:', data.groupId);
        store.dispatch(socketChannelsReordered(data));
      },
    );

    // Voice channel socket events
    this.socket.on('voice.state.changed', (data: any) => {
      PrintLog('🎙 Socket voice.state.changed:', data);
      store.dispatch(socketVoiceStateChanged(data));
    });

    this.socket.on('voice.presence.sync', (data: any) => {
      PrintLog('🎙 Socket voice.presence.sync:', data);
      store.dispatch(socketVoicePresenceSync(data));
    });

    this.socket.on(
      'voice.force.disconnect',
      (data: { groupId: string; channelId: string }) => {
        PrintLog('🎙 Socket voice.force.disconnect received:', data);
        showToast.info(
          'You have been disconnected from the voice channel by an administrator.',
        );
        store.dispatch(setActiveChannel(null));
        store.dispatch(setActiveConversation(null));
        store.dispatch(localSetSelfVoiceChannel(null));
        this.leaveVoice();
      },
    );

    this.socket.on(
      'voice.signal',
      (data: { senderUserId: string; signal: any }) => {
        PrintLog('🎙 Socket voice.signal:', data.senderUserId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('voice-signal', { detail: data }),
          );
        }
      },
    );

    // Friend / relationship socket events
    this.socket.on('friend.request.received', (friendship: any) => {
      PrintLog('👤 Socket friend.request.received:', friendship.id);
      store.dispatch(socketReceiveFriendRequest(friendship));
    });

    this.socket.on('friend.request.accepted', (friendship: any) => {
      PrintLog('👤 Socket friend.request.accepted:', friendship.id);
      const state = store.getState() as { auth: { user: any } };
      const currentUserId = state.auth?.user?.id;
      if (currentUserId) {
        const isRequester = friendship.requesterId === currentUserId;
        const friend = isRequester
          ? friendship.addressee
          : friendship.requester;
        const friendName = friend?.username
          ? `@${friend.username}`
          : friend?.displayName || friend?.email.split('@')[0] || 'Someone';
        showToast.success(`You are now friends with ${friendName}!`);
        store.dispatch(
          socketFriendRequestAccepted({ friendshipId: friendship.id, friend }),
        );
      }
    });

    this.socket.on('friend.request.declined', (data: { id: string }) => {
      PrintLog('👤 Socket friend.request.declined:', data.id);
      store.dispatch(socketFriendRequestDeclined({ requestId: data.id }));
    });

    this.socket.on('friend.removed', (data: { friendId: string }) => {
      PrintLog('👤 Socket friend.removed:', data.friendId);
      store.dispatch(socketFriendRemoved({ friendId: data.friendId }));
    });

    // Start connection attempt sequence
    this.reconnectWithRetry();
  }

  private registerFocusListeners() {
    if (this.listenersRegistered || typeof window === 'undefined') {
      return;
    }
    this.listenersRegistered = true;

    const handleFocusOrVisible = () => {
      PrintLog('👁️ Window focused or became visible. Checking socket state...');
      if (
        this.token &&
        this.socket &&
        !this.socket.connected &&
        !this.isReconnecting
      ) {
        PrintLog(
          '🔌 Socket is disconnected. Triggering reconnection retry sequence.',
        );
        this.reconnectWithRetry();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocusOrVisible();
      }
    });
  }

  private singleConnectAttempt(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      if (this.socket.connected) {
        resolve(true);
        return;
      }

      const onConnect = () => {
        cleanup();
        resolve(true);
      };

      const onConnectError = (err: any) => {
        PrintLog('🔌 Single attempt connection error:', err?.message || err);
        cleanup();
        resolve(false);
      };

      const timeoutId = setTimeout(() => {
        PrintLog('🔌 Single attempt connection timeout');
        cleanup();
        resolve(false);
      }, 5000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onConnectError);
      };

      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onConnectError);

      this.socket.connect();
    });
  }

  private async reconnectWithRetry() {
    if (this.isReconnecting) {
      return;
    }
    this.isReconnecting = true;
    PrintLog('🔄 Starting reconnection retry sequence...');

    const maxAttempts = 3;
    const delayMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (this.socket?.connected) {
        PrintLog('🔌 Already connected, aborting retry sequence.');
        this.isReconnecting = false;
        return;
      }

      PrintLog(`🔌 Reconnection attempt ${attempt}/${maxAttempts}...`);

      const success = await this.singleConnectAttempt();
      if (success) {
        PrintLog(`✔ Reconnected successfully on attempt ${attempt}`);
        this.isReconnecting = false;
        return;
      }

      if (attempt < maxAttempts) {
        PrintLog(`😴 Waiting ${delayMs}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    this.isReconnecting = false;

    if (typeof document !== 'undefined' && document.hasFocus()) {
      PrintLog(
        '❌ All 3 reconnection attempts failed while site is in focus. Logging out...',
      );
      showToast.error('Unable to connect to the server. Logging out...');
      this.disconnect();
      store.dispatch(logoutUser());
    } else {
      PrintLog(
        '❌ Reconnection failed, but site is not in focus. Postponing logout until focus.',
      );
    }
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

  markMessagesAsRead(conversationId: string) {
    if (this.socket?.connected) {
      PrintLog(`📡 Emitting messages.read for room: ${conversationId}`);
      this.socket.emit('messages.read', { conversationId });
    }
  }

  sendMessage(
    conversationId: string,
    content: string,
    media?: {
      url: string;
      thumbnailUrl?: string;
      type: string;
      name: string;
      size: number;
    }[],
    parentId?: string,
  ) {
    if (this.socket?.connected) {
      PrintLog(
        `📡 Emitting send.message for room ${conversationId}:`,
        content,
        media,
        parentId,
      );
      this.socket.emit('send.message', {
        conversationId,
        content,
        media,
        parentId,
      });
    } else {
      console.error('❌ Cannot send message: Socket is not connected');
      showToast.error('Cannot send message: Socket is not connected');
      if (typeof document !== 'undefined' && document.hasFocus()) {
        this.reconnectWithRetry();
      }
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

  editMessage(messageId: string, conversationId: string, content: string) {
    if (this.socket?.connected) {
      PrintLog(
        `📡 Emitting edit.message for messageId=${messageId} in conversationId=${conversationId}`,
      );
      this.socket.emit('edit.message', { messageId, conversationId, content });
    }
  }

  toggleReaction(messageId: string, conversationId: string, emoji: string) {
    if (this.socket?.connected) {
      PrintLog(
        `📡 Emitting toggle.reaction for messageId=${messageId} in conversationId=${conversationId} with emoji=${emoji}`,
      );
      this.socket.emit('toggle.reaction', { messageId, conversationId, emoji });
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

  joinVoice(groupId: string, channelId: string) {
    if (this.socket?.connected) {
      PrintLog(
        `📡 Emitting voice.join for room: ${channelId} in group: ${groupId}`,
      );
      this.socket.emit('voice.join', { groupId, channelId });
    }
  }

  leaveVoice() {
    if (this.socket?.connected) {
      PrintLog('📡 Emitting voice.leave');
      this.socket.emit('voice.leave');
    }
  }

  updateVoiceState(isMuted: boolean, isDeafened: boolean) {
    if (this.socket?.connected) {
      PrintLog(
        `📡 Emitting voice.state.update: isMuted=${isMuted}, isDeafened=${isDeafened}`,
      );
      this.socket.emit('voice.state.update', { isMuted, isDeafened });
    }
  }

  sendVoiceSignal(targetUserId: string, signal: any) {
    if (this.socket?.connected) {
      this.socket.emit('voice.signal', { targetUserId, signal });
    }
  }

  disconnectParticipant(groupId: string, targetUserId: string) {
    if (this.socket?.connected) {
      PrintLog(
        `📡 Emitting voice.disconnect.user: targetUserId=${targetUserId} in group=${groupId}`,
      );
      this.socket.emit('voice.disconnect.user', { groupId, targetUserId });
    }
  }

  disconnect() {
    if (this.socket) {
      PrintLog('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.isReconnecting = false;
  }
}

export const socketManager = new SocketManager();
