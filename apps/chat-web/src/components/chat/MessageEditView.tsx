'use client';

import React, { useEffect, useRef } from 'react';

interface MessageEditViewProps {
  messageId: string;
  initialContent?: string;
  editingContent: string;
  setEditingContent: (val: string) => void;
  onSave: (messageId: string) => void;
  onCancel: () => void;
  className?: string;
}

export const MessageEditView: React.FC<MessageEditViewProps> = ({
  messageId,
  initialContent = '',
  editingContent,
  setEditingContent,
  onSave,
  onCancel,
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus and place cursor at end on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
      // Auto-adjust initial height
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        Math.max(textareaRef.current.scrollHeight, 64),
        240,
      )}px`;
    }
  }, []);

  // Dynamic height on change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        Math.max(textareaRef.current.scrollHeight, 64),
        240,
      )}px`;
    }
  };

  const handleCancel = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onCancel();
  };

  const handleSave = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (
      editingContent.trim().length > 0 &&
      editingContent.trim() !== initialContent.trim()
    ) {
      onSave(messageId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingContent.trim().length > 0) {
        onSave(messageId);
      } else {
        handleCancel(e as any);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel(e as any);
    }
  };

  const isSaveDisabled =
    editingContent.trim().length === 0 ||
    editingContent.trim() === initialContent.trim();

  return (
    <div
      className={`flex flex-col w-full max-w-full sm:max-w-xl my-1 rounded-2xl border border-white/[0.08] dark:border-white/[0.08] bg-theme-input/50 backdrop-blur-xl shadow-lg overflow-hidden transition-all duration-200 focus-within:border-(--accent-primary)/35 focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 sm:px-3.5 sm:py-2 border-b border-white/[0.04] dark:border-white/[0.04] bg-theme-input/30 select-none">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-(--accent-primary)">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="w-3.5 h-3.5"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span>Editing message</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-theme-muted font-medium">
          <kbd className="px-1.5 py-0.5 rounded bg-theme-input text-theme-muted font-mono border-none">
            Esc
          </kbd>
          <span>to cancel</span>
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onTouchEnd={handleCancel}
          onClick={handleCancel}
          className="sm:hidden p-1 text-theme-muted hover:text-theme-primary bg-transparent border-none cursor-pointer flex items-center justify-center rounded-full active:bg-theme-input"
          title="Cancel edit"
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Textarea Input - Completely Borderless & Seamless */}
      <div className="px-3 py-2 sm:p-3">
        <textarea
          ref={textareaRef}
          value={editingContent}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Edit your message..."
          style={{
            outline: 'none',
            border: 'none',
            boxShadow: 'none',
          }}
          className="message-edit-textarea w-full bg-transparent text-theme-primary placeholder:text-theme-muted text-[13.5px] sm:text-[14px] leading-relaxed resize-none p-0 block focus:outline-none focus:ring-0 focus-visible:outline-none"
          rows={2}
        />
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 sm:px-3.5 sm:py-2 border-t border-white/[0.04] dark:border-white/[0.04] bg-theme-input/15">
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-theme-muted select-none">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-theme-input text-theme-muted font-mono text-[10px] border-none">
            Enter
          </kbd>
          <span>to save •</span>
          <kbd className="px-1.5 py-0.5 rounded bg-theme-input text-theme-muted font-mono text-[10px] border-none">
            Shift + Enter
          </kbd>
          <span>for new line</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onTouchEnd={handleCancel}
            onClick={handleCancel}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium text-theme-muted hover:text-theme-primary hover:bg-theme-input/80 transition-colors cursor-pointer border-none bg-transparent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaveDisabled}
            onMouseDown={(e) => e.preventDefault()}
            onTouchEnd={handleSave}
            onClick={handleSave}
            className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-semibold text-white bg-(--accent-primary) hover:bg-(--accent-primary-hover) active-press transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-3.5 h-3.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
