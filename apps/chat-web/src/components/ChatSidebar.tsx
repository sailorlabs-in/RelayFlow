import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';

import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchUserProfile,
  setActiveConversation,
  deleteConversation,
  toggleMuteConversation,
} from '../store/slices/chatSlice';

import { Avatar } from './Avatar';
import { IconSettings, IconCompose, IconLogout, IconChat } from './Icons';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';

interface ContextMenuState {
  conversationId: string;
  x: number;
  y: number;
}

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
    pendingRequests,
    mutedConversationIds,
  } = useAppSelector((s) => s.chat);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Fetch missing user profiles for DM recipients
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

  // Close context menu on outside click, Escape, or scroll
  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handleClick = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    const handleScroll = () => setContextMenu(null);

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, conversationId: string) => {
      e.preventDefault();
      e.stopPropagation();

      // Clamp so menu never leaves viewport
      const menuW = 190;
      const menuH = 110;
      const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
      const y = Math.min(e.clientY, window.innerHeight - menuH - 8);

      setContextMenu({ conversationId, x, y });
    },
    [],
  );

  const handleMuteToggle = useCallback(
    (conversationId: string) => {
      if (!user) {
        return;
      }
      const isMuted = mutedConversationIds.includes(conversationId);
      dispatch(toggleMuteConversation({ conversationId, userId: user.id }));
      showToast.info(
        isMuted
          ? 'Notifications unmuted for this thread.'
          : 'Notifications muted for this thread.',
      );
      setContextMenu(null);
    },
    [dispatch, mutedConversationIds, user],
  );

  const handleDeleteRequest = useCallback((conversationId: string) => {
    setDeleteTargetId(conversationId);
    setContextMenu(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTargetId) {
      return;
    }
    setIsDeleting(true);
    try {
      await dispatch(deleteConversation(deleteTargetId)).unwrap();
      showToast.success('Conversation deleted.');
    } catch {
      showToast.error('Failed to delete the conversation. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  }, [dispatch, deleteTargetId]);

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
        name: r.username
          ? `@${r.username}`
          : r.displayName || r.email.split('@')[0],
        letter: (r.username || r.displayName || r.email)[0].toUpperCase(),
        email: r.email,
        id: r.id,
        avatarUrl: r.avatarUrl,
      };
    }

    return {
      name: 'Direct Message',
      letter: 'D',
      email: '',
      id: null,
      avatarUrl: undefined,
    };
  };

  if (!user) {
    return <div className="w-[300px]" />;
  }

  // --- SVG icons for context menu ---
  const IconMute = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="15"
      height="15"
    >
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );

  const IconUnmute = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="15"
      height="15"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );

  const IconTrash = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="15"
      height="15"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );

  const IconMuteBadge = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="11"
      height="11"
    >
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );

  return (
    <>
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
            letter={(user.username ||
              user.displayName ||
              user.email)[0].toUpperCase()}
            url={user.avatarUrl}
            status={ownStatus}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13.5px] truncate text-[var(--text-primary)]">
              {user.username
                ? `@${user.username}`
                : user.displayName || 'Active User'}
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

        {/* Permanent Friends Navigation Item */}
        <div className="px-1.5 pt-2 flex-shrink-0">
          <div
            id="sidebar-friends-tab"
            className={`relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-1 border active-press ${
              activeConversationId === 'friends'
                ? 'bg-[var(--theme-btn-active)] border-[var(--accent-primary)] shadow-[var(--btn-shadow)]'
                : 'bg-transparent border-transparent hover:bg-[var(--bg-input)] hover:border-[var(--glass-border)]'
            }`}
            onClick={() => dispatch(setActiveConversation('friends'))}
          >
            {/* Left active glow bar */}
            <span
              className={`absolute left-0 w-[3.5px] rounded-r bg-[var(--accent-primary)] transition-all duration-200
              ${activeConversationId === 'friends' ? 'h-7 top-[7.5px]' : 'h-0 top-[21px] opacity-0'}`}
            />
            <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-[var(--theme-btn)] text-[var(--accent-primary)] flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-[15px] h-[15px]"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span
                className={`font-semibold text-[13px] ${
                  activeConversationId === 'friends'
                    ? 'text-[var(--theme-btn-active-text)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                Friends
              </span>
            </div>
            {pendingRequests?.incoming?.length > 0 && (
              <span className="bg-[var(--danger)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                {pendingRequests.incoming.length}
              </span>
            )}
          </div>
        </div>

        {/* Direct Messages Label + New DM button */}
        <div className="flex items-center justify-between px-3.5 pt-2 pb-1.5">
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
            <div className="py-10 px-5 text-center text-[13px] leading-relaxed text-theme-muted flex items-center justify-center flex-col h-full">
              <IconChat />
              <p className="mt-3">
                No conversations yet.
                <br />
                Click &quot;New DM&quot; to start one.
              </p>
            </div>
          ) : (
            conversations.map((convo) => {
              const details = getConversationDetails(convo);
              const isActive = convo.id === activeConversationId;
              const isMuted = mutedConversationIds.includes(convo.id);
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
                  onContextMenu={(e) => handleContextMenu(e, convo.id)}
                >
                  {/* Left active glow bar */}
                  <span
                    className={`absolute left-0 w-[3.5px] rounded-r bg-[var(--accent-primary)] transition-all duration-200
                    ${isActive ? 'h-7 top-[11.5px]' : 'h-0 top-[25px] opacity-0'}`}
                  />
                  <Avatar
                    letter={details.letter}
                    url={details.avatarUrl}
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
                        {/* Mute badge */}
                        {isMuted && (
                          <span
                            className="convo-mute-badge"
                            title="Notifications muted"
                          >
                            <IconMuteBadge />
                          </span>
                        )}
                        {hasUnread && (
                          <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse shrink-0" />
                        )}
                        {lastMsg && (
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {new Date(lastMsg.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )}
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
                        {lastMsg
                          ? lastMsg.content ||
                            (lastMsg.mediaType?.startsWith('image/')
                              ? '📷 Photo'
                              : lastMsg.mediaType?.startsWith('video/')
                                ? '🎥 Video'
                                : '📁 Attachment')
                          : 'No messages yet'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right-Click Context Menu — rendered via portal to avoid overflow clipping */}
      {contextMenu &&
        ReactDOM.createPortal(
          <div
            ref={contextMenuRef}
            className="convo-context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            role="menu"
            aria-label="Conversation options"
          >
            {/* Mute / Unmute */}
            <button
              className="convo-context-menu-item"
              role="menuitem"
              onClick={() => handleMuteToggle(contextMenu.conversationId)}
            >
              {mutedConversationIds.includes(contextMenu.conversationId) ? (
                <>
                  <IconUnmute />
                  <span>Unmute Notifications</span>
                </>
              ) : (
                <>
                  <IconMute />
                  <span>Mute Notifications</span>
                </>
              )}
            </button>

            <div className="convo-context-menu-separator" />

            {/* Delete Conversation */}
            <button
              className="convo-context-menu-item danger"
              role="menuitem"
              onClick={() => handleDeleteRequest(contextMenu.conversationId)}
            >
              <IconTrash />
              <span>Delete Conversation</span>
            </button>
          </div>,
          document.body,
        )}

      {/* Confirmation Modal for Delete */}
      {deleteTargetId && (
        <ConfirmationModal
          isOpen={!!deleteTargetId}
          title="Delete Conversation"
          message="This will permanently delete the conversation and all messages for both participants. This action cannot be undone."
          confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTargetId(null)}
          type="danger"
        />
      )}
    </>
  );
};
