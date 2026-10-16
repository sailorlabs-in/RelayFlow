'use client';

import React, { useState, useEffect } from 'react';
import { EmojiPicker } from './EmojiPickerWrapper';
import {
  useHotReactions,
  DEFAULT_HOT_REACTIONS,
  MAX_HOT_REACTIONS,
} from './useHotReactions';
import { IconX } from '../Icons';
import { showToast } from '../toast';

interface CustomizeHotReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const CustomizeHotReactionsModal: React.FC<
  CustomizeHotReactionsModalProps
> = ({ isOpen, onClose, userId }) => {
  const { hotReactions, updateHotReactions, resetToDefault } =
    useHotReactions(userId);

  const [draftReactions, setDraftReactions] = useState<string[]>(hotReactions);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setDraftReactions(hotReactions);
      setSelectedSlotIndex(0);
    }
  }, [isOpen, hotReactions]);

  if (!isOpen) {
    return null;
  }

  const handleApplyEmoji = (emojiChar: string) => {
    if (!emojiChar) {
      return;
    }
    const next = [...draftReactions];
    if (selectedSlotIndex < next.length) {
      next[selectedSlotIndex] = emojiChar;
    } else if (next.length < MAX_HOT_REACTIONS) {
      next.push(emojiChar);
      setSelectedSlotIndex(next.length - 1);
    }
    setDraftReactions(next);
  };

  const handleRemoveSlot = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (draftReactions.length <= 1) {
      showToast.error('You need at least 1 hot reaction.');
      return;
    }
    const next = draftReactions.filter((_, i) => i !== index);
    setDraftReactions(next);
    if (selectedSlotIndex >= next.length) {
      setSelectedSlotIndex(next.length - 1);
    }
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draftReactions.length) {
      return;
    }
    const next = [...draftReactions];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setDraftReactions(next);
    setSelectedSlotIndex(targetIndex);
  };

  const handleSave = () => {
    updateHotReactions(draftReactions);
    showToast.success('Hot reactions updated!');
    onClose();
  };

  const handleReset = () => {
    setDraftReactions([...DEFAULT_HOT_REACTIONS]);
    setSelectedSlotIndex(0);
    resetToDefault();
    showToast.success('Reset to default hot reactions');
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden border-[1.5px] border-glass bg-(--glass-bg) backdrop-blur-[24px] shadow-(--glass-shadow) animate-slide-up sm:animate-fade-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between px-5 py-3.5 border-b border-glass bg-theme-sidebar/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-theme-primary flex items-center gap-2">
              <span>🔥</span>
              <span>Customize Hot Reactions</span>
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-(--accent-primary)/15 text-(--accent-primary) border border-(--accent-primary)/30">
              {draftReactions.length} / {MAX_HOT_REACTIONS}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-theme-muted hover:text-theme-primary bg-theme-input/50 hover:bg-theme-input active-press transition-colors cursor-pointer border-none"
            title="Close"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Active Slots Display */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-theme-muted uppercase tracking-wider">
                Quick Reactions Bar (Max {MAX_HOT_REACTIONS})
              </span>
              <span className="text-[11.5px] text-theme-muted">
                Tap a slot to replace
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {Array.from({ length: MAX_HOT_REACTIONS }).map((_, idx) => {
                const emoji = draftReactions[idx];
                const isSelected = selectedSlotIndex === idx;

                if (emoji) {
                  return (
                    <div
                      key={`slot-${idx}`}
                      onClick={() => setSelectedSlotIndex(idx)}
                      className={`relative group flex flex-col items-center justify-center h-20 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-(--accent-primary)/15 border-(--accent-primary) shadow-sm ring-2 ring-(--accent-primary)/30 scale-[1.03]'
                          : 'bg-theme-input/40 border-glass hover:bg-theme-input/70 hover:border-theme-muted/40'
                      }`}
                    >
                      {/* Slot index label */}
                      <span className="absolute top-1 left-2 text-[10px] font-mono font-bold text-theme-muted">
                        #{idx + 1}
                      </span>

                      {/* Remove button */}
                      {draftReactions.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveSlot(e, idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] shadow-sm opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
                          title="Remove this reaction"
                        >
                          ✕
                        </button>
                      )}

                      {/* Emoji Icon */}
                      <span className="text-2xl hover:scale-125 active:scale-110 transition-transform select-none">
                        {emoji}
                      </span>

                      {/* Reorder arrows */}
                      <div className="absolute bottom-1 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(idx, 'left');
                            }}
                            className="text-[10px] text-theme-muted hover:text-theme-primary px-1 hover:bg-theme-input rounded cursor-pointer border-none bg-transparent"
                            title="Move left"
                          >
                            ◀
                          </button>
                        )}
                        {idx < draftReactions.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(idx, 'right');
                            }}
                            className="text-[10px] text-theme-muted hover:text-theme-primary px-1 hover:bg-theme-input rounded cursor-pointer border-none bg-transparent"
                            title="Move right"
                          >
                            ▶
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // Empty Add Slot
                return (
                  <button
                    key={`slot-empty-${idx}`}
                    type="button"
                    onClick={() => setSelectedSlotIndex(idx)}
                    className={`flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                      isSelected
                        ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
                        : 'border-glass text-theme-muted hover:border-(--accent-primary)/50 hover:text-theme-primary bg-theme-input/10'
                    }`}
                  >
                    <span className="text-lg font-bold">+</span>
                    <span className="text-[10.5px] font-medium">Add</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Emojis Picker directly displayed */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-semibold text-theme-muted uppercase tracking-wider">
              Pick Emoji for Slot #{selectedSlotIndex + 1}
            </span>
            <div className="rounded-xl overflow-hidden border border-glass bg-theme-sidebar/40 flex flex-col items-stretch">
              <EmojiPicker
                onEmojiSelect={(emoji: any) => {
                  handleApplyEmoji(emoji.native);
                }}
                theme="auto"
                dynamicWidth={true}
                previewPosition="none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-glass bg-theme-sidebar/30 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold text-theme-muted hover:text-theme-primary hover:bg-theme-input/60 rounded-lg transition-colors cursor-pointer border border-glass active-press"
          >
            Reset Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-theme-muted hover:text-theme-primary hover:bg-theme-input/60 rounded-lg transition-colors cursor-pointer border border-glass active-press"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold bg-(--accent-primary) text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer border-none shadow-xs active-press font-medium"
            >
              Save Reactions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
