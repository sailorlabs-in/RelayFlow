import React from 'react';
import type { Message, MessageMediaItem } from '../../store/slices/chatSlice';
import { socketManager } from '../../store/socketManager';
import { formatMessageTimestamp } from '../../utils/date';
import { getEmojiSegments } from '../../utils/animatedEmoji';
import { isOnlyEmojis } from './chatUtils';
import { Avatar } from '../Avatar';
import { AnimatedEmoji } from '../AnimatedEmoji';
import { ReactionItem } from './ReactionItem';
import { MessageMedia } from './MessageMedia';
import { MessageContentRenderer } from './MessageContentRenderer';
import { useMessageLongPress } from './useMessageLongPress';
import { IconCheck, IconDoubleCheck, IconCompose, IconTrash } from '../Icons';

interface MessageBubbleRowProps {
  msg: Message;
  user: any;
  userProfiles: Record<string, any>;
  onlineUsers: Record<string, string>;
  isChannelMode: boolean;
  activeGroup?: any;
  timeFormat: string;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  editingContent: string;
  setEditingContent: (content: string) => void;
  handleSaveEdit: (msgId: string) => void;
  handleStartEdit: (msg: Message) => void;
  handleDeleteMessage: (msgId: string) => void;
  setReplyingToMessage: (msg: Message | null) => void;
  setActiveReactionMessageId: (id: string | null) => void;
  activeReactionMessageId: string | null;
  setActiveMediaItem: (item: MessageMediaItem | null) => void;
  handleContextMenu: (e: React.MouseEvent, msg: Message) => void;
  handleMobileClick?: (e: React.MouseEvent, msg: Message) => void;
  handleLongPress?: (coords: { x: number; y: number }, msg: Message) => void;
  handleOpenProfile: (e: React.MouseEvent, userId: string) => void;
  canDeleteOthers: boolean;
  activeConversationId: string | null;
  findUserByName: (name: string) => any;
  onViewCode: (code: { code: string; language: string }) => void;
  isMobileScreen: boolean;
  isMobileView: boolean;
  getReactingUserNames: (userIds: string[]) => string[];
}

