import React, { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchUserProfile,
  setActiveConversation,
} from '../store/slices/chatSlice';

import { Avatar } from './Avatar';
import { IconSettings, IconCompose, IconLogout, IconChat } from './Icons';

interface ChatSidebarProps {
  ownStatus: string;
  setIsProfileOpen: (open: boolean) => void;
  setIsComposeOpen: (open: boolean) => void;
  handleLogout: () => void;
  isRailCollapsed: boolean;
  onToggleRail: () => void;
}

export const ChatSidebar = ({
  ownStatus,
  setIsProfileOpen,
  setIsComposeOpen,
  handleLogout,
  isRailCollapsed,
  onToggleRail,
}: ChatSidebarProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const {
    conversations,
    activeConversationId,
    messages,
    typingUsers,
    onlineUsers,
    userProfiles,
    convoRecipients,
  } = useAppSelector((s) => s.chat);

  useEffect(() => {
    Object.values(convoRecipients).forEach((recipientId) => {
      if (
        recipientId &&
        user &&
        recipientId !== user.id &&
        !userProfiles[recipientId]
      ) {
        dispatch(fetchUserProfile(recipientId));
      }
    });
  }, [convoRecipients, userProfiles, user, dispatch]);

  const getConversationDetails = (convo: any) => {
    if (convo.name) {
      return { name: convo.name, letter: convo.name[0].toUpperCase() };
    }

    let recipientId = convoRecipients[convo.id];
    if (!recipientId) {
      const roomMsgs = messages[convo.id] || [];
      const recipientMsg = roomMsgs.find((m) => m.senderId !== user?.id);
      if (recipientMsg) {
        recipientId = recipientMsg.senderId;
      }
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

  if (!user) {
    return <div className="w-[300px]" />;
  }

  return (
    <div className="glass-panel flex flex-col overflow-hidden h-full w-[300px] flex-shrink-0">
      {/* Profile Card */}
      <div className="flex items-center gap-2.5 p-3.5 border-b border-[var(--border-muted)]">
        {/* Rail toggle — always first, acts like a nav handle */}
        <button
          id="rail-toggle-btn"
          title={
            isRailCollapsed ? 'Show navigation rail' : 'Hide navigation rail'
          }
          onClick={onToggleRail}
          className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 border-none active-press ${isRailCollapsed ? 'bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)]' : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)] hover:text-[var(--text-primary)]'}`}
        >
          {/* Sidebar panels icon — two vertical bars */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-[15px] h-[15px]"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        <Avatar
          letter={(user.displayName || user.email)[0].toUpperCase()}
          status={ownStatus}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13.5px] truncate text-[var(--text-primary)]">
            {user.displayName || 'Active User'}
          </div>
          <div className="text-[11px] truncate mt-0.5 text-[var(--text-muted)]">
            {user.email}
          </div>
        </div>

        {/* Profile settings */}
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          id="profile-settings-btn"
          title="Profile Settings"
          className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 border-none bg-transparent text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)] hover:text-[var(--text-primary)] spin-hover active-press"
        >
          <IconSettings />
        </button>

        {/* Logout */}
        <button
          id="logout-btn"
          title="Sign out"
          className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 border-none bg-transparent text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] active-press"
          onClick={handleLogout}
        >
          <IconLogout />
        </button>
      </div>

      {/* Direct Messages Label + New DM button */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Direct Messages
        </span>
        <button
          id="compose-btn"
          title="New Direct Message"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold cursor-pointer border-none transition-all duration-200 bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)] hover:opacity-90 active-press"
          onClick={() => setIsComposeOpen(true)}
        >
          <IconCompose />
          <span>New DM</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {conversations.length === 0 ? (
          <div className="py-10 px-5 text-center text-[13px] leading-relaxed text-[var(--text-muted)]">
            <IconChat />
            <p className="mt-3">
              No conversations yet.
              <br />
              Click "New DM" to start one.
            </p>
          </div>
        ) : (
          conversations.map((convo) => {
            const details = getConversationDetails(convo);
            const isActive = convo.id === activeConversationId;
            const recipientStatus = details.id
              ? onlineUsers[details.id] || 'offline'
              : 'offline';
            const convoMsgs = messages[convo.id] || [];
            const lastMsg =
              convoMsgs[convoMsgs.length - 1] ?? convo.lastMessage;
            const isTyping = typingUsers[convo.id]
              ? Object.entries(typingUsers[convo.id]).some(
                  ([uid, t]) => uid !== user.id && t,
                )
              : false;

            const hasUnread =
              lastMsg && lastMsg.senderId !== user.id && !lastMsg.isRead;

            return (
              <div
                key={convo.id}
                id={`convo-${convo.id}`}
                className={`relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-0.5 border active-press fade-in-list ${isActive ? 'bg-[var(--theme-btn-active)] border-[var(--accent-primary)] shadow-[var(--btn-shadow)]' : 'bg-transparent border-transparent hover:bg-[var(--bg-input)] hover:border-[var(--glass-border)]'}`}
                onClick={() => dispatch(setActiveConversation(convo.id))}
              >
                {/* Left active glow bar */}
                <span
                  className={`absolute left-0 w-[3.5px] rounded-r bg-[var(--accent-primary)] transition-all duration-200
                  ${isActive ? 'h-7 top-[11.5px]' : 'h-0 top-[25px] opacity-0'}`}
                />
                <Avatar
                  letter={details.letter}
                  status={recipientStatus}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span
                      className={`font-semibold text-[13px] truncate ${isActive ? 'text-[var(--theme-btn-active-text)]' : 'text-[var(--text-primary)]'} ${hasUnread ? 'font-bold text-[var(--text-primary)]' : ''}`}
                    >
                      {details.name}
                    </span>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse shrink-0" />
                      )}
                      {lastMsg && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  {isTyping ? (
                    <div className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--accent-secondary)]">
                      <span>typing</span>
                      <span
                        className="typing-dot"
                        style={{ animationDelay: '0s' }}
                      />
                      <span
                        className="typing-dot"
                        style={{ animationDelay: '0.15s' }}
                      />
                    </div>
                  ) : (
                    <div className="text-[11.5px] truncate text-[var(--text-secondary)]">
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
