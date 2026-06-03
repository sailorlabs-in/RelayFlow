import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { User } from '../store/slices/authSlice';
import {
  searchUsers,
  clearSearchResults,
  createConversation,
  fetchUserProfile,
  setActiveConversation,
} from '../store/slices/chatSlice';

import { Avatar } from './Avatar';
import {
  IconSettings,
  IconCompose,
  IconLogout,
  IconSearch,
  IconChat,
} from './Icons';
import type { Theme } from './ThemeSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

interface ChatSidebarProps {
  ownStatus: string;
  setIsProfileOpen: (open: boolean) => void;
  setIsComposeOpen: (open: boolean) => void;
  handleLogout: () => void;
  handleThemeChange: (t: Theme) => void;
}

export const ChatSidebar = ({
  ownStatus,
  setIsProfileOpen,
  setIsComposeOpen,
  handleLogout,
  handleThemeChange,
}: ChatSidebarProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user, themeMode: theme } = useAppSelector((s) => s.auth);
  const {
    conversations,
    activeConversationId,
    messages,
    typingUsers,
    onlineUsers,
    searchResults,
    userProfiles,
    convoRecipients,
  } = useAppSelector((s) => s.chat);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Object.values(convoRecipients).forEach((recipientId) => {
      if (recipientId && user && recipientId !== user.id && !userProfiles[recipientId]) {
        dispatch(fetchUserProfile(recipientId));
      }
    });
  }, [convoRecipients, userProfiles, user, dispatch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      dispatch(searchUsers(val.trim()));
    } else {
      dispatch(clearSearchResults());
    }
  };

  const handleSelectSearchedUser = (selectedUser: User) => {
    if (!user) {return;}
    dispatch(createConversation({ userIds: [user.id, selectedUser.id], recipient: selectedUser }));
    dispatch(fetchUserProfile(selectedUser.id));
    setSearchQuery('');
    dispatch(clearSearchResults());
  };

  const getConversationDetails = (convo: any) => {
    if (convo.name) {return { name: convo.name, letter: convo.name[0].toUpperCase() };}

    let recipientId = convoRecipients[convo.id];
    if (!recipientId) {
      const roomMsgs = messages[convo.id] || [];
      const recipientMsg = roomMsgs.find((m) => m.senderId !== user?.id);
      if (recipientMsg) {recipientId = recipientMsg.senderId;}
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

  if (!user) {return <div className="w-[300px]" />;}

  return (
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
  );
};
