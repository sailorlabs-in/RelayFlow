import { io, Socket } from 'socket.io-client';
import {
  socketReceiveMessage,
  socketUpdatePresence,
  socketUpdateUserStatus,
  socketUpdateTyping,
  socketRemoveConversation,
  Message,
  fetchConversations,
} from './slices/chatSlice';
import { logoutUser } from './slices/authSlice';
import { store } from './index';
import { showToast } from '../components/toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001/chat';

class SocketManager {
  private socket: Socket | null = null;
  private connectErrorCount = 0;

  connect(token: string) {
    if (this.socket) {
      console.log('🔌 Socket already connected or connecting.');
      return;
    }

    console.log('🔌 Connecting to WebSocket server:', SOCKET_URL);
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
      console.log('✔ Socket successfully connected with ID:', this.socket?.id);
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
      console.log('💬 Socket message.new event received:', message);
      store.dispatch(socketReceiveMessage(message));

      // Keep conversations in sync: fetch list if it's a new conversation thread
      const state = store.getState() as { chat: any; auth: { user: any } };
      if (state.chat && state.chat.conversations && state.auth.user) {
        const exists = state.chat.conversations.some((c: any) => c.id === message.conversationId);
        if (!exists) {
          store.dispatch(fetchConversations(state.auth.user.id));
        }
      }
    });



    // Handle online status broadcasts
    this.socket.on('user.online', (data: { userId: string }) => {
      console.log('🟢 User came online:', data.userId);
      store.dispatch(socketUpdatePresence({ userId: data.userId, isOnline: true }));
    });

    this.socket.on('user.offline', (data: { userId: string }) => {
      console.log('🔴 User went offline:', data.userId);
      store.dispatch(socketUpdatePresence({ userId: data.userId, isOnline: false }));
    });

    // Handle presence synchronization for newly connected socket
    this.socket.on('user.presence.sync', (data: { onlineUserIds: string[] }) => {
      console.log('🟢 Presence sync received:', data.onlineUserIds);
      data.onlineUserIds.forEach((userId) => {
        store.dispatch(socketUpdatePresence({ userId, isOnline: true }));
      });
    });

    // Handle typing indicators
    this.socket.on('typing.started', (data: { conversationId: string; userId: string }) => {
      store.dispatch(
        socketUpdateTyping({
          conversationId: data.conversationId,
          userId: data.userId,
          isTyping: true,
        })
      );
    });

    this.socket.on('typing.stopped', (data: { conversationId: string; userId: string }) => {
      store.dispatch(
        socketUpdateTyping({
          conversationId: data.conversationId,
          userId: data.userId,
          isTyping: false,
        })
      );
    });

    // Handle real-time conversation deletion (when the other participant removes the thread)
    this.socket.on('conversation.deleted', (data: { conversationId: string }) => {
      console.log('🗑️ Socket conversation.deleted event received:', data.conversationId);
      store.dispatch(socketRemoveConversation(data.conversationId));
    });

    // Handle granular presence/status changes broadcast by the server
    this.socket.on('user.status.changed', (data: { userId: string; status: string; autoStatus?: string }) => {
      console.log(`🟡 User status changed: ${data.userId} -> ${data.status} (autoStatus: ${data.autoStatus})`);
      store.dispatch(socketUpdateUserStatus({ userId: data.userId, status: data.status, autoStatus: data.autoStatus }));
    });

    // Handle initial presence sync (includes status strings)
    this.socket.on('user.presence.full.sync', (data: { users: { userId: string; status: string; autoStatus?: string }[] }) => {
      console.log('🟢 Full presence sync received:', data.users.length, 'users');
      data.users.forEach(({ userId, status, autoStatus }) => {
        store.dispatch(socketUpdateUserStatus({ userId, status, autoStatus }));
      });
    });
  }

  // -------------------------------------------------------------
  // Emitters
  // -------------------------------------------------------------
  joinConversation(conversationId: string) {
    if (this.socket?.connected) {
      console.log(`📡 Emitting join.conversation for room: ${conversationId}`);
      this.socket.emit('join.conversation', { conversationId });
    }
  }

  sendMessage(conversationId: string, content: string) {
    if (this.socket?.connected) {
      console.log(`📡 Emitting send.message for room ${conversationId}:`, content);
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

  /**
   * Emit a manual status update to the server.
   * status: 'online' | 'away' | 'dnd' | 'offline'
   * autoStatus?: 'online' | 'away'
   */
  updateStatus(status: string, autoStatus?: string) {
    if (this.socket?.connected) {
      console.log(`📡 Emitting user.status.update: status=${status}, autoStatus=${autoStatus}`);
      this.socket.emit('user.status.update', { status, autoStatus: autoStatus || 'online' });
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectErrorCount = 0;
  }
}

export const socketManager = new SocketManager();
