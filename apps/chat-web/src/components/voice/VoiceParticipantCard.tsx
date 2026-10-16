import React from 'react';
import { Avatar } from '../Avatar';
import { VoiceParticipantMedia } from './VoiceParticipantMedia';
import {
  IconDisconnect,
  IconExpand,
  IconVolume,
  IconVolumeMute,
} from './VoiceIcons';

interface VoiceParticipantCardProps {
  vs: {
    userId: string;
    groupId: string;
    channelId: string;
    isMuted: boolean;
    isDeafened: boolean;
  };
  profile: any;
  isMe: boolean;
  isSpeaking: boolean;
  activeStream: MediaStream | null;
  hasVideo: boolean;
  isStreaming: boolean;
  isFocused?: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  canDisconnect: boolean;
  onDisconnect: (userId: string) => void;
  onFocus: (userId: string) => void;
  userVolumes: Record<string, number>;
  setUserVolumes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  volumePopoverUserId?: string | null;
  setVolumePopoverUserId?: (userId: string | null) => void;
  variant?: 'grid' | 'sidebar';
}

export const VoiceParticipantCard: React.FC<VoiceParticipantCardProps> = ({
  vs,
  profile,
  isMe,
  isSpeaking,
  activeStream,
  hasVideo,
  isStreaming,
  isFocused = false,
  isCameraOn,
  isScreenSharing,
  canDisconnect,
  onDisconnect,
  onFocus,
  userVolumes,
  setUserVolumes,
  volumePopoverUserId,
  setVolumePopoverUserId,
  variant = 'grid',
}) => {
  const [internalPopover, setInternalPopover] = React.useState(false);
  const isPopoverOpen =
    volumePopoverUserId !== undefined
      ? volumePopoverUserId === vs.userId
      : internalPopover;

  const togglePopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (setVolumePopoverUserId) {
      setVolumePopoverUserId(isPopoverOpen ? null : vs.userId);
    } else {
      setInternalPopover((prev) => !prev);
    }
  };

  if (!profile) {
    return null;
  }

  const isSidebar = variant === 'sidebar';
  const currentVolume = userVolumes[vs.userId] ?? 1;

  return (
    <div
      onClick={() => onFocus(vs.userId)}
      className={`voice-card relative flex flex-col items-center justify-center aspect-16/10 rounded-xl overflow-hidden cursor-pointer shrink-0 transition-all duration-200 select-none ${
        isSidebar ? 'w-36 md:w-auto' : 'w-full'
      } ${
        isFocused
          ? 'border-2 border-(--accent-primary) bg-[rgba(56,189,248,0.08)] shadow-lg'
          : 'border-[1.5px] border-glass bg-(--glass-bg) hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.03)] hover:scale-[1.01]'
      } ${
        isSpeaking && !isFocused
          ? 'border-(--accent-primary) shadow-[0_0_15px_rgba(56,189,248,0.25)]'
          : ''
      }`}
    >
      {/* Video preview */}
      <VoiceParticipantMedia
        stream={activeStream}
        isMe={isMe}
        showCameraFeed={isCameraOn || isScreenSharing}
      />

      {/* Avatar fallback when no video */}
      {(!hasVideo || (isMe && !isCameraOn && !isScreenSharing)) && (
        <div className="relative flex items-center justify-center z-2">
          {isSpeaking && (
            <div
              className="absolute -inset-1 rounded-full border-[2.5px] border-(--accent-primary) pointer-events-none"
              style={{
                animation: 'voiceSpeakingGlow 1.5s ease-in-out infinite',
              }}
            />
          )}
          <Avatar
            letter={(profile.username ||
              profile.displayName ||
              profile.email ||
              'U')[0].toUpperCase()}
            url={profile.avatarThumbnailUrl || profile.avatarUrl}
            size={isSidebar ? 'sm' : 'md'}
          />
        </div>
      )}

      {/* Disconnect button (appears on hover) */}
      {canDisconnect && !isMe && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDisconnect(vs.userId);
          }}
          className="voice-disconnect-btn absolute top-2 left-2 w-7 h-7 rounded-lg border-none bg-red-600/85 hover:bg-red-600 text-white cursor-pointer flex items-center justify-center opacity-0 scale-[0.85] transition-all duration-150 z-4 shadow-sm"
          title="Disconnect user"
        >
          <IconDisconnect size={14} />
        </button>
      )}

      {/* Expand button (appears on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFocus(vs.userId);
        }}
        className="voice-expand-btn absolute top-2 right-2 w-7 h-7 rounded-lg border-none bg-black/60 backdrop-blur-md text-white cursor-pointer flex items-center justify-center opacity-0 scale-[0.85] transition-all duration-150 z-4 shadow-sm"
        title="Focus on this user"
      >
        <IconExpand />
      </button>

      {/* Card Footer — name + badges */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 px-2.5 py-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-semibold text-white truncate max-w-28 drop-shadow-md">
              {isMe
                ? 'You'
                : profile.username
                  ? `@${profile.username}`
                  : profile.displayName || profile.email.split('@')[0]}
            </span>
            {isSpeaking && (
              <div className="flex gap-0.5 items-end h-3">
                <span className="w-0.5 bg-(--accent-primary) animate-sound-bar-1 rounded-full" />
                <span className="w-0.5 bg-(--accent-primary) animate-sound-bar-2 rounded-full" />
                <span className="w-0.5 bg-(--accent-primary) animate-sound-bar-3 rounded-full" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isStreaming && (
              <span
                className="voice-live-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500 text-[9px] font-black uppercase text-white leading-none shadow-sm"
                style={{
                  animation: 'voiceLivePulse 2s ease-in-out infinite',
                }}
              >
                LIVE
              </span>
            )}
            {vs.isMuted && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--danger)"
                strokeWidth="2.5"
                className="w-3 h-3 opacity-90"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
                <line
                  x1="1"
                  y1="1"
                  x2="23"
                  y2="23"
                  stroke="var(--danger)"
                  strokeWidth="2.5"
                />
              </svg>
            )}
            {vs.isDeafened && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--danger)"
                strokeWidth="2.5"
                className="w-3 h-3 opacity-90"
              >
                <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
                <line
                  x1="1"
                  y1="1"
                  x2="23"
                  y2="23"
                  stroke="var(--danger)"
                  strokeWidth="2.5"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Volume controls for other participants */}
        {!isMe && (
          <div className="relative self-end">
            <button
              onClick={togglePopover}
              className="p-1 rounded bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer border-none flex items-center justify-center backdrop-blur-xs"
              title="Adjust Volume"
            >
              {currentVolume === 0 ? <IconVolumeMute /> : <IconVolume />}
            </button>

            {isPopoverOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full right-0 mb-2 p-3 rounded-xl bg-theme-sidebar/95 backdrop-blur-xl border border-glass shadow-2xl z-50 flex flex-col gap-2 w-48 animate-fade-in"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-theme-primary">
                  <span>User Volume</span>
                  <span>{Math.round(currentVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={currentVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setUserVolumes((prev) => ({
                      ...prev,
                      [vs.userId]: val,
                    }));
                  }}
                  className="w-full accent-(--accent-primary) cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
