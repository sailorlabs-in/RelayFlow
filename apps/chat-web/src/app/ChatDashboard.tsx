'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  loginUser,
  registerUser,
  logoutUser,
  clearAuthError,
  User,
} from '../store/slices/authSlice';
import {
  fetchConversations,
  fetchMessages,
  createConversation,
  searchUsers,
  setActiveConversation,
  clearSearchResults,
  fetchUserProfile,
  deleteConversation,
} from '../store/slices/chatSlice';
import { socketManager } from '../store/socketManager';
import StoreProvider from '../store/StoreProvider';

function ChatDashboardContent() {
  const dispatch = useAppDispatch();
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Redux state selectors
  const { user, accessToken, status: authStatus, error: authError } = useAppSelector((state) => state.auth);
  const {
    conversations,
    activeConversationId,
    messages,
    typingUsers,
    onlineUsers,
    searchResults,
    userProfiles,
    convoRecipients,
  } = useAppSelector((state) => state.chat);

  // Local React States
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isTypingState, setIsTypingState] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // -------------------------------------------------------------
  // Side Effect: Socket Connection & Data fetching on login
  // -------------------------------------------------------------
  useEffect(() => {
    if (accessToken && user) {
      // 1. Fetch conversations from backend
      dispatch(fetchConversations(user.id));
      
      // 2. Connect to WebSocket Gateway
      socketManager.connect(accessToken);
      
      return () => {
        // Disconnect on logout/cleanup
        socketManager.disconnect();
      };
    }
    return;
  }, [accessToken, user, dispatch]);

  // -------------------------------------------------------------
  // Side Effect: Fetch messages when active conversation changes
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeConversationId) {
      dispatch(fetchMessages({ conversationId: activeConversationId }));
      socketManager.joinConversation(activeConversationId);
    }
  }, [activeConversationId, dispatch]);

  // -------------------------------------------------------------
  // Side Effect: Auto-scroll to bottom of messages
  // -------------------------------------------------------------
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId, typingUsers]);

  // -------------------------------------------------------------
  // Resolve other users profiles for existing conversations
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeConversationId && messages[activeConversationId]) {
      const activeMsgs = messages[activeConversationId];
      // Resolve profiles of senders we don't have cached yet
      activeMsgs.forEach((msg) => {
        if (msg.senderId !== user?.id && !userProfiles[msg.senderId]) {
          dispatch(fetchUserProfile(msg.senderId));
        }
      });
    }
  }, [activeConversationId, messages, userProfiles, user, dispatch]);

  // -------------------------------------------------------------
  // Resolve user profiles for all conversation recipients (e.g. on hard refresh)
  // -------------------------------------------------------------
  useEffect(() => {
    Object.values(convoRecipients).forEach((recipientId) => {
      if (recipientId && recipientId !== user?.id && !userProfiles[recipientId]) {
        dispatch(fetchUserProfile(recipientId));
      }
    });
  }, [convoRecipients, userProfiles, user, dispatch]);

  // -------------------------------------------------------------
  // Side Effect: Fetch all active users when starting new chat
  // -------------------------------------------------------------
  useEffect(() => {
    if (isComposeOpen) {
      dispatch(searchUsers(''));
    }
  }, [isComposeOpen, dispatch]);

  // -------------------------------------------------------------
  // Form submission: Auth
  // -------------------------------------------------------------
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode) {
      dispatch(loginUser({ email, password }));
    } else {
      dispatch(registerUser({ email, password, displayName }));
    }
  };

  const handleLogout = () => {
    socketManager.disconnect();
    dispatch(logoutUser());
  };

  // -------------------------------------------------------------
  // Form submission: Send Message
  // -------------------------------------------------------------
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversationId) return;

    // Send via WebSocket connection
    socketManager.sendMessage(activeConversationId, messageInput.trim());
    
    // Stop typing immediately on send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketManager.stopTyping(activeConversationId);
    setIsTypingState(false);

    setMessageInput('');
  };

  // -------------------------------------------------------------
  // Typing Indicator Debouncer
  // -------------------------------------------------------------
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    
    if (!activeConversationId) return;

    if (!isTypingState) {
      setIsTypingState(true);
      socketManager.startTyping(activeConversationId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketManager.stopTyping(activeConversationId);
      setIsTypingState(false);
    }, 1500);
  };

  // -------------------------------------------------------------
  // Start chat with searched user
  // -------------------------------------------------------------
  const handleSelectSearchedUser = (selectedUser: User) => {
    if (!user) return;
    
    // Start or activate with explicit recipient profile reference
    dispatch(createConversation({ userIds: [user.id, selectedUser.id], recipient: selectedUser }));
    
    // Cache profile instantly
    dispatch(fetchUserProfile(selectedUser.id));

    // Clear search query and lookup results
    setSearchQuery('');
    dispatch(clearSearchResults());
    setIsComposeOpen(false);
  };

  // -------------------------------------------------------------
  // Contact Search handler
  // -------------------------------------------------------------
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      dispatch(searchUsers(val.trim()));
    } else {
      dispatch(clearSearchResults());
    }
  };

  // -------------------------------------------------------------
  // Delete Conversation Handler
  // -------------------------------------------------------------
  const handleDeleteConversation = (convoId: string | null) => {
    if (!convoId) return;
    if (window.confirm('Are you sure you want to remove this thread and all of its messages?')) {
      dispatch(deleteConversation(convoId));
    }
  };

  // Helper: Resolve Conversation Header Display Name
  const getConversationDetails = (convo: any) => {
    if (convo.name) return { name: convo.name, avatar: convo.name[0].toUpperCase() };
    
    // 1. Check if we have a direct cached recipient ID (for newly started chats with no history yet)
    let recipientId = convoRecipients[convo.id];
    
    // 2. If not, scan the conversation history to deduce the recipient ID
    if (!recipientId) {
      const roomMsgs = messages[convo.id] || [];
      const recipientMsg = roomMsgs.find((m) => m.senderId !== user?.id);
      if (recipientMsg) {
        recipientId = recipientMsg.senderId;
      }
    }
    
    // 3. Resolve profile if recipient ID is found
    if (recipientId && userProfiles[recipientId]) {
      const recipient = userProfiles[recipientId];
      return {
        name: recipient.displayName || recipient.email.split('@')[0],
        avatar: (recipient.displayName || recipient.email)[0].toUpperCase(),
        email: recipient.email,
        id: recipient.id,
      };
    }

    return {
      name: 'Direct Message',
      avatar: '💬',
      email: '',
      id: null,
    };
  };

  // -------------------------------------------------------------
  // RENDER: Auth Card Gate
  // -------------------------------------------------------------
  if (!accessToken || !user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container glass-panel">
          <div className="auth-sidebar">
            <h1 className="auth-sidebar-title">RelayFlow</h1>
            <p className="auth-sidebar-tagline">
              Experience ultra-fast, high-fidelity real-time messaging. Built with NestJS event loops, TypeORM persistence, and Next.js reactive frontend.
            </p>
          </div>
          
          <div className="auth-form-area">
            <div className="auth-header">
              <h2 className="auth-title">{isLoginMode ? 'Welcome Back' : 'Create Profile'}</h2>
              <p className="auth-subtitle">
                {isLoginMode ? 'Enter credentials to open your secure workspace.' : 'Register a profile to start instant chats.'}
              </p>
            </div>

            {authError && <div className="error-bubble">{authError}</div>}

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {!isLoginMode && (
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Umang"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLoginMode}
                  />
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-btn" disabled={authStatus === 'loading'}>
                {authStatus === 'loading' ? 'Processing...' : isLoginMode ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-toggle">
              {isLoginMode ? "Don't have an account?" : 'Already registered?'}
              <span
                className="auth-toggle-link"
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  dispatch(clearAuthError());
                }}
              >
                {isLoginMode ? 'Create account' : 'Sign In'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Chat Dashboard Workspace
  // -------------------------------------------------------------
  const activeConvo = conversations.find((c) => c.id === activeConversationId);
  const activeDetails = activeConvo ? getConversationDetails(activeConvo) : null;
  const isActiveOnline = activeDetails?.id ? !!onlineUsers[activeDetails.id] : false;
  
  // Calculate if the recipient is typing in active chat
  const isActiveTyping = activeConversationId && typingUsers[activeConversationId]
    ? Object.entries(typingUsers[activeConversationId]).some(
        ([uid, typing]) => uid !== user.id && typing
      )
    : false;

  return (
    <div className="app-container">
      {/* SIDEBAR PANEL */}
      <div className="sidebar-panel glass-panel">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="avatar online">
            {(user.displayName || user.email)[0].toUpperCase()}
          </div>
          <div className="profile-info">
            <div className="profile-name">{user.displayName || 'Active User'}</div>
            <div className="profile-email">{user.email}</div>
          </div>
          <button className="logout-btn" title="Compose New Chat" onClick={() => setIsComposeOpen(true)} style={{ marginRight: '8px' }}>
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="1.05em" width="1.05em" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button className="logout-btn" title="Sign Out" onClick={handleLogout}>
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>

        {/* Global Contacts Lookup */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-bar-input"
              placeholder="Search users to chat..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="search-results-dropdown">
              {searchResults
                .filter((u) => u.id !== user.id) // Exclude current user
                .map((searchedUser) => (
                  <div
                    key={searchedUser.id}
                    className="search-item"
                    onClick={() => handleSelectSearchedUser(searchedUser)}
                  >
                    <div className="avatar">
                      {(searchedUser.displayName || searchedUser.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="search-item-name">{searchedUser.displayName}</div>
                      <div className="search-item-email">{searchedUser.email}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Conversation Sidebar List */}
        <div className="conversation-list">
          {conversations.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No active conversations. Search users above to start a chat room.
            </div>
          ) : (
            conversations.map((convo) => {
              const details = getConversationDetails(convo);
              const isActive = convo.id === activeConversationId;
              const isConvoOnline = details.id ? !!onlineUsers[details.id] : false;
              const convoMsgs = messages[convo.id] || [];
              let lastMsg = convoMsgs[convoMsgs.length - 1];
              if (!lastMsg && convo.lastMessage) {
                lastMsg = convo.lastMessage;
              }
              
              // Verify typing status in sidebar listing
              const isConvoTyping = typingUsers[convo.id]
                ? Object.entries(typingUsers[convo.id]).some(([uid, typing]) => uid !== user.id && typing)
                : false;

              return (
                <div
                  key={convo.id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => dispatch(setActiveConversation(convo.id))}
                >
                  <div className={`avatar ${isConvoOnline ? 'online' : ''}`}>
                    {details.avatar}
                  </div>
                  <div className="convo-details">
                    <div className="convo-header">
                      <span className="convo-title">{details.name}</span>
                      {lastMsg && (
                        <span className="convo-time">
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {isConvoTyping ? (
                      <div className="convo-snippet typing">
                        <span>typing</span>
                        <div className="typing-dot" style={{ width: '4px', height: '4px', margin: '0' }} />
                        <div className="typing-dot" style={{ width: '4px', height: '4px', margin: '0' }} />
                      </div>
                    ) : (
                      <div className="convo-snippet">
                        {lastMsg ? lastMsg.content : 'No messages yet'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT FEED PANEL */}
      <div className="chat-panel glass-panel">
        {activeConversationId && activeDetails ? (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <div className="avatar" style={{ marginRight: '14px', width: '38px', height: '38px' }}>
                {activeDetails.avatar}
              </div>
              <div className="chat-header-info" style={{ flex: 1 }}>
                <h3 className="chat-header-name">{activeDetails.name}</h3>
                {isActiveTyping ? (
                  <span className="chat-header-status" style={{ color: '#c084fc' }}>
                    typing...
                  </span>
                ) : (
                  <span className={`chat-header-status ${isActiveOnline ? 'online' : ''}`}>
                    {isActiveOnline ? 'Online' : 'Offline'}
                  </span>
                )}
              </div>
              
              <button
                className="logout-btn"
                title="Remove Thread"
                onClick={() => handleDeleteConversation(activeConversationId)}
                style={{
                  marginLeft: 'auto',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="1.1em" width="1.1em" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>

            {/* Scrollable Message Feed */}
            <div className="message-feed">
              {(messages[activeConversationId] || []).length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No messages yet. Send a greetings to begin.
                </div>
              ) : (
                (messages[activeConversationId] || []).map((msg) => {
                  const isOutgoing = msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={`message-group ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                      <div className="message-bubble">{msg.content}</div>
                      <span className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}

              {/* Typing indicator bubble */}
              {isActiveTyping && (
                <div className="typing-indicator-bubble">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              
              <div ref={feedEndRef} />
            </div>

            {/* Bottom Input Area */}
            <div className="chat-input-area">
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <textarea
                  className="chat-textarea"
                  placeholder="Type a message... (Press Enter to Send)"
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button type="submit" className="chat-send-btn">
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path d="m21.426 11.095-17-8A.999.999 0 0 0 3.03 4.542L7.38 12l-4.35 7.458a1 1 0 0 0 1.396 1.447l17-8a1 1 0 0 0 0-1.81zM5.92 6.069 17.522 11.5 10.9 8.272l-4.98-2.203zm4.98 9.659L17.522 12.5 5.92 17.931l4.98-2.203z"></path>
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-icon">💬</div>
            <h2>RelayFlow Workspace</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', maxWidth: '320px', textAlign: 'center', lineHeight: '1.6' }}>
              Select an existing chat from the left sidebar or look up contacts to begin high fidelity messaging.
            </p>
          </div>
        )}
      </div>

      {/* COMPOSE NEW CHAT MODAL OVERLAY */}
      {isComposeOpen && (
        <div className="modal-overlay" onClick={() => setIsComposeOpen(false)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Conversation</h3>
              <button className="modal-close-btn" onClick={() => setIsComposeOpen(false)}>
                &times;
              </button>
            </div>
            
            <div className="modal-search-container">
              <input
                type="text"
                className="modal-search-input"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
              />
            </div>
            
            <div className="modal-user-list">
              {searchResults.length === 0 ? (
                <div className="modal-empty-state">
                  No active users found. Try searching by name or email.
                </div>
              ) : (
                searchResults
                  .filter((u) => u.id !== user.id) // Exclude current user
                  .map((u) => (
                    <div
                      key={u.id}
                      className="modal-user-item"
                      onClick={() => handleSelectSearchedUser(u)}
                    >
                      <div className="avatar">
                        {(u.displayName || u.email)[0].toUpperCase()}
                      </div>
                      <div className="modal-user-details">
                        <div className="modal-user-name">{u.displayName}</div>
                        <div className="modal-user-email">{u.email}</div>
                      </div>
                      <span className="modal-chat-action">Chat</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatDashboard() {
  return (
    <StoreProvider>
      <ChatDashboardContent />
    </StoreProvider>
  );
}
