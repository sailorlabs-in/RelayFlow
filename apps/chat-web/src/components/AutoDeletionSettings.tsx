import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store';

export interface AutoDeletionSettingsProps {
  mediaDays?: number;
  setMediaDays?: (days: number) => void;
  messageDays?: number;
  setMessageDays?: (days: number) => void;
  hideSaveButton?: boolean;
}

export const AutoDeletionSettings: React.FC<AutoDeletionSettingsProps> = ({
  mediaDays: propMediaDays,
  setMediaDays: propSetMediaDays,
  messageDays: propMessageDays,
  setMessageDays: propSetMessageDays,
}) => {
  const { user } = useAppSelector((s) => s.auth);

  const isSuperAdmin = user?.role === 'admin';

  const [localMediaDays, setLocalMediaDays] = useState<number>(
    user?.retentionMediaDays !== undefined ? user.retentionMediaDays : 30,
  );
  const [localMessageDays, setLocalMessageDays] = useState<number>(
    user?.retentionMessageDays !== undefined ? user.retentionMessageDays : 90,
  );

  const mediaDays =
    propMediaDays !== undefined ? propMediaDays : localMediaDays;
  const setMediaDays = propSetMediaDays ?? setLocalMediaDays;

  const messageDays =
    propMessageDays !== undefined ? propMessageDays : localMessageDays;
  const setMessageDays = propSetMessageDays ?? setLocalMessageDays;

  useEffect(() => {
    if (user) {
      if (
        user.retentionMediaDays !== undefined &&
        propMediaDays === undefined
      ) {
        setLocalMediaDays(user.retentionMediaDays);
      }
      if (
        user.retentionMessageDays !== undefined &&
        propMessageDays === undefined
      ) {
        setLocalMessageDays(user.retentionMessageDays);
      }
    }
  }, [user, propMediaDays, propMessageDays]);

  const mediaOptions: {
    value: number;
    label: string;
    desc: string;
    adminOnly?: boolean;
  }[] = [
    { value: 15, label: '15 Days', desc: 'Minimal storage usage' },
    { value: 30, label: '30 Days', desc: 'Recommended default' },
    { value: 60, label: '60 Days', desc: 'Extended 2 months' },
    { value: 90, label: '90 Days', desc: 'Quarterly purge (3 months)' },
  ];

  if (isSuperAdmin) {
    mediaOptions.push({
      value: 0,
      label: '♾️ Keep Forever',
      desc: 'Super Admin: Never delete high-res media files',
      adminOnly: true,
    });
  }

  const messageOptions = [
    { value: 15, label: '15 Days', desc: 'Ephemeral (2 weeks)' },
    { value: 30, label: '30 Days', desc: '1 Month retention' },
    { value: 45, label: '45 Days', desc: '1.5 Months retention' },
    { value: 60, label: '60 Days', desc: '2 Months retention' },
    { value: 90, label: '90 Days', desc: 'Default (3 Months retention)' },
    { value: 180, label: '180 Days', desc: '6 Months retention' },
    {
      value: 0,
      label: '♾️ Keep Forever',
      desc: 'Never auto-delete chat history',
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-3xl animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl sm:text-2xl font-bold text-theme-primary flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-(--accent-primary)/15 text-(--accent-primary) flex items-center justify-center text-[17px]">
            ⏱️
          </span>
          1-on-1 Auto-Deletion & Media Retention
        </h2>
        <p className="text-sm text-theme-muted">
          Manage how long media files and message history are kept in direct
          conversations.
        </p>
      </div>

      {/* Explanatory Policy Callout */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-(--accent-primary)/10 via-(--accent-primary)/5 to-transparent border border-(--accent-primary)/20 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-(--accent-primary) font-semibold text-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          How 1-on-1 Retention Negotiation Works
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-theme-secondary leading-relaxed">
          <div className="p-3 rounded-xl bg-theme-input/60 border border-theme flex flex-col gap-1">
            <div className="font-bold text-theme-primary flex items-center gap-1.5">
              <span>⚖️</span> Larger Duration Wins
            </div>
            <p className="text-theme-muted">
              In any 1-on-1 chat, the longer retention period between you and
              your chat partner is applied.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-theme-input/60 border border-theme flex flex-col gap-1">
            <div className="font-bold text-theme-primary flex items-center gap-1.5">
              <span>🖼️</span> Thumbnails Preserved
            </div>
            <p className="text-theme-muted">
              When media expires, only the high-res file is deleted. The
              lightweight preview thumbnail is kept.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-theme-input/60 border border-theme flex flex-col gap-1">
            <div className="font-bold text-theme-primary flex items-center gap-1.5">
              <span>💬</span> Total Chat Removal
            </div>
            <p className="text-theme-muted">
              When messages expire, the message and all attachments (full files
              + thumbnails) are permanently wiped.
            </p>
          </div>
        </div>
      </div>

      {/* Card 1: High-Res Media Auto-Deletion */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-glass flex flex-col gap-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-theme-primary flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5 text-(--accent-primary)"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              High-Resolution Media Retention
            </h3>
            <p className="text-xs text-theme-muted">
              Purges original photos, videos, and files from external bucket
              storage after this period. Preview thumbnails are permanently
              retained.
            </p>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-(--accent-primary)/15 text-(--accent-primary) text-xs font-bold shrink-0">
            {mediaDays === 0 ? 'Never Delete' : `${mediaDays} Days`}
          </div>
        </div>

        {/* 2 Columns for clean spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mediaOptions.map((opt) => {
            const isSelected = mediaDays === opt.value;
            const isLastOdd = opt.value === 0 && mediaOptions.length % 2 !== 0;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMediaDays(opt.value)}
                className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer active-press ${
                  isLastOdd ? 'sm:col-span-2' : ''
                } ${
                  isSelected
                    ? 'border-(--accent-primary) bg-(--accent-primary)/10 shadow-xs ring-1 ring-(--accent-primary)'
                    : 'border-theme bg-theme-input/40 hover:bg-theme-input hover:border-theme-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[14px] font-bold ${isSelected ? 'text-(--accent-primary)' : 'text-theme-primary'}`}
                  >
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-(--accent-primary) text-white flex items-center justify-center text-[10px] shadow-xs">
                      ✓
                    </span>
                  )}
                </div>
                <span className="text-xs text-theme-muted leading-relaxed">
                  {opt.desc}
                </span>
                {opt.adminOnly && (
                  <span className="mt-0.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10.5px] font-semibold w-fit border border-amber-500/30">
                    Platform Admin
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 2: Message & Conversation Removal */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-glass flex flex-col gap-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-theme-primary flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5 text-(--accent-primary)"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Direct Message History Auto-Deletion
            </h3>
            <p className="text-xs text-theme-muted">
              Permanently purges message history and all associated attachments
              (both high-res media and thumbnails) from the database and
              storage.
            </p>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-(--accent-primary)/15 text-(--accent-primary) text-xs font-bold shrink-0">
            {messageDays === 0 ? 'Never Delete' : `${messageDays} Days`}
          </div>
        </div>

        {/* 2 Columns for clean spacing, with Keep Forever spanning 2 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {messageOptions.map((opt) => {
            const isSelected = messageDays === opt.value;
            const isLastOdd = opt.value === 0;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMessageDays(opt.value)}
                className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer active-press ${
                  isLastOdd ? 'sm:col-span-2' : ''
                } ${
                  isSelected
                    ? 'border-(--accent-primary) bg-(--accent-primary)/10 shadow-xs ring-1 ring-(--accent-primary)'
                    : 'border-theme bg-theme-input/40 hover:bg-theme-input hover:border-theme-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[14px] font-bold ${isSelected ? 'text-(--accent-primary)' : 'text-theme-primary'}`}
                  >
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-(--accent-primary) text-white flex items-center justify-center text-[10px] shadow-xs">
                      ✓
                    </span>
                  )}
                </div>
                <span className="text-xs text-theme-muted leading-relaxed">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
