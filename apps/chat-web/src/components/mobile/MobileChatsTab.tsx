import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { Avatar } from '../Avatar';
import { IconChat } from '../Icons';
import { formatMessageTimestamp } from '../../utils/date';
import { setActiveConversation } from '../../store/slices/chatSlice';
import {
  setActiveChannel,
  setActiveGroup,
} from '../../store/slices/groupsSlice';

import { formatLastMessagePreview } from '../../utils/chat';

interface MobileChatsTabProps {
  handleTouchStart: (
    type: 'chat' | 'group',
    id: string,
    e: React.TouchEvent,
  ) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
}

export const MobileChatsTab = ({
  handleTouchStart,
  handleTouchEnd,
}: MobileChatsTabProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const {
    conversations,
    messages,
    typingUsers,
    onlineUsers,
    userProfiles,
    convoRecipients,
  } = useAppSelector((s) => s.chat);

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

  if (!user) {
    return <React.Fragment />;
  }

  return (
    <div className="flex flex-col gap-2 h-full pb-1 overflow-y-auto px-3 py-3">
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-theme-muted">
          <IconChat />
          <p className="mt-4 text-[13px]">
            No conversations yet. Start a new DM!
          </p>
        </div>
      ) : (
        conversations.map((convo) => {
          const details = getConversationDetails(convo);
          const recipientStatus = details.id
            ? onlineUsers[details.id] || 'offline'
            : 'offline';
          const convoMsgs = messages[convo.id] || [];
          const lastMsg = convoMsgs[convoMsgs.length - 1] ?? convo.lastMessage;
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
              onClick={() => {
                // Clear any group/channel state before opening DM
                dispatch(setActiveChannel(null));
                dispatch(setActiveGroup(null));
                dispatch(setActiveConversation(convo.id));
              }}
              onTouchStart={(e) => handleTouchStart('chat', convo.id, e)}
              onTouchEnd={handleTouchEnd}
              className="glass-panel relative flex items-center gap-3 p-3 rounded-[20px] cursor-pointer border border-glass hover:bg-theme-input transition-all duration-200 shadow-sm active:scale-[0.98]"
            >
              <Avatar
                letter={details.letter}
                url={details.avatarThumbnailUrl || details.avatarUrl}
                status={recipientStatus}
                size="md"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-0.5">
                  <span
                    className={`font-bold text-[14px] truncate ${
                      hasUnread
                        ? 'text-theme-primary font-extrabold'
                        : 'text-theme-primary'
                    }`}
                  >
                    {details.name}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {hasUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-(--accent-primary) animate-pulse" />
                    )}
                    {lastMsg && (
                      <span className="text-[10px] text-theme-muted">
                        {formatMessageTimestamp(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                {isTyping ? (
                  <div className="text-[11.5px] font-semibold text-(--accent-secondary) flex items-center gap-1">
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
                  <p
                    className={`text-[12px] truncate ${
                      hasUnread
                        ? 'text-theme-primary font-semibold'
                        : 'text-theme-muted'
                    }`}
                  >
                    {formatLastMessagePreview(lastMsg, user.id)}
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
