'use client';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { Message } from '../../store/slices/chatSlice';
import { formatReadAtTimestamp } from '../../utils/date';
import { IconCompose, IconTrash, IconSettings } from '../Icons';
import { useHotReactions } from './useHotReactions';
import { CustomizeHotReactionsModal } from './CustomizeHotReactionsModal';

interface MessageContextMenuProps {
  contextMenu: {
    x: number;
    y: number;
    message: Message;
    openedAt?: number;
  } | null;
  adjustedContextMenu: {
    x: number;
    y: number;
    subMenuUp?: boolean;
    subMenuLeft?: boolean;
  } | null;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  currentUser: any;
  canDeleteOthers: boolean;
  isChannelMode: boolean;
  timeFormat: string;
  onStartEdit: (msg: Message) => void;
  onDeleteMessage: (msgId: string) => void;
  onReply: (msg: Message) => void;
  onClose: () => void;
  onSelectReaction?: (messageId: string, emoji: string) => void;
  onOpenReactionPicker?: (messageId: string) => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  contextMenu,
  adjustedContextMenu,
  contextMenuRef,
  currentUser,
  canDeleteOthers,
  isChannelMode,
  timeFormat,
  onStartEdit,
  onDeleteMessage,
  onReply,
  onClose,
  onSelectReaction,
  onOpenReactionPicker,
}) => {
  const [isCustomizingHot, setIsCustomizingHot] = useState(false);
  const { hotReactions } = useHotReactions(currentUser?.id);

  if (!contextMenu || typeof document === 'undefined') {
    return null;
  }

  const { message } = contextMenu;
  const isSender = message.senderId === currentUser?.id;

  if (isCustomizingHot) {
    return ReactDOM.createPortal(
      <CustomizeHotReactionsModal
        isOpen={isCustomizingHot}
        onClose={() => {
          setIsCustomizingHot(false);
          onClose();
        }}
        userId={currentUser?.id}
      />,
      document.body,
    );
  }

  return ReactDOM.createPortal(
    <>
      {/* Backdrop for outside click / touch dismissal */}
      <div
        className="fixed inset-0 z-[9998] bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          if (
            contextMenu?.openedAt &&
            Date.now() - contextMenu.openedAt < 400
          ) {
            return;
          }
          onClose();
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          if (
            contextMenu?.openedAt &&
            Date.now() - contextMenu.openedAt < 400
          ) {
            return;
          }
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        ref={contextMenuRef}
        className="convo-context-menu message-context-menu max-w-[calc(100vw-24px)] z-[9999]"
        style={{
          top: adjustedContextMenu
            ? `${adjustedContextMenu.y}px`
            : `${contextMenu.y}px`,
          left: adjustedContextMenu
            ? `${adjustedContextMenu.x}px`
            : `${contextMenu.x}px`,
          opacity: adjustedContextMenu ? 1 : 0,
        }}
        role="menu"
        aria-label="Message options"
      >
        {/* Quick Reactions Bar for both Mobile & Desktop (Max 5 Customizable Hot Reactions) */}
        {onSelectReaction && (
          <div className="flex items-center justify-between gap-0.5 px-1.5 py-1 mb-1 border-b border-glass bg-theme-input/20 rounded-lg">
            <div className="flex items-center gap-0.5">
              {hotReactions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 active:scale-110 transition-transform rounded-md hover:bg-theme-input/70 cursor-pointer border-none bg-transparent"
                  onClick={() => {
                    onSelectReaction(message.id, emoji);
                    onClose();
                  }}
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-px h-4 bg-theme/20 mx-0.5" />
              {onOpenReactionPicker && (
                <button
                  type="button"
                  className="w-7 h-7 flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-input/70 rounded-md cursor-pointer border-none bg-transparent transition-colors"
                  onClick={() => {
                    onOpenReactionPicker(message.id);
                    onClose();
                  }}
                  title="More reactions"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    width="14"
                    height="14"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-input/70 rounded-md cursor-pointer border-none bg-transparent transition-colors"
                onClick={() => {
                  setIsCustomizingHot(true);
                }}
                title="Customize hot reactions"
              >
                <IconSettings />
              </button>
            </div>
          </div>
        )}

        <button
          className="convo-context-menu-item"
          role="menuitem"
          onClick={() => {
            onReply(message);
            onClose();
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            width="15"
            height="15"
          >
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
          <span>Reply to Message</span>
        </button>

        {isSender && (
          <button
            className="convo-context-menu-item"
            role="menuitem"
            onClick={() => {
              onStartEdit(message);
              onClose();
            }}
          >
            <IconCompose />
            <span>Edit Message</span>
          </button>
        )}

        {(isSender || canDeleteOthers) && (
          <button
            className="convo-context-menu-item danger"
            role="menuitem"
            onClick={() => {
              onDeleteMessage(message.id);
              onClose();
            }}
          >
            <IconTrash />
            <span>Delete Message</span>
          </button>
        )}

        {isChannelMode && (
          <>
            <div className="convo-context-menu-separator" />
            <div
              className="convo-context-menu-item group relative flex justify-between items-center cursor-pointer"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="15"
                  height="15"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Read by {message.readBy?.length || 0}</span>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="12"
                height="12"
                className="opacity-60"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <div
                className="hidden group-hover:block absolute w-64 bg-(--dropdown-bg) border border-glass rounded-[10px] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.35),0_0_0_1px_var(--glass-border)] backdrop-blur-lg z-10000 animate-[fadeIn_0.15s_ease-out_forwards]"
                style={{
                  ...(adjustedContextMenu?.subMenuLeft
                    ? { right: '100%', left: 'auto', marginRight: '4px' }
                    : { left: '100%', right: 'auto', marginLeft: '4px' }),
                  ...(adjustedContextMenu?.subMenuUp
                    ? { bottom: 0, top: 'auto' }
                    : { top: 0, bottom: 'auto' }),
                }}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-theme-muted border-b border-glass mb-1">
                  Read By
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {message.readBy && message.readBy.length > 0 ? (
                    message.readBy.map((reader) => (
                      <div
                        key={reader.userId}
                        className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-md text-[12px] font-medium text-theme-primary"
                      >
                        <span className="truncate flex-1">{reader.name}</span>
                        {reader.readAt && (
                          <span className="text-[10.5px] text-theme-muted shrink-0">
                            {formatReadAtTimestamp(reader.readAt, timeFormat)}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center px-3 py-1.5 rounded-md text-[12px] font-medium text-theme-muted italic break-all">
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis w-full">
                        No one yet
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
};
