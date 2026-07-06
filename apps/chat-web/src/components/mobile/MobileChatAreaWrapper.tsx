import React, { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { Avatar } from '../Avatar';
import { ChatArea } from '../ChatArea';
import { PRESENCE_STATUS_DETAILS } from '@chat-app/shared-constants';
import {
  setActiveConversation,
  deleteConversation,
  startOutgoingCall,
} from '../../store/slices/chatSlice';
import { setActiveChannel } from '../../store/slices/groupsSlice';
import { socketManager } from '../../store/socketManager';
import { showToast } from '../toast';

interface MobileChatAreaWrapperProps {
  setIsComposeOpen: (open: boolean) => void;
  isMembersListOpen: boolean;
  setIsMembersListOpen: (open: boolean) => void;
  setLocalConfirmModal: (
    modal: { title: string; message: string; onConfirm: () => void } | null,
  ) => void;
}

export const MobileChatAreaWrapper = ({
  setIsComposeOpen,
  isMembersListOpen,
  setIsMembersListOpen,
  setLocalConfirmModal,
}: MobileChatAreaWrapperProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const {
    conversations,
    activeConversationId,
    messages,
    onlineUsers,
    userProfiles,
    convoRecipients,
  } = useAppSelector((s) => s.chat);

  const { groups: rawGroups, activeChannelId } = useAppSelector(
    (s) => s.groups,
  );
  const groups = Array.isArray(rawGroups) ? rawGroups : [];

  const activeGroup = useMemo(() => {
    if (activeChannelId) {
      return (
        groups.find((g) => g.channels.some((c) => c.id === activeChannelId)) ||
        null
      );
    }
    return null;
  }, [groups, activeChannelId]);

  const showChannelChat = !!activeChannelId;
  const effectiveActiveConversationId = showChannelChat
    ? activeChannelId || activeConversationId
    : activeConversationId;
  const isChannelModeEffective = showChannelChat;

  const handleMobileBack = () => {
    dispatch(setActiveConversation(null));
    dispatch(setActiveChannel(null));
  };

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
        name: r.username ? r.username : r.displayName || r.email.split('@')[0],
        letter: (r.username || r.displayName || r.email)[0].toUpperCase(),
        email: r.email,
        id: r.id,
        avatarUrl: r.avatarUrl,
        avatarThumbnailUrl: r.avatarThumbnailUrl,
      };
    }

    return {
      name: 'Direct Message',
      letter: 'D',
      email: '',
      id: null,
      avatarUrl: undefined,
      avatarThumbnailUrl: undefined,
    };
  };

  // Resolve header details
  let headerName = '';
  let headerLetter = '';
  let headerAvatarUrl: string | undefined;
  let headerSubtitle: React.ReactNode = null;
  let otherUserId = '';

  if (isChannelModeEffective && activeGroup) {
    const chan = activeGroup.channels.find((c) => c.id === activeChannelId);
    headerName = chan?.name || '';
    headerSubtitle = (
      <span className="text-[10px] text-theme-muted">{activeGroup.name}</span>
    );
  } else if (!isChannelModeEffective && activeConversationId) {
    const convo = conversations.find((c) => c.id === activeConversationId);
    if (convo) {
      const det = getConversationDetails(convo);
      headerName = det.name;
      headerLetter = det.letter;
      headerAvatarUrl = det.avatarThumbnailUrl || det.avatarUrl;
      otherUserId = det.id || '';
      const recipStatus = det.id ? onlineUsers[det.id] || 'offline' : 'offline';
      const presenceInfo = PRESENCE_STATUS_DETAILS.find(
        (p) => p.id === recipStatus,
      );
      headerSubtitle = (
        <span
          className="text-[10px] font-medium"
          style={{ color: presenceInfo?.color || 'var(--text-muted)' }}
        >
          {presenceInfo?.name || 'Offline'}
        </span>
      );
    }
  }

  const handleStartCall = () => {
    if (!activeConversationId || !otherUserId) {
      return;
    }
    dispatch(
      startOutgoingCall({
        conversationId: activeConversationId,
        targetUserId: otherUserId,
        callerName:
          user?.displayName ||
          user?.username ||
          user?.email?.split('@')[0] ||
          'User',
      }),
    );
    socketManager.startDmCall(otherUserId, activeConversationId);
  };

  const handleDeleteConversation = () => {
    if (!activeConversationId) {
      return;
    }
    setLocalConfirmModal({
      title: 'Delete Chat',
      message:
        'Are you sure you want to delete this conversation and all messages for both participants?',
      onConfirm: async () => {
        try {
          await dispatch(deleteConversation(activeConversationId)).unwrap();
          showToast.success('Conversation deleted.');
          handleMobileBack();
        } catch {
          showToast.error('Failed to delete conversation.');
        } finally {
          setLocalConfirmModal(null);
        }
      },
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-theme-primary overflow-hidden">
      {/* Mobile Chat Header Bar */}
      <header className="glass-panel mx-3 mt-3 px-3 py-2.5 flex items-center gap-2.5 shrink-0 rounded-2xl border border-glass shadow-lg z-10">
        <button
          onClick={handleMobileBack}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-theme-muted hover:bg-theme-input active-press shrink-0"
          title="Back"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="w-5 h-5"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        {/* Avatar + Name */}
        {isChannelModeEffective ? (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-(--accent-primary)/15 text-(--accent-primary) shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4"
              >
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="15" x2="20" y2="15" />
                <line x1="10" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="14" y2="21" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold truncate text-theme-primary">
                {headerName}
              </div>
              {headerSubtitle}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Avatar letter={headerLetter} url={headerAvatarUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold truncate text-theme-primary">
                {headerName}
              </div>
              {headerSubtitle}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {isChannelModeEffective ? (
          <button
            onClick={() => setIsMembersListOpen(!isMembersListOpen)}
            className={`w-8 h-8 flex items-center justify-center rounded-xl active-press shrink-0 ${
              isMembersListOpen
                ? 'text-(--accent-primary) bg-(--accent-primary)/10'
                : 'text-theme-muted hover:bg-theme-input'
            }`}
            title="Toggle Members"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4.5 h-4.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleStartCall}
              className="w-8 h-8 flex items-center justify-center rounded-xl active-press text-theme-muted hover:bg-theme-input"
              title="Start Call"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-4.5 h-4.5"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>

            <button
              onClick={handleDeleteConversation}
              className="w-8 h-8 flex items-center justify-center rounded-xl active-press text-red-500 hover:bg-red-500/10"
              title="Delete Thread"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4.5 h-4.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* Chat Area fills remaining space */}
      <div className="flex-1 min-h-0 mx-3 mb-4 mt-2 rounded-2xl overflow-hidden">
        <ChatArea
          activeConversationId={effectiveActiveConversationId}
          setIsComposeOpen={setIsComposeOpen}
          isChannelMode={isChannelModeEffective}
          activeChannelName={
            isChannelModeEffective && activeGroup
              ? activeGroup.channels.find((c) => c.id === activeChannelId)
                  ?.name || null
              : null
          }
          isMembersListOpen={isMembersListOpen}
          onToggleMembersList={() => setIsMembersListOpen(!isMembersListOpen)}
          onMenuClick={handleMobileBack}
          isMobileView={true}
        />
      </div>
    </div>
  );
};
