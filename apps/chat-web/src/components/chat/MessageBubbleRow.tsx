import React from 'react';
import type { Message, MessageMediaItem } from '../../store/slices/chatSlice';
import { socketManager } from '../../store/socketManager';
import { formatMessageTimestamp } from '../../utils/date';
import { getEmojiSegments } from '../../utils/animatedEmoji';
import { isOnlyEmojis } from './chatUtils';
import { Avatar } from '../Avatar';
import { AnimatedEmoji } from '../AnimatedEmoji';
import { MessageReactions } from './MessageReactions';
import { MessageMedia } from './MessageMedia';
import { MessageContentRenderer } from './MessageContentRenderer';
import { MessageHoverActions } from './MessageHoverActions';
import { MessageEditView } from './MessageEditView';
import { useMessageLongPress } from './useMessageLongPress';
import { IconCheck, IconDoubleCheck } from '../Icons';

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
  handleStartEdit: _handleStartEdit,
  handleDeleteMessage: _handleDeleteMessage,
  setReplyingToMessage,
  setActiveReactionMessageId,
  activeReactionMessageId,
  setActiveMediaItem,
  handleContextMenu,
  handleMobileClick,
  handleLongPress,
  handleOpenProfile,
  canDeleteOthers: _canDeleteOthers,
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
      className={`flex items-start gap-2.5 group ${
        editingMessageId === msg.id
          ? 'w-full max-w-[94%] sm:max-w-[85%] md:max-w-[72%]'
          : 'max-w-[85%] md:max-w-[72%]'
      } animate-fade-in select-none md:select-auto cursor-default transition-all ${
        isOut ? 'self-end' : 'self-start'
      }`}
    >
      {/* Outgoing hover action toolbar (Desktop) */}
      {isOut && editingMessageId !== msg.id && (
        <MessageHoverActions
          msg={msg}
          activeConversationId={activeConversationId}
          onReply={setReplyingToMessage}
          onOpenReactionPicker={(id) => setActiveReactionMessageId(id)}
          isReactionPickerOpen={activeReactionMessageId === msg.id}
          currentUserId={user?.id}
        />
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
        className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} min-w-0 ${
          editingMessageId === msg.id ? 'w-full' : ''
        }`}
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
            className="flex flex-col text-[11px] bg-theme-input/40 border-l-[3px] border-l-(--accent-primary) rounded-r-xl px-2.5 py-1 mb-1.5 cursor-pointer hover:bg-theme-input/70 transition-colors max-w-full select-none"
            title="Click to jump to message"
          >
            <span className="font-semibold text-(--accent-primary) text-[10.5px] leading-tight truncate">
              {userProfiles[msg.parentMessage.senderId]?.displayName ||
                userProfiles[msg.parentMessage.senderId]?.username ||
                (msg.parentMessage.senderId === user?.id ? 'You' : 'User')}
            </span>
            <span className="truncate text-theme-muted text-[11px] leading-tight mt-0.5">
              {msg.parentMessage.content || 'Photo / Attachment'}
            </span>
          </div>
        )}

        {/* Editing or Message Bubble Content */}
        {editingMessageId === msg.id ? (
          <MessageEditView
            messageId={msg.id}
            initialContent={msg.content}
            editingContent={editingContent}
            setEditingContent={setEditingContent}
            onSave={handleSaveEdit}
            onCancel={() => {
              setEditingMessageId(null);
              setEditingContent('');
            }}
          />
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
                      className={`flex items-center gap-2 select-none md:select-auto my-1.5 flex-wrap touch-pan-y ${
                        isOut ? 'justify-end' : 'justify-start'
                      }`}
                      style={{
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        WebkitTouchCallout: 'none',
                      }}
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
                        ? `text-[60px] leading-15 wrap-break-word select-none md:select-auto touch-pan-y ${
                            isOut ? 'text-right' : 'text-left'
                          }`
                        : `px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed wrap-break-word shadow-xs ${
                            isOut ? 'msg-bubble-out' : 'msg-bubble-in'
                          }`
                    }
                    style={
                      isOnlyEmojis(msg.content)
                        ? {
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                          }
                        : undefined
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
          <MessageReactions
            reactions={msg.reactions}
            currentUserId={user?.id}
            onToggleReaction={(emoji) => {
              if (activeConversationId) {
                socketManager.toggleReaction(
                  msg.id,
                  activeConversationId,
                  emoji,
                );
              }
            }}
            getReactingUserNames={getReactingUserNames}
          />
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
        <MessageHoverActions
          msg={msg}
          activeConversationId={activeConversationId}
          onReply={setReplyingToMessage}
          onOpenReactionPicker={(id) => setActiveReactionMessageId(id)}
          isReactionPickerOpen={activeReactionMessageId === msg.id}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
};
