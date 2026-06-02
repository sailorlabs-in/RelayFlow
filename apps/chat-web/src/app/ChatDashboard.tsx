'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { ProfileSettingsContent } from './profile/page';
import { useAppDispatch, useAppSelector } from '../store';
import {
  loginUser,
  registerUser,
  logoutUser,
  clearAuthError,
  updateUserProfile,
  setThemeMode,
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

/* ── Types ─────────────────────────────────────────────────── */
type Theme = 'dark' | 'light' | 'system';

/* ── SVG icon components ────────────────────────────────────── */
const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
    <path d="m21.426 11.095-17-8A1 1 0 0 0 3.03 4.542L7.38 12l-4.35 7.458a1 1 0 0 0 1.396 1.447l17-8a1 1 0 0 0 0-1.81zM5.92 6.069 17.522 11.5 10.9 8.272l-4.98-2.203zm4.98 9.659L17.522 12.5 5.92 17.931l4.98-2.203z" />
  </svg>
);

const IconCompose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[30px] h-[30px]">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconAlertCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px] flex-shrink-0">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconBolt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[28px] h-[28px]">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconGlobe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

/* ── Theme Icon SVGs ─────────────────────────────────────────── */
const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const IconMonitor = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

/* ── ThemeSwitcher Component ────────────────────────────────── */
function ThemeSwitcher({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light',  icon: <IconSun />,     label: 'Light mode' },
    { value: 'dark',   icon: <IconMoon />,    label: 'Dark mode' },
    { value: 'system', icon: <IconMonitor />, label: 'System mode' },
  ];

  return (
    <div className="theme-switcher" role="group" aria-label="Theme selector">
      {options.map(({ value, icon, label }) => (
        <button
          key={value}
          id={`theme-btn-${value}`}
          title={label}
          aria-pressed={theme === value}
          onClick={() => onChange(value)}
          className={`theme-btn${theme === value ? ' theme-btn-active' : ''}`}
          style={theme === value ? {
            background: 'var(--theme-btn-active)',
            color: 'var(--theme-btn-active-text)',
          } : {}}
          onMouseEnter={(e) => {
            if (theme !== value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-btn-hover)';
          }}
          onMouseLeave={(e) => {
            if (theme !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

/* ── Avatar ─────────────────────────────────────────────────── */
type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

const PRESENCE_DOT_COLORS: Record<PresenceStatus, string> = {
  online:  '#22c55e', // green
  away:    '#eab308', // amber
  dnd:     '#ef4444', // red
  offline: 'var(--text-muted)', // gray
};

function PresenceDot({ status, size = 10 }: { status: PresenceStatus | string; size?: number }) {
  const s = (status as PresenceStatus) in PRESENCE_DOT_COLORS ? (status as PresenceStatus) : 'offline';
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: PRESENCE_DOT_COLORS[s],
        border: '2px solid var(--glass-bg)',
        flexShrink: 0,
        boxShadow: s !== 'offline' ? `0 0 0 1px ${PRESENCE_DOT_COLORS[s]}33` : 'none',
        transition: 'background 0.3s ease',
      }}
      title={s.charAt(0).toUpperCase() + s.slice(1)}
      aria-label={`Status: ${s}`}
    />
  );
}

function Avatar({
  letter,
  status = 'offline',
  size = 'md',
}: {
  letter: string;
  status?: PresenceStatus | string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = {
    sm: 'w-[32px] h-[32px] text-[12px]',
    md: 'w-[38px] h-[38px] text-[14px]',
    lg: 'w-[44px] h-[44px] text-[16px]',
  };
  const dotSize = size === 'lg' ? 11 : size === 'md' ? 10 : 8;
  return (
    <div className="relative flex-shrink-0" style={{ display: 'inline-flex' }}>
      <div
        className={`avatar-base ${sizeMap[size]} flex-shrink-0`}
        aria-hidden="true"
      >
        {letter}
      </div>
      <span
        style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: PRESENCE_DOT_COLORS[(status as PresenceStatus) in PRESENCE_DOT_COLORS ? (status as PresenceStatus) : 'offline'],
          border: '2px solid var(--glass-bg)',
          boxShadow: status !== 'offline' ? `0 0 0 1px ${PRESENCE_DOT_COLORS[(status as PresenceStatus) in PRESENCE_DOT_COLORS ? (status as PresenceStatus) : 'offline']}33` : 'none',
          transition: 'background 0.3s ease',
        }}
        title={status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Offline'}
      />
    </div>
  );
}

/* ── Main Dashboard Content ─────────────────────────────────── */
function ChatDashboardContent() {
  const dispatch = useAppDispatch();
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { user, accessToken, status: authStatus, error: authError } = useAppSelector((s) => s.auth);
  const {
    conversations,
    activeConversationId,
    messages,
    typingUsers,
    onlineUsers,
    searchResults,
    userProfiles,
    convoRecipients,
    hasMoreMessages,
  } = useAppSelector((s) => s.chat);

  // --- Local state ---
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isTypingState, setIsTypingState] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const theme = useAppSelector((s) => s.auth.themeMode);

  // --- Pagination & Scroll UX state ---
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingMoreRef = useRef(false);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  
  const scrollHeightBeforeLoadRef = useRef(0);
  const scrollTopBeforeLoadRef = useRef(0);
  const prevActiveConvoIdRef = useRef<string | null>(null);
  const prevMessagesLengthRef = useRef(0);
  const isFirstRenderForConvoRef = useRef(true);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [ownStatus, setOwnStatus] = useState<string>('online'); // local user's own presence

  const handleThemeChange = useCallback((t: Theme) => {
    dispatch(setThemeMode(t));
    if (user && user.themeMode !== t) {
      dispatch(updateUserProfile({ themeMode: t }));
    }
  }, [user, dispatch]);

  // ---- Socket + data on login ----
  useEffect(() => {
    if (accessToken && user) {
      dispatch(fetchConversations(user.id));
      socketManager.connect(accessToken);
      // Set own status from user profile preference
      const savedStatus = user.status || 'online';
      setOwnStatus(savedStatus);
      return () => { socketManager.disconnect(); };
    }
    return undefined;
  }, [accessToken, user, dispatch]);

  // ---- Inactivity detection: go 'away' after 2 minutes of no interaction ----
  useEffect(() => {
    if (!accessToken || !user) return;

    const INACTIVITY_MS = 2 * 60 * 1000; // 2 minutes

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      const currentStatus = (document.documentElement.dataset.ownStatus as string) || 'online';
      // If we were away due to inactivity, return to online
      if (currentStatus === 'away') {
        setOwnStatus('online');
        socketManager.updateStatus('online');
      }
      inactivityTimerRef.current = setTimeout(() => {
        // Only auto-away if not on DND
        const currentStatus = (document.documentElement.dataset.ownStatus as string) || 'online';
        if (currentStatus !== 'dnd') {
          setOwnStatus('away');
          socketManager.updateStatus('away');
        }
      }, INACTIVITY_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        const currentStatus = (document.documentElement.dataset.ownStatus as string) || 'online';
        if (currentStatus !== 'dnd') {
          setOwnStatus('away');
          socketManager.updateStatus('away');
        }
      } else {
        resetTimer();
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Kick off the first timer
    resetTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user]);

  // ---- Sync ownStatus with what the server acknowledges via Redux ----
  useEffect(() => {
    if (user?.id && onlineUsers[user.id]) {
      setOwnStatus(onlineUsers[user.id]);
    }
  }, [onlineUsers, user?.id]);

  // ---- Messages on conversation change ----
  useEffect(() => {
    if (activeConversationId) {
      dispatch(fetchMessages({ conversationId: activeConversationId, limit: 20, offset: 0 }));
      socketManager.joinConversation(activeConversationId);
    }
  }, [activeConversationId, dispatch]);

  // ---- Scroll & Anchor Management ----
  const activeMessages = messages[activeConversationId || ''] || [];

  useEffect(() => {
    isFirstRenderForConvoRef.current = true;
  }, [activeConversationId]);

  useLayoutEffect(() => {
    const container = feedContainerRef.current;
    if (!container || !activeConversationId) return;

    const messagesLength = activeMessages.length;

    // Case 1: Active conversation changed
    if (activeConversationId !== prevActiveConvoIdRef.current) {
      prevActiveConvoIdRef.current = activeConversationId;
      prevMessagesLengthRef.current = messagesLength;
      container.scrollTop = container.scrollHeight;
      return;
    }

    // Case 2: Messages length increased
    if (messagesLength > prevMessagesLengthRef.current) {
      prevMessagesLengthRef.current = messagesLength;

      if (isFetchingMoreRef.current) {
        // We loaded older messages (pagination)
        const newScrollHeight = container.scrollHeight;
        const oldScrollHeight = scrollHeightBeforeLoadRef.current;
        const oldScrollTop = scrollTopBeforeLoadRef.current;
        
        container.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
        isFetchingMoreRef.current = false;
        setIsFetchingMore(false);
      } else if (isFirstRenderForConvoRef.current) {
        // Initial load of messages
        container.scrollTop = container.scrollHeight;
        isFirstRenderForConvoRef.current = false;
      } else {
        // New real-time message
        const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 150;
        const lastMsg = activeMessages[messagesLength - 1];
        const sentByMe = lastMsg?.senderId === user?.id;
        
        if (isNearBottom || sentByMe) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    } else if (messagesLength < prevMessagesLengthRef.current) {
      // Messages deleted/purged
      prevMessagesLengthRef.current = messagesLength;
    }
  }, [activeMessages, activeConversationId, user?.id]);

  // ---- Infinite scroll (load more older messages on scroll up) ----
  const hasMore = activeConversationId ? hasMoreMessages[activeConversationId] !== false : false;

  const loadMoreMessages = useCallback(async () => {
    if (isFetchingMore || !hasMore || !activeConversationId) return;
    
    const container = feedContainerRef.current;
    if (!container) return;

    // Record scroll positions before dispatching/loading
    scrollHeightBeforeLoadRef.current = container.scrollHeight;
    scrollTopBeforeLoadRef.current = container.scrollTop;
    
    isFetchingMoreRef.current = true;
    setIsFetchingMore(true);

    const currentMessages = messages[activeConversationId] || [];
    const offset = currentMessages.length;

    try {
      await dispatch(fetchMessages({
        conversationId: activeConversationId,
        limit: 20,
        offset
      })).unwrap();
    } catch (err) {
      console.error('Failed to load older messages:', err);
      isFetchingMoreRef.current = false;
      setIsFetchingMore(false);
    }
  }, [activeConversationId, isFetchingMore, hasMore, messages, dispatch]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop < 20 && !isFetchingMore && hasMore) {
      loadMoreMessages();
    }
  }, [isFetchingMore, hasMore, loadMoreMessages]);

  // ---- Resolve sender profiles ----
  useEffect(() => {
    if (activeConversationId && messages[activeConversationId]) {
      messages[activeConversationId].forEach((msg) => {
        if (msg.senderId !== user?.id && !userProfiles[msg.senderId]) {
          dispatch(fetchUserProfile(msg.senderId));
        }
      });
    }
  }, [activeConversationId, messages, userProfiles, user, dispatch]);

  useEffect(() => {
    Object.values(convoRecipients).forEach((recipientId) => {
      if (recipientId && recipientId !== user?.id && !userProfiles[recipientId]) {
        dispatch(fetchUserProfile(recipientId));
      }
    });
  }, [convoRecipients, userProfiles, user, dispatch]);

  // ---- Compose modal: load all users ----
  useEffect(() => {
    if (isComposeOpen) dispatch(searchUsers(''));
  }, [isComposeOpen, dispatch]);

  // ---- Auth ----
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode) dispatch(loginUser({ email, password }));
    else dispatch(registerUser({ email, password, displayName }));
  };

  const handleLogout = () => {
    socketManager.disconnect();
    dispatch(logoutUser());
  };

  // ---- Messages ----
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversationId) return;
    socketManager.sendMessage(activeConversationId, messageInput.trim());
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketManager.stopTyping(activeConversationId);
    setIsTypingState(false);
    setMessageInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    if (!activeConversationId) return;
    if (!isTypingState) {
      setIsTypingState(true);
      socketManager.startTyping(activeConversationId);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketManager.stopTyping(activeConversationId);
      setIsTypingState(false);
    }, 1500);
  };

  // ---- Search ----
  const handleSelectSearchedUser = (selectedUser: User) => {
    if (!user) return;
    dispatch(createConversation({ userIds: [user.id, selectedUser.id], recipient: selectedUser }));
    dispatch(fetchUserProfile(selectedUser.id));
    setSearchQuery('');
    dispatch(clearSearchResults());
    setIsComposeOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) dispatch(searchUsers(val.trim()));
    else dispatch(clearSearchResults());
  };

  // ---- Delete conversation ----
  const handleDeleteConversation = (convoId: string | null) => {
    if (!convoId) return;
    if (window.confirm('Remove this thread and all messages?')) {
      dispatch(deleteConversation(convoId));
    }
  };

  // ---- Conversation display name helper ----
  const getConversationDetails = (convo: any) => {
    if (convo.name) return { name: convo.name, letter: convo.name[0].toUpperCase() };

    let recipientId = convoRecipients[convo.id];
    if (!recipientId) {
      const roomMsgs = messages[convo.id] || [];
      const recipientMsg = roomMsgs.find((m) => m.senderId !== user?.id);
      if (recipientMsg) recipientId = recipientMsg.senderId;
    }

    if (recipientId && userProfiles[recipientId]) {
      const r = userProfiles[recipientId];
      return {
        name: r.displayName || r.email.split('@')[0],
        letter: (r.displayName || r.email)[0].toUpperCase(),
        email: r.email,
        id: r.id,
      };
    }

    return { name: 'Direct Message', letter: 'D', email: '', id: null };
  };

  // ── RENDER: Auth Gate ──────────────────────────────────────
  if (!accessToken || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen p-6"
        style={{ background: 'var(--bg-primary)' }}>

        {/* Theme switcher in corner */}
        <div className="fixed top-5 right-5 z-50">
          <ThemeSwitcher theme={theme} onChange={handleThemeChange} />
        </div>

        <div className="flex w-[900px] max-w-full min-h-[580px] overflow-hidden glass-panel animate-fade-in">

          {/* Left Branding Panel */}
          <div className="relative flex-[1.1] flex flex-col justify-center items-center p-12 text-white text-center overflow-hidden"
            style={{ background: 'linear-gradient(140deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' }}>
            <div className="absolute inset-0"
              style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18) 0%, transparent 65%)' }} />
            <div className="absolute -bottom-14 -right-14 w-56 h-56 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }} />

            {/* Brand icon */}
            <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
              <IconBolt />
            </div>

            <h1 className="relative z-10 text-[38px] font-bold tracking-tight mb-3">RelayFlow</h1>
            <p className="relative z-10 text-[15px] leading-relaxed opacity-85 max-w-[260px]">
              Ultra-fast, real-time messaging with NestJS WebSocket Gateway.
            </p>

            <div className="relative z-10 flex flex-col gap-2.5 mt-8 w-full">
              {[
                { icon: <IconZap />,    text: 'Sub-millisecond delivery' },
                { icon: <IconShield />, text: 'JWT-secured channels' },
                { icon: <IconGlobe />,  text: 'Real-time presence sync' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] text-left"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
                  {icon}
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="flex-1 flex flex-col justify-center p-12"
            style={{ background: 'var(--bg-chat)' }}>
            <div className="mb-8">
              <h2 className="text-[28px] font-bold tracking-tight mb-2"
                style={{ color: 'var(--text-primary)' }}>
                {isLoginMode ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                {isLoginMode
                  ? 'Enter your credentials to open your workspace.'
                  : 'Register a profile to start instant messaging.'}
              </p>
            </div>

            {authError && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in"
                style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
                <IconAlertCircle />
                {authError}
              </div>
            )}

            <form className="flex flex-col gap-4" onSubmit={handleAuthSubmit}>
              {!isLoginMode && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-secondary)' }}>
                    Display Name
                  </label>
                  <input
                    id="auth-display-name"
                    type="text"
                    className="input-base rounded-[10px] px-4 py-3 text-[14.5px]"
                    placeholder="e.g. Umang"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLoginMode}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}>
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  className="input-base rounded-[10px] px-4 py-3 text-[14.5px]"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  className="input-base rounded-[10px] px-4 py-3 text-[14.5px]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={authStatus === 'loading'}
                className="mt-2 rounded-[10px] py-3.5 text-[15px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden btn-send"
                onMouseEnter={(e) => { if (authStatus !== 'loading') { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--btn-shadow)'; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
              >
                {authStatus === 'loading' ? 'Processing…' : isLoginMode ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="text-center mt-6 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              {isLoginMode ? "Don't have an account?" : 'Already registered?'}
              <button
                id="auth-toggle-btn"
                className="ml-1.5 font-semibold cursor-pointer transition-colors duration-200"
                style={{ color: 'var(--accent-primary)', background: 'none', border: 'none' }}
                onClick={() => { setIsLoginMode(!isLoginMode); dispatch(clearAuthError()); }}
              >
                {isLoginMode ? 'Create account' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Chat Dashboard ────────────────────────────────
  const activeConvo   = conversations.find((c) => c.id === activeConversationId);
  const activeDetails = activeConvo ? getConversationDetails(activeConvo) : null;
  // Derive the active recipient's presence status string
  const activeStatus: string = activeDetails?.id ? (onlineUsers[activeDetails.id] || 'offline') : 'offline';
  const isActiveTyping = activeConversationId && typingUsers[activeConversationId]
    ? Object.entries(typingUsers[activeConversationId]).some(([uid, typing]) => uid !== user.id && typing)
    : false;

  // Keep data-own-status on the HTML element so the inactivity timer closure can read it
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.ownStatus = ownStatus;
  }

  return (
    <div className="flex h-screen w-screen p-3.5 gap-3.5"
      style={{ background: 'var(--bg-primary)' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <div className="glass-panel flex flex-col overflow-hidden h-full w-[300px] flex-shrink-0">

        {/* Profile Card */}
        <div className="flex items-center gap-2.5 p-3.5 border-b" style={{ borderColor: 'var(--border-muted)' }}>
          <Avatar letter={(user.displayName || user.email)[0].toUpperCase()} status={ownStatus} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13.5px] truncate" style={{ color: 'var(--text-primary)' }}>
              {user.displayName || 'Active User'}
            </div>
            <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {user.email}
            </div>
          </div>

          {/* Theme switcher */}
          <ThemeSwitcher theme={theme} onChange={handleThemeChange} />

          {/* Profile settings */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            id="profile-settings-btn"
            title="Profile Settings"
            className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 border-none"
            style={{ background: 'transparent', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-btn-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <IconSettings />
          </button>

          {/* Compose */}
          <button
            id="compose-btn"
            title="New conversation"
            className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 border-none"
            style={{ background: 'transparent', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-btn-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            onClick={() => setIsComposeOpen(true)}
          >
            <IconCompose />
          </button>

          {/* Logout */}
          <button
            id="logout-btn"
            title="Sign out"
            className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 border-none"
            style={{ background: 'transparent', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            onClick={handleLogout}
          >
            <IconLogout />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b relative" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="relative flex items-center">
            <span className="absolute left-3 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              <IconSearch />
            </span>
            <input
              id="sidebar-search"
              type="text"
              className="input-base w-full rounded-[10px] pl-8 pr-3 py-2 text-[13px]"
              style={{ background: 'var(--bg-input)', border: '1.5px solid var(--glass-border)', color: 'var(--text-primary)' }}
              placeholder="Search users…"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2.5px var(--accent-ring)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-[calc(100%-6px)] z-50 dropdown-base animate-fade-in overflow-y-auto max-h-[240px]">
              {searchResults
                .filter((u) => u.id !== user.id)
                .map((su) => (
                  <div
                    key={su.id}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer border-b transition-colors duration-150"
                    style={{ borderColor: 'var(--border-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-btn-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => handleSelectSearchedUser(su)}
                  >
                    <Avatar letter={(su.displayName || su.email)[0].toUpperCase()} size="sm" />
                    <div>
                      <div className="font-medium text-[13px]" style={{ color: 'var(--text-primary)' }}>{su.displayName}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{su.email}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Conversations Label */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Conversations
          </span>
          <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: 'var(--theme-btn-active)', color: 'var(--theme-btn-active-text)' }}>
            {conversations.length}
          </span>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-1.5 pb-2">
          {conversations.length === 0 ? (
            <div className="py-10 px-5 text-center text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <IconChat />
              <p className="mt-3">No conversations yet.<br />Search above to start one.</p>
            </div>
          ) : (
            conversations.map((convo) => {
              const details      = getConversationDetails(convo);
              const isActive     = convo.id === activeConversationId;
              const recipientStatus = details.id ? (onlineUsers[details.id] || 'offline') : 'offline';
              const convoMsgs    = messages[convo.id] || [];
              const lastMsg      = convoMsgs[convoMsgs.length - 1] ?? convo.lastMessage;
              const isTyping     = typingUsers[convo.id]
                ? Object.entries(typingUsers[convo.id]).some(([uid, t]) => uid !== user.id && t)
                : false;

              return (
                <div
                  key={convo.id}
                  id={`convo-${convo.id}`}
                  className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-0.5 border"
                  style={{
                    background: isActive ? 'var(--theme-btn-active)' : 'transparent',
                    borderColor: isActive ? 'var(--accent-primary)' : 'transparent',
                    boxShadow: isActive ? 'var(--btn-shadow)' : 'none',
                  }}
                  onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-input)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--glass-border)'; } }}
                  onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; } }}
                  onClick={() => dispatch(setActiveConversation(convo.id))}
                >
                  <Avatar letter={details.letter} status={recipientStatus} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span
                        className="font-semibold text-[13px] truncate"
                        style={{ color: isActive ? 'var(--theme-btn-active-text)' : 'var(--text-primary)' }}>
                        {details.name}
                      </span>
                      {lastMsg && (
                        <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {isTyping ? (
                      <div className="flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--accent-secondary)' }}>
                        <span>typing</span>
                        <span className="typing-dot" style={{ animationDelay: '0s' }} />
                        <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                      </div>
                    ) : (
                      <div className="text-[11.5px] truncate" style={{ color: 'var(--text-secondary)' }}>
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

      {/* ── CHAT PANEL ──────────────────────────────────────── */}
      <div className="glass-panel flex flex-col overflow-hidden h-full flex-1 min-w-0">
        {activeConversationId && activeDetails ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b"
              style={{
                borderColor: 'var(--border-muted)',
                background: 'var(--bg-sidebar)',
                borderTopLeftRadius: '1rem',
                borderTopRightRadius: '1rem',
              }}>
              <Avatar letter={activeDetails.letter} status={activeStatus} size="md" />
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                  {activeDetails.name}
                </h3>
                {isActiveTyping ? (
                  <span className="text-[11.5px] font-medium" style={{ color: 'var(--accent-primary)' }}>
                    typing…
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11.5px] mt-0.5">
                    <PresenceDot status={activeStatus} size={7} />
                    <span style={{ color:
                      activeStatus === 'online' ? '#22c55e' :
                      activeStatus === 'away'   ? '#eab308' :
                      activeStatus === 'dnd'    ? '#ef4444' :
                      'var(--text-muted)'
                    }}>
                      {activeStatus === 'online' ? 'Online' :
                       activeStatus === 'away'   ? 'Away' :
                       activeStatus === 'dnd'    ? 'Do Not Disturb' :
                       'Offline'}
                    </span>
                  </div>
                )}
              </div>

              {/* Delete thread */}
              <button
                id="delete-thread-btn"
                title="Delete thread"
                className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-all duration-200 flex-shrink-0"
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  border: '1.5px solid var(--danger-border)',
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'var(--danger)';
                  b.style.color = 'white';
                  b.style.borderColor = 'var(--danger)';
                  b.style.boxShadow = '0 4px 14px rgba(239,68,68,0.3)';
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'var(--danger-bg)';
                  b.style.color = 'var(--danger)';
                  b.style.borderColor = 'var(--danger-border)';
                  b.style.boxShadow = 'none';
                }}
                onClick={() => handleDeleteConversation(activeConversationId)}
              >
                <IconTrash />
                Delete
              </button>
            </div>

            {/* Message Feed */}
            <div 
              ref={feedContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto flex flex-col gap-3.5 p-5"
              style={{ background: 'var(--bg-chat)' }}>
              
              {isFetchingMore && (
                <div className="flex justify-center py-2 flex-shrink-0">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
                </div>
              )}
              {(messages[activeConversationId] || []).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-[13.5px]"
                  style={{ color: 'var(--text-muted)' }}>
                  <IconChat />
                  <span>No messages yet. Send a greeting to begin.</span>
                </div>
              ) : (
                (messages[activeConversationId] || []).map((msg) => {
                  const isOut = msg.senderId === user.id;
                  return (
                    <div key={msg.id}
                      className={`flex flex-col max-w-[68%] animate-fade-in ${isOut ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed break-words ${isOut ? 'msg-bubble-out' : 'msg-bubble-in'}`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isActiveTyping && (
                <div className="self-start flex items-center gap-1.5 px-4 py-3 rounded-[18px] animate-fade-in msg-bubble-in">
                  <span className="typing-dot" style={{ animationDelay: '0s' }} />
                  <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                  <span className="typing-dot" style={{ animationDelay: '0.30s' }} />
                </div>
              )}

              <div ref={feedEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3.5 border-t"
              style={{
                borderColor: 'var(--border-muted)',
                background: 'var(--bg-sidebar)',
                borderBottomLeftRadius: '1rem',
                borderBottomRightRadius: '1rem',
              }}>
              <form className="flex gap-2.5 items-end" onSubmit={handleSendMessage}>
                <textarea
                  id="message-input"
                  className="input-base flex-1 rounded-xl px-4 py-3 text-[14px] resize-none leading-relaxed"
                  style={{
                    minHeight: '46px',
                    maxHeight: '120px',
                    background: 'var(--bg-input)',
                    border: '1.5px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Type a message… (Enter to send)"
                  value={messageInput}
                  onChange={handleInputChange}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
                  }}
                />
                <button
                  id="send-message-btn"
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="btn-send w-[46px] h-[46px] rounded-xl flex-shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  onMouseEnter={(e) => { if (messageInput.trim()) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--btn-shadow)'; } }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
                >
                  <IconSend />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4"
            style={{ background: 'var(--bg-chat)', borderRadius: '1rem' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center animate-float border"
              style={{
                background: 'var(--theme-btn-active)',
                borderColor: 'var(--accent-primary)',
              }}>
              <IconChat />
            </div>
            <h2 className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              RelayFlow Workspace
            </h2>
            <p className="text-[13.5px] max-w-[290px] text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Select a conversation from the sidebar or search for a contact to start messaging.
            </p>
            <button
              id="empty-compose-btn"
              className="mt-1 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white cursor-pointer transition-all duration-200 border-none btn-send"
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--btn-shadow)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
              onClick={() => setIsComposeOpen(true)}
            >
              Start a conversation
            </button>
          </div>
        )}
      </div>

      {/* ── COMPOSE MODAL ────────────────────────────────────── */}
      {isComposeOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-content p-4 animate-fade-in"
          style={{ background: 'rgba(4,6,12,0.65)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setIsComposeOpen(false)}
        >
          <div
            className="w-[480px] max-w-full max-h-[540px] flex flex-col overflow-hidden animate-slide-up"
            style={{
              background: 'var(--glass-bg)',
              border: '1.5px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '18px',
              boxShadow: 'var(--glass-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-muted)' }}>
              <h3 className="text-[17px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                New Conversation
              </h3>
              <button
                id="modal-close-btn"
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer text-[18px] leading-none transition-all duration-200 border-none"
                style={{ background: 'var(--theme-btn)', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-btn-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-btn)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                onClick={() => setIsComposeOpen(false)}
              >
                ×
              </button>
            </div>

            {/* Modal search */}
            <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-muted)' }}>
              <input
                id="compose-search"
                type="text"
                className="input-base w-full rounded-[10px] px-4 py-2.5 text-[14px]"
                style={{ background: 'var(--bg-input)', border: '1.5px solid var(--glass-border)', color: 'var(--text-primary)' }}
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Modal user list */}
            <div className="flex-1 overflow-y-auto px-3.5 py-2">
              {searchResults.length === 0 ? (
                <div className="py-12 text-center text-[13.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <div className="w-9 h-9 mx-auto mb-3 opacity-30"><IconChat /></div>
                  No users found. Try a different search.
                </div>
              ) : (
                searchResults
                  .filter((u) => u.id !== user.id)
                  .map((u) => (
                    <div
                      key={u.id}
                      id={`compose-user-${u.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-1 border"
                      style={{ borderColor: 'transparent' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--theme-btn-hover)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--glass-border)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}
                      onClick={() => handleSelectSearchedUser(u)}
                    >
                      <Avatar letter={(u.displayName || u.email)[0].toUpperCase()} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13.5px] truncate" style={{ color: 'var(--text-primary)' }}>
                          {u.displayName}
                        </div>
                        <div className="text-[11.5px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {u.email}
                        </div>
                      </div>
                      <span className="text-[11.5px] font-bold px-3 py-1.5 rounded-[7px] flex-shrink-0 transition-all duration-200"
                        style={{ background: 'var(--theme-btn-active)', color: 'var(--theme-btn-active-text)' }}>
                        Chat
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE SETTINGS MODAL ────────────────────────────── */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(4,6,12,0.65)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          onClick={() => setIsProfileOpen(false)}
        >
          <div
            className="w-[800px] max-w-full h-[85vh] flex flex-col overflow-hidden animate-slide-up"
            style={{
              background: 'var(--glass-bg)',
              border: '1.5px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '18px',
              boxShadow: 'var(--glass-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileSettingsContent isModal onClose={() => setIsProfileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Root wrapper with Redux provider ───────────────────────── */
export default function ChatDashboard() {
  return (
    <StoreProvider>
      <ChatDashboardContent />
    </StoreProvider>
  );
}
