'use client';

import React, { useState } from 'react';
import { EmojiPicker } from './EmojiPickerWrapper';
import { CustomizeHotReactionsModal } from './CustomizeHotReactionsModal';
import { IconEmoji, IconX, IconSettings } from '../Icons';

interface ReactionPickerModalProps {
  activeReactionMessageId: string | null;
  onClose: () => void;
  onSelectReaction: (emojiNative: string) => void;
  userId?: string;
}

export const ReactionPickerModal: React.FC<ReactionPickerModalProps> = ({
  activeReactionMessageId,
  onClose,
  onSelectReaction,
  userId,
}) => {
  const [isCustomizingHot, setIsCustomizingHot] = useState(false);

  if (!activeReactionMessageId) {
    return null;
  }

  if (isCustomizingHot) {
    return (
      <CustomizeHotReactionsModal
        isOpen={isCustomizingHot}
        onClose={() => setIsCustomizingHot(false)}
        userId={userId}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-md sm:w-[352px] sm:max-w-[352px] sm:rounded-2xl rounded-t-2xl overflow-hidden border-[1.5px] border-glass bg-(--glass-bg) backdrop-blur-[20px] shadow-(--glass-shadow) animate-slide-up sm:animate-fade-in flex flex-col items-stretch"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between px-4 py-2.5 border-b border-glass bg-theme-sidebar/40 shrink-0">
          <span className="text-xs font-semibold text-theme-secondary flex items-center gap-1.5">
            <IconEmoji size={16} /> Add Reaction
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsCustomizingHot(true)}
              className="text-[11px] font-medium text-theme-muted hover:text-(--accent-primary) transition-colors px-2 py-1 rounded-md hover:bg-theme-input/50 flex items-center gap-1 cursor-pointer border-none bg-transparent"
              title="Customize your hot reactions"
            >
              <IconSettings />
              <span>Customize</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-theme-muted hover:text-theme-primary bg-theme-input/50 hover:bg-theme-input active-press transition-colors cursor-pointer border-none"
              title="Close"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>
        <div className="w-full overflow-hidden flex flex-col items-stretch">
          <EmojiPicker
            onEmojiSelect={(emoji: any) => {
              onSelectReaction(emoji.native);
              onClose();
            }}
            theme="auto"
            dynamicWidth={true}
            previewPosition="none"
          />
        </div>
      </div>
    </div>
  );
};
