'use client';

import React from 'react';
import type { Message } from '../../store/slices/chatSlice';
import { socketManager } from '../../store/socketManager';
import { useHotReactions } from './useHotReactions';

interface MessageHoverActionsProps {
  msg: Message;
  activeConversationId?: string | null;
  onReply: (msg: Message) => void;
  onOpenReactionPicker: (msgId: string) => void;
  isReactionPickerOpen?: boolean;
  currentUserId?: string;
  className?: string;
}

export const MessageHoverActions: React.FC<MessageHoverActionsProps> = ({
  msg,
  activeConversationId,
  onReply,
  onOpenReactionPicker,
  isReactionPickerOpen = false,
  currentUserId,
  className = '',
}) => {
  const { hotReactions } = useHotReactions(currentUserId);

  return (
    <div
      className={`hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-glass bg-(--glass-bg) backdrop-blur-md shadow-md transition-all duration-150 shrink-0 self-center select-none ${
        isReactionPickerOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 group-hover:opacity-100 pointer-events-auto'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Hot Reactions */}
      <div className="flex items-center gap-0.5">
        {hotReactions.map((emoji) => {
          const hasReacted = msg.reactions?.some(
            (r) => r.emoji === emoji && r.userIds.includes(currentUserId || ''),
          );

          return (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                if (activeConversationId) {
                  socketManager.toggleReaction(
                    msg.id,
                    activeConversationId,
                    emoji,
                  );
                }
              }}
              className={`w-6.5 h-6.5 flex items-center justify-center text-[15px] hover:scale-130 active:scale-110 transition-transform rounded-full cursor-pointer border-none ${
                hasReacted
                  ? 'bg-(--accent-ring) ring-1 ring-(--accent-primary)/60'
                  : 'bg-transparent hover:bg-theme-input/80'
              }`}
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      {/* More Reactions (+) */}
      <button
        type="button"
        onClick={() => onOpenReactionPicker(msg.id)}
        className="w-6.5 h-6.5 flex items-center justify-center text-theme-muted hover:text-theme-primary rounded-full hover:bg-theme-input/80 cursor-pointer border-none bg-transparent transition-colors"
        title="More reactions"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          width="13"
          height="13"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-3.5 bg-theme/20 mx-0.5" />

      {/* Reply Button */}
      <button
        type="button"
        onClick={() => onReply(msg)}
        className="w-6.5 h-6.5 flex items-center justify-center text-theme-muted hover:text-theme-primary rounded-full hover:bg-theme-input/80 cursor-pointer border-none bg-transparent transition-colors"
        title="Reply"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          width="13"
          height="13"
        >
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      </button>
    </div>
  );
};
