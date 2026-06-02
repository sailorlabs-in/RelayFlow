import { io, Socket } from 'socket.io-client';
import {
  socketReceiveMessage,
  socketUpdatePresence,
  socketUpdateTyping,
  socketRemoveConversation,
  Message,
  fetchConversations,
} from './slices/chatSlice';
import { store } from './index';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001/chat';

class SocketManager {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket) {
      console.log('🔌 Socket already connected or connecting.');
      return;
    }

    console.log('🔌 Connecting to WebSocket server:', SOCKET_URL);

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
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
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

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketManager = new SocketManager();
