import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setActiveChannel,
  localSetSelfVoiceChannel,
} from '../../store/slices/groupsSlice';
import { setActiveConversation } from '../../store/slices/chatSlice';
import { socketManager } from '../../store/socketManager';

export const MobileVoiceOverlay = (): React.JSX.Element | null => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const {
    groups: rawGroups,
    activeChannelId,
    activeVoiceChannelId,
    voiceStates,
  } = useAppSelector((s) => s.groups);
  const groups = Array.isArray(rawGroups) ? rawGroups : [];

  if (!user || !activeVoiceChannelId) {
    return null;
  }

  let voiceGroup = null;
  let voiceChannel = null;

  for (const g of groups) {
    const ch = g.channels?.find((c) => c.id === activeVoiceChannelId);
    if (ch) {
      voiceGroup = g;
      voiceChannel = ch;
      break;
    }
  }

  if (!voiceGroup || !voiceChannel) {
    return null;
  }

  const isSelfMuted = voiceStates[user.id]?.isMuted || false;

  return (
    <div className="mx-3 mb-2 p-2.5 bg-indigo-950/80 backdrop-blur-md border border-indigo-500/20 rounded-xl flex items-center justify-between shadow-lg shrink-0 z-50">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight truncate text-indigo-200">
            Connected to voice
          </p>
          <p className="text-[9px] text-indigo-300 leading-none truncate">
            {voiceGroup.name} / #{voiceChannel.name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            socketManager.updateVoiceState(
              !isSelfMuted,
              voiceStates[user.id]?.isDeafened || false,
            );
          }}
          className={`w-7 h-7 flex items-center justify-center rounded-lg ${
            isSelfMuted
              ? 'bg-red-500/20 text-red-400'
              : 'bg-indigo-500/20 text-indigo-300'
          } active-press`}
        >
          {isSelfMuted ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-4 h-4"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-4 h-4"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
        <button
          onClick={() => {
            if (activeVoiceChannelId === activeChannelId) {
              dispatch(setActiveChannel(null));
              dispatch(setActiveConversation(null));
            }
            dispatch(localSetSelfVoiceChannel(null));
            socketManager.leaveVoice();
          }}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 active-press"
          title="Disconnect"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="w-4 h-4"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};