export const MessageBubbleRow: React.FC<MessageBubbleRowProps> = ({
  msg,
  user,
  userProfiles,
  onlineUsers,
  isChannelMode,
  activeGroup,
  timeFormat,
  editingMessageId,
  setEditingMessageId,
  editingContent,
  setEditingContent,
  handleSaveEdit,
  handleStartEdit,
  handleDeleteMessage,
  setReplyingToMessage,
  setActiveReactionMessageId,
  activeReactionMessageId,
  setActiveMediaItem,
  handleContextMenu,
  handleMobileClick,
  handleLongPress,
  handleOpenProfile,
  canDeleteOthers,
  activeConversationId,
  findUserByName,
  onViewCode,
  isMobileScreen,
  isMobileView,
  getReactingUserNames,
}) => {
  const isOut = msg.senderId === user?.id;
  const senderProfile = userProfiles[msg.senderId];
  const senderName = isOut
    ? user?.username || user?.displayName || user?.email?.split('@')[0] || 'You'
    : senderProfile?.username ||
      senderProfile?.displayName ||
      senderProfile?.email?.split('@')[0] ||
      'User';

  let senderColor = 'inherit';
  if (isChannelMode && activeGroup) {
    const member = activeGroup.members?.find(
      (mem: any) => mem.userId === msg.senderId,
    );
    if (member) {
      const isOwnerSender =
        member.role === 'owner' || msg.senderId === activeGroup.ownerId;
      if (isOwnerSender) {
        senderColor = '#eab308';
      } else {
        const memberRoleIds = member.roleIds || [];
        const matchingRole = activeGroup.roles?.find((r: any) =>
          memberRoleIds.includes(r.id),
        );
        senderColor = matchingRole?.color || 'inherit';
      }
    }
  }

  const letter = senderName[0]?.toUpperCase() || 'U';
  const presenceStatus = isOut
    ? onlineUsers[user?.id] || user?.status || 'online'
    : onlineUsers[msg.senderId] || 'offline';

  const emojiSegments = getEmojiSegments(msg.content);
  const isMobile = isMobileScreen || isMobileView;

  const { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onClick } =
    useMessageLongPress({
      msg,
      isMobile,
      onLongPress: handleLongPress,
    });

  return (
    <div
      id={`msg-${msg.id}`}
      onContextMenu={(e) => handleContextMenu(e, msg)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onClick={(e) => {
        onClick(e);
        if (handleMobileClick && isMobile) {
          // If a custom mobile click handler is provided and long press didn't trigger
          handleMobileClick(e, msg);
        }
      }}
      className={`flex items-start gap-2.5 group max-w-[85%] md:max-w-[72%] animate-fade-in select-none md:select-auto cursor-default transition-all ${
        isOut ? 'self-end' : 'self-start'
      }`}
    >
      {/* Outgoing hover action toolbar (Desktop) */}
      {isOut && editingMessageId !== msg.id && (
        <div
          className={`hidden md:flex items-center gap-1 transition-opacity duration-150 shrink-0 self-center ${
            activeReactionMessageId === msg.id
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            onClick={() => setReplyingToMessage(msg)}
            className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] hover:bg-theme-input/80 active-press transition-colors shadow-xs"
            title="Reply to message"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-4 h-4"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setActiveReactionMessageId(msg.id)}
              className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] hover:bg-theme-input/80 active-press transition-colors shadow-xs"
              title="Add reaction"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="w-4 h-4"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => handleStartEdit(msg)}
            className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] hover:bg-theme-input/80 active-press transition-colors shadow-xs"
            title="Edit message"
          >
            <IconCompose />
          </button>
          <button
            onClick={() => handleDeleteMessage(msg.id)}
            className="msg-delete-btn flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-[var(--danger-bg)] text-[var(--danger)] active-press transition-colors shadow-xs"
            title="Delete message"
          >
            <IconTrash />
          </button>
        </div>
      )}

      {/* Incoming Avatar in Channel Mode */}
      {!isOut && isChannelMode && (
        <div
          onClick={(e) => handleOpenProfile(e, msg.senderId)}
          className="shrink-0 mt-0.5 cursor-pointer active-press hover:scale-105 transition-all"
        >
          <Avatar
            letter={letter}
            url={senderProfile?.avatarThumbnailUrl || senderProfile?.avatarUrl}
            status={presenceStatus}
            size="sm"
          />
        </div>
      )}

      <div
        className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} min-w-0`}
      >
        {/* Sender name for channel mode */}
        {!isOut && isChannelMode && (
          <span
            onClick={(e) => handleOpenProfile(e, msg.senderId)}
            style={{
              color: senderColor !== 'inherit' ? senderColor : undefined,
            }}
            className="text-[11.5px] font-bold mb-1 ml-1.5 text-theme-secondary cursor-pointer hover:underline"
          >
            {senderName}
          </span>
        )}

        {/* Replying-to Preview Quote Banner */}
        {msg.parentMessage && (
          <div
            onClick={() => {
              const el = document.getElementById(`msg-${msg.parentId}`);
              if (el) {
                el.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                });
                el.classList.add('highlight-flash');
                setTimeout(() => el.classList.remove('highlight-flash'), 2000);
              }
            }}
            className="flex items-center gap-1.5 text-[11px] text-theme-secondary bg-theme-input/60 border border-glass/40 rounded-xl px-2.5 py-1 mb-1.5 w-fit cursor-pointer hover:bg-theme-input transition-colors max-w-full shadow-xs"
            title="Click to jump to message"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-3 h-3 text-[var(--accent-primary)] shrink-0"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            <span className="font-bold text-theme-primary shrink-0">
              {userProfiles[msg.parentMessage.senderId]?.displayName ||
                userProfiles[msg.parentMessage.senderId]?.username ||
                (msg.parentMessage.senderId === user?.id ? 'You' : 'User')}
            </span>
            <span className="truncate opacity-80">
              {msg.parentMessage.content}
            </span>
          </div>
        )}

        {/* Editing or Message Bubble Content */}
        {editingMessageId === msg.id ? (
          <div className="flex flex-col gap-2 mt-1 w-65 sm:w-87.5">
            <textarea
              autoFocus
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit(msg.id);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingMessageId(null);
                  setEditingContent('');
                }
              }}
              className="w-full bg-theme-input text-theme-primary border border-theme rounded-xl p-2.5 text-sm focus:outline-none focus:border-(--accent-primary) resize-none shadow-inner"
              rows={2}
            />
            <div className="flex gap-2 justify-end text-[11px] text-theme-muted">
              <span>
                escape to{' '}
                <button
                  onClick={() => {
                    setEditingMessageId(null);
                    setEditingContent('');
                  }}
                  className="text-(--accent-primary) hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  cancel
                </button>
              </span>
              <span>•</span>
              <span>
                enter to{' '}
                <button
                  onClick={() => handleSaveEdit(msg.id)}
                  className="text-(--accent-primary) hover:underline cursor-pointer bg-transparent border-none p-0 font-bold"
                >
                  save
                </button>
              </span>
            </div>
          </div>
        ) : (
          <>
            {msg.content &&
              (() => {
                if (
                  emojiSegments &&
                  emojiSegments.length >= 1 &&
                  emojiSegments.length <= 2
                ) {
                  return (
                    <div
                      className={`flex items-center gap-2 select-all my-1.5 flex-wrap ${
                        isOut ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {emojiSegments.map((glyph, idx) => (
                        <AnimatedEmoji
                          key={`${msg.id}-anim-bubble-${glyph}-${idx}`}
                          glyph={glyph}
                          size={emojiSegments.length === 1 ? 84 : 68}
                        />
                      ))}
                    </div>
                  );
                }
                return (
                  <div
                    className={
                      isOnlyEmojis(msg.content)
                        ? `text-[60px] leading-15 wrap-break-word select-all ${
                            isOut ? 'text-right' : 'text-left'
                          }`
                        : `px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed wrap-break-word shadow-xs ${
                            isOut ? 'msg-bubble-out' : 'msg-bubble-in'
                          }`
                    }
                  >
                    {isOnlyEmojis(msg.content) ? (
                      msg.content
                    ) : (
                      <MessageContentRenderer
                        content={msg.content}
                        isMarkdownMsg={msg.isMarkdown}
                        isChannelMode={isChannelMode}
                        currentUser={user}
                        activeGroup={activeGroup}
                        findUserByName={findUserByName}
                        onOpenProfile={handleOpenProfile}
                        onViewCode={onViewCode}
                        isMobile={isMobile}
                      />
                    )}
                  </div>
                );
              })()}
          </>
        )}

        {/* Media Attachments */}
        <MessageMedia msg={msg} onMediaClick={setActiveMediaItem} />

        {/* Reactions List */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 select-none">
            {msg.reactions.map((react, rIdx) => (
              <ReactionItem
                key={react.emoji + rIdx}
                react={react}
                hasReacted={react.userIds.includes(user?.id || '')}
                onToggle={() => {
                  if (activeConversationId) {
                    socketManager.toggleReaction(
                      msg.id,
                      activeConversationId,
                      react.emoji,
                    );
                  }
                }}
                userNames={getReactingUserNames(react.userIds)}
              />
            ))}
          </div>
        )}

        {/* Footer Meta: Timestamp, Edited tag, Read checkmarks */}
        <div className="flex items-center gap-1.5 mt-1 px-1 select-none">
          <span className="text-[10px] text-theme-muted font-mono">
            {formatMessageTimestamp(msg.createdAt, timeFormat)}
          </span>
          {msg.isEdited && (
            <span className="text-[9.5px] text-theme-muted opacity-85 select-none italic">
              (edited)
            </span>
          )}
          {isOut && !isChannelMode && (
            <span
              className={`inline-flex items-center ${
                msg.isRead ? 'text-(--accent-primary)' : 'text-theme-muted'
              }`}
              title={msg.isRead ? 'Read' : 'Sent'}
            >
              {msg.isRead ? <IconDoubleCheck /> : <IconCheck />}
            </span>
          )}
        </div>
      </div>

      {/* Incoming hover action toolbar (Desktop) */}
      {!isOut && editingMessageId !== msg.id && (
        <div
          className={`hidden md:flex items-center gap-1 transition-opacity duration-150 shrink-0 self-center ${
            activeReactionMessageId === msg.id
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            onClick={() => setReplyingToMessage(msg)}
            className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] hover:bg-theme-input/80 active-press transition-colors shadow-xs"
            title="Reply to message"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-4 h-4"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={() => setActiveReactionMessageId(msg.id)}
              className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] hover:bg-theme-input/80 active-press transition-colors shadow-xs"
              title="Add reaction"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="w-4 h-4"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
              </svg>
            </button>
          </div>
          {canDeleteOthers && (
            <button
              onClick={() => handleDeleteMessage(msg.id)}
              className="msg-delete-btn flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-[var(--danger-bg)] text-[var(--danger)] active-press transition-colors shadow-xs"
              title="Delete message"
            >
              <IconTrash />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
