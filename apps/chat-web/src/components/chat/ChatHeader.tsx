import React, { useState } from 'react';
import type { PresenceStatus } from '@chat-app/shared-constants';
import { PRESENCE_DOT_COLORS, STATUS_TEXTS } from '@chat-app/shared-constants';
import { Avatar } from '../Avatar';
import { PresenceDot } from '../PresenceDot';
import { IconTrash } from '../Icons';

interface ChatHeaderProps {
  isMobileView?: boolean;
  isMobileScreen?: boolean;
  isChannelMode: boolean;
  isVoiceChannel: boolean;
  activeChannelName?: string | null;
  activeDetails?: {
    id?: string;
    name?: string;
    letter?: string;
    avatarUrl?: string;
    avatarThumbnailUrl?: string;
  } | null;
  activeStatus: string;
  isActiveTyping: boolean;
  typingText: string;
  activeConvo?: {
    retentionPolicy?: {
      mediaDays: number | null;
      messageDays: number | null;
    };
  } | null;
  onMenuClick?: () => void;
  onOpenProfile: (e: React.MouseEvent, userId: string) => void;
  onStartCall: () => void;
  onDeleteConversation: () => void;
  isMembersListOpen?: boolean;
  onToggleMembersList?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isMobileView = false,
  isMobileScreen = false,
  isChannelMode,
  isVoiceChannel,
  activeChannelName,
  activeDetails,
  activeStatus,
  isActiveTyping,
  typingText,
  activeConvo,
  onMenuClick,
  onOpenProfile,
  onStartCall,
  onDeleteConversation,
  isMembersListOpen = false,
  onToggleMembersList,
}) => {
  const [showRetentionPopover, setShowRetentionPopover] = useState(false);

  if (isMobileView) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-theme bg-theme-sidebar/45 backdrop-blur-md rounded-t-2xl shrink-0 z-20 ${
        isMobileScreen ? 'px-3.5 py-2.5' : 'px-5 py-3.5'
      }`}
    >
      {isChannelMode ? (
        /* Channel mode header */
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {onMenuClick && (
            <button
              id="mobile-menu-btn"
              onClick={onMenuClick}
              className="flex items-center justify-center p-1.5 rounded-md text-theme-muted hover:bg-theme-input hover:text-theme-primary cursor-pointer active-press focus:outline-none shrink-0 md:hidden"
              title="Open Navigation"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-5 h-5"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <span className="text-theme-muted flex shrink-0">
            {isVoiceChannel ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="w-5 h-5 text-(--accent-primary)"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="15" x2="20" y2="15" />
                <line x1="10" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="14" y2="21" />
              </svg>
            )}
          </span>
          <h3 className="text-[16px] font-bold tracking-tight truncate text-theme-primary">
            {activeChannelName || activeDetails?.name || ''}
          </h3>
          {isActiveTyping && !isVoiceChannel && (
            <span className="text-[11.5px] font-medium ml-2 animate-pulse text-(--accent-primary)">
              {typingText}…
            </span>
          )}
        </div>
      ) : (
        /* Direct message mode header */
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {onMenuClick && (
            <button
              id="mobile-menu-btn"
              onClick={onMenuClick}
              className="flex items-center justify-center p-1.5 rounded-md text-theme-muted hover:bg-theme-input hover:text-theme-primary cursor-pointer active-press focus:outline-none shrink-0 mr-1 md:hidden"
              title="Open Navigation"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-5 h-5"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <div
            onClick={(e) => {
              if (activeDetails?.id) {
                onOpenProfile(e, activeDetails.id);
              }
            }}
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-95 transition-all min-w-0"
          >
            <Avatar
              letter={activeDetails?.letter || ''}
              url={
                activeDetails?.avatarThumbnailUrl || activeDetails?.avatarUrl
              }
              status={activeStatus}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold tracking-tight truncate text-theme-primary">
                {activeDetails?.name || ''}
              </h3>
              {isActiveTyping ? (
                <span className="text-[11.5px] font-medium text-(--accent-primary)">
                  typing…
                </span>
              ) : (
                <div className="flex items-center gap-1.5 text-[11.5px] mt-0.5">
                  <PresenceDot status={activeStatus} size={7} />
                  <span
                    style={{
                      color:
                        PRESENCE_DOT_COLORS[activeStatus as PresenceStatus] ||
                        'var(--text-muted)',
                    }}
                  >
                    {STATUS_TEXTS[activeStatus as PresenceStatus] || 'Offline'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct message actions */}
      {!isChannelMode && (
        <div className="flex items-center gap-2 shrink-0">
          {/* 1-on-1 Retention Policy Badge */}
          {activeConvo?.retentionPolicy && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRetentionPopover((prev) => !prev)}
                title="View 1-on-1 Auto-Deletion Policy"
                className="flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer transition-all duration-200 border bg-theme-input/70 border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-input active-press"
              >
                <span className="text-[12px]">⏱️</span>
                <span className="hidden sm:inline">
                  Media:{' '}
                  {activeConvo.retentionPolicy.mediaDays === null
                    ? 'Never'
                    : `${activeConvo.retentionPolicy.mediaDays}d`}{' '}
                  • Chat:{' '}
                  {activeConvo.retentionPolicy.messageDays === null
                    ? 'Never'
                    : `${activeConvo.retentionPolicy.messageDays}d`}
                </span>
                <span className="sm:hidden">
                  {activeConvo.retentionPolicy.mediaDays === null
                    ? '∞'
                    : `${activeConvo.retentionPolicy.mediaDays}d`}
                  /
                  {activeConvo.retentionPolicy.messageDays === null
                    ? '∞'
                    : `${activeConvo.retentionPolicy.messageDays}d`}
                </span>
              </button>

              {showRetentionPopover && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-2xl glass-panel border border-glass shadow-2xl z-50 animate-fade-in flex flex-col gap-2.5 text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-glass pb-2">
                    <span className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                      <span>⏱️</span> 1-on-1 Retention Policy
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRetentionPopover(false)}
                      className="text-theme-muted hover:text-theme-primary text-xs cursor-pointer p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] text-theme-muted leading-relaxed">
                    In 1-on-1 chats, whichever participant has selected the
                    longer duration applies to both users.
                  </p>
                  <div className="flex flex-col gap-1.5 py-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-theme-muted">Media Retention:</span>
                      <span className="font-bold text-(--accent-primary)">
                        {activeConvo.retentionPolicy.mediaDays === null
                          ? 'Keep Forever'
                          : `${activeConvo.retentionPolicy.mediaDays} Days (Applied max)`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-theme-muted">Message History:</span>
                      <span className="font-bold text-(--accent-primary)">
                        {activeConvo.retentionPolicy.messageDays === null
                          ? 'Keep Forever'
                          : `${activeConvo.retentionPolicy.messageDays} Days (Applied max)`}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-theme-muted/80 bg-theme-input/50 p-2.5 rounded-xl border border-theme leading-relaxed">
                    💡 High-res media purges after media retention while keeping
                    preview thumbnails. Expired messages are permanently wiped
                    with all attachments.
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            id="call-user-btn"
            title="Start Voice Call"
            className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-all duration-200 border-[1.5px] bg-(--accent-primary)/10 text-(--accent-primary) border-(--accent-primary)/20 hover:bg-(--accent-primary) hover:text-white hover:border-(--accent-primary) active-press"
            onClick={onStartCall}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-4 h-4"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Call
          </button>

          <button
            id="delete-thread-btn"
            title="Delete thread"
            className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-all duration-200 border-[1.5px] bg-(--danger-bg) text-(--danger) border-(--danger-border) hover:bg-(--danger) hover:text-white hover:border-(--danger) hover:shadow-[0_4px_14px_rgba(239,68,68,0.3)] active-press"
            onClick={onDeleteConversation}
          >
            <IconTrash />
            Delete
          </button>
        </div>
      )}

      {/* Members Toggle Button — only in Channel mode */}
      {isChannelMode && onToggleMembersList && (
        <button
          id="toggle-members-btn"
          title="Toggle Member List"
          onClick={onToggleMembersList}
          className={`bg-transparent border-none cursor-pointer p-1.5 rounded-lg flex items-center transition-all duration-150 active-press ${
            isMembersListOpen
              ? 'text-(--accent-primary) bg-(--accent-primary)/10'
              : 'text-theme-muted hover:bg-theme-input hover:text-theme-primary'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-5 h-5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
      )}
    </div>
  );
};
