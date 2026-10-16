import React, { useState, useRef } from 'react';

interface ReactionItemProps {
  react: { emoji: string; userIds: string[] };
  hasReacted: boolean;
  onToggle: () => void;
  userNames: string[];
}

export const ReactionItem: React.FC<ReactionItemProps> = ({
  react,
  hasReacted,
  onToggle,
  userNames,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [alignment, setAlignment] = useState<'center' | 'left' | 'right'>(
    'center',
  );
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    if (buttonRef.current) {
      const btnRect = buttonRef.current.getBoundingClientRect();
      const chatContainer =
        buttonRef.current.closest<HTMLElement>('.bg-theme-chat') ||
        document.body;
      const chatRect = chatContainer.getBoundingClientRect();

      const leftEdge = Math.max(chatRect.left, 0);
      const rightEdge = Math.min(chatRect.right, window.innerWidth);

      const spaceLeft = btnRect.left - leftEdge;
      const spaceRight = rightEdge - btnRect.right;

      if (spaceLeft < 110 && spaceRight >= 110) {
        setAlignment('left');
      } else if (spaceRight < 110 && spaceLeft >= 110) {
        setAlignment('right');
      } else if (spaceLeft < 110 && spaceRight < 110) {
        setAlignment(spaceLeft < spaceRight ? 'left' : 'right');
      } else if (spaceRight < 150) {
        setAlignment('right');
      } else if (spaceLeft < 150) {
        setAlignment('left');
      } else {
        setAlignment('center');
      }
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative group/reaction flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[13px] border cursor-pointer transition-all duration-150 active-press select-none ${
        hasReacted
          ? 'bg-[var(--accent-ring)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold shadow-xs'
          : 'bg-theme-input/50 border-glass/40 text-theme-secondary hover:bg-theme-input hover:border-glass hover:scale-105'
      }`}
    >
      <span className="leading-none text-[17px]">{react.emoji}</span>
      {react.userIds.length > 1 && (
        <span className="text-[12px] font-medium leading-none">
          {react.userIds.length}
        </span>
      )}

      {/* Collision-detected Tooltip */}
      {isHovered && (
        <div
          className={`absolute bottom-full mb-2 pointer-events-none z-[9999] flex flex-col animate-fade-in ${
            alignment === 'left'
              ? 'left-[-6px] items-start'
              : alignment === 'right'
                ? 'right-[-6px] items-end'
                : 'left-1/2 -translate-x-1/2 items-center'
          }`}
        >
          <div className="bg-zinc-900/95 dark:bg-zinc-900/95 text-white text-[11px] font-medium py-1.5 px-3 rounded-xl max-w-[220px] border border-white/10 dark:border-white/10 shadow-xl text-center leading-normal backdrop-blur-md">
            <span className="font-bold text-[var(--accent-primary)] mb-0.5 block whitespace-nowrap">
              {react.emoji} Reacted by
            </span>
            <span className="opacity-90 break-words line-clamp-3">
              {userNames.join(', ')}
            </span>
          </div>
          <div
            className={`w-2.5 h-2.5 bg-zinc-900/95 dark:bg-zinc-900/95 border-r border-b border-white/10 dark:border-white/10 rotate-45 -mt-1.25 ${
              alignment === 'left'
                ? 'ml-4'
                : alignment === 'right'
                  ? 'mr-4'
                  : 'self-center'
            }`}
          />
        </div>
      )}
    </button>
  );
};
