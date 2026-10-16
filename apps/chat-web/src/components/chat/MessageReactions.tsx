'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ReactionItem } from './ReactionItem';

export interface ReactionData {
  emoji: string;
  userIds: string[];
}

interface MessageReactionsProps {
  reactions: ReactionData[];
  currentUserId?: string;
  onToggleReaction: (emoji: string) => void;
  getReactingUserNames: (userIds: string[]) => string[];
}

interface OverflowReactionItemProps {
  overflowReactions: ReactionData[];
  currentUserId?: string;
  onToggleReaction: (emoji: string) => void;
  getReactingUserNames: (userIds: string[]) => string[];
}

export const OverflowReactionItem: React.FC<OverflowReactionItemProps> = ({
  overflowReactions,
  currentUserId,
  onToggleReaction,
  getReactingUserNames,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alignment, setAlignment] = useState<'center' | 'left' | 'right'>(
    'center',
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const hasCurrentUserReacted = overflowReactions.some((r) =>
    r.userIds.includes(currentUserId || ''),
  );

  const calculateAlignment = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const chatContainer =
        containerRef.current.closest<HTMLElement>('.bg-theme-chat') ||
        document.body;
      const chatRect = chatContainer.getBoundingClientRect();

      const leftEdge = Math.max(chatRect.left, 0);
      const rightEdge = Math.min(chatRect.right, window.innerWidth);

      const spaceLeft = rect.left - leftEdge;
      const spaceRight = rightEdge - rect.right;

      if (spaceRight < 150 && spaceLeft >= 150) {
        setAlignment('right');
      } else if (spaceLeft < 150 && spaceRight >= 150) {
        setAlignment('left');
      } else if (spaceRight < 130) {
        setAlignment('right');
      } else if (spaceLeft < 130) {
        setAlignment('left');
      } else {
        setAlignment('center');
      }
    }
  };

  const handleMouseEnter = () => {
    calculateAlignment();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  // Close popover on outside click if opened on touch devices
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const totalOverflowVotes = overflowReactions.reduce(
    (sum, r) => sum + r.userIds.length,
    0,
  );

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Overflow Trigger Bubble (+X) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          calculateAlignment();
          setIsOpen((prev) => !prev);
        }}
        className={`flex items-center justify-center px-2 py-0.5 rounded-full text-[12px] font-semibold border cursor-pointer transition-all duration-150 active-press select-none ${
          hasCurrentUserReacted
            ? 'bg-[var(--accent-ring)] border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-xs'
            : 'bg-theme-input/50 border-glass/40 text-theme-muted hover:bg-theme-input hover:text-theme-primary hover:border-glass hover:scale-105'
        }`}
        title={`${overflowReactions.length} more reactions`}
      >
        <span>+{overflowReactions.length}</span>
      </button>

      {/* Overflow Hover Popover */}
      {isOpen && (
        <div
          className={`absolute bottom-full mb-2 z-[9999] flex flex-col animate-fade-in ${
            alignment === 'left'
              ? 'left-[-6px] items-start'
              : alignment === 'right'
                ? 'right-[-6px] items-end'
                : 'left-1/2 -translate-x-1/2 items-center'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-zinc-900/95 dark:bg-zinc-900/95 text-white text-[11px] font-medium p-3 rounded-2xl w-[260px] max-w-[calc(100vw-32px)] border border-white/10 shadow-2xl backdrop-blur-md flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 select-none">
              <span className="font-bold text-[var(--accent-primary)] text-[11.5px]">
                +{overflowReactions.length} More Reactions
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {totalOverflowVotes} total
              </span>
            </div>

            {/* List of Overflow Reactions with usernames */}
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
              {overflowReactions.map((react) => {
                const names = getReactingUserNames(react.userIds);
                const hasReacted = react.userIds.includes(currentUserId || '');

                return (
                  <button
                    key={react.emoji}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleReaction(react.emoji);
                    }}
                    className={`flex items-start gap-2.5 p-1.5 rounded-xl text-left border-none transition-all cursor-pointer ${
                      hasReacted
                        ? 'bg-[var(--accent-primary)]/25 text-white ring-1 ring-[var(--accent-primary)]/50'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-200'
                    }`}
                    title={`Click to react with ${react.emoji}`}
                  >
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <span className="text-[17px] leading-none select-none">
                        {react.emoji}
                      </span>
                      {react.userIds.length > 1 && (
                        <span className="text-[11px] font-bold text-zinc-400">
                          {react.userIds.length}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[11px] font-semibold text-white break-words leading-tight">
                        {names.join(', ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pointer Arrow */}
          <div
            className={`w-2.5 h-2.5 bg-zinc-900/95 dark:bg-zinc-900/95 border-r border-b border-white/10 rotate-45 -mt-1.25 ${
              alignment === 'left'
                ? 'ml-4'
                : alignment === 'right'
                  ? 'mr-4'
                  : 'self-center'
            }`}
          />
        </div>
      )}
    </div>
  );
};

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  onToggleReaction,
  getReactingUserNames,
}) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  // If one message has more than 5 reactions, display 4 and the overflow bubble +X
  const hasOverflow = reactions.length > 5;
  const visibleReactions = hasOverflow ? reactions.slice(0, 4) : reactions;
  const overflowReactions = hasOverflow ? reactions.slice(4) : [];

  return (
    <div className="flex flex-wrap gap-1 mt-1.5 select-none items-center">
      {visibleReactions.map((react, rIdx) => (
        <ReactionItem
          key={react.emoji + rIdx}
          react={react}
          hasReacted={react.userIds.includes(currentUserId || '')}
          onToggle={() => onToggleReaction(react.emoji)}
          userNames={getReactingUserNames(react.userIds)}
        />
      ))}

      {hasOverflow && overflowReactions.length > 0 && (
        <OverflowReactionItem
          overflowReactions={overflowReactions}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
          getReactingUserNames={getReactingUserNames}
        />
      )}
    </div>
  );
};
