import React from 'react';
import { PRESENCE_STATUS_DETAILS } from '@chat-app/shared-constants';
import { useAppDispatch } from '../../../store';
import {
  updateUserProfile,
  updateUserStatusOptimistic,
} from '../../../store/slices/authSlice';
import { socketUpdateUserStatus } from '../../../store/slices/chatSlice';
import { socketManager } from '../../../store/socketManager';
import { IconCheck } from './ProfileIcons';

interface StatusTabProps {
  user: any;
  userStatus: string;
  setUserStatus: (val: string) => void;
  visibility: string;
  setVisibility: (val: string) => void;
}

export const StatusTab: React.FC<StatusTabProps> = ({
  user,
  userStatus,
  setUserStatus,
  visibility,
  setVisibility,
}) => {
  const dispatch = useAppDispatch();

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div>
        <h2
          className="text-[17px] font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Status & Visibility
        </h2>
        <p
          className="text-[12px] mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Manage your active presence status across the workspace.
        </p>
      </div>

      {/* Section 1: User Status */}
      <div className="flex flex-col gap-2.5">
        <label
          className="text-[11.5px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Presence Status
        </label>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRESENCE_STATUS_DETAILS.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={async () => {
                setUserStatus(st.id);
                dispatch(updateUserStatusOptimistic(st.id));
                if (user?.id) {
                  dispatch(
                    socketUpdateUserStatus({
                      userId: user.id,
                      status: st.id,
                      autoStatus: 'online',
                    }),
                  );
                }
                socketManager.updateStatus(st.id);
                try {
                  await dispatch(updateUserProfile({ status: st.id })).unwrap();
                } catch (err) {
                  console.error('Failed to auto-save status:', err);
                }
              }}
              className={`flex flex-col items-start p-4 rounded-xl cursor-pointer text-left transition-all duration-200 border ${
                userStatus === st.id
                  ? 'border-[var(--accent-primary)] bg-[var(--theme-btn-active)]'
                  : 'border-[var(--glass-border)] bg-[var(--theme-btn)]'
              }`}
              onMouseEnter={(e) => {
                if (userStatus !== st.id) {
                  e.currentTarget.style.background = 'var(--theme-btn-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (userStatus !== st.id) {
                  e.currentTarget.style.background = 'var(--theme-btn)';
                }
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: st.color }}
                />
                <span
                  className="font-bold text-[13px]"
                  style={{
                    color:
                      userStatus === st.id
                        ? 'var(--theme-btn-active-text)'
                        : 'var(--text-primary)',
                  }}
                >
                  {st.name}
                </span>
              </div>
              <span
                className="text-[10.5px] mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {st.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Visibility Settings */}
      <div
        className="flex flex-col gap-2.5 border-t pt-4"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div className="flex flex-col gap-0.5 mb-1">
          <label
            className="text-[11.5px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            Profile Visibility
          </label>
          <span
            className="text-[11.5px]"
            style={{ color: 'var(--text-muted)' }}
          >
            Controls who can find and see your profile in the Add Friends
            search.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'everyone',
              name: 'Everyone',
              desc: 'Any user on the platform can find you by searching your username or email.',
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              ),
            },
            {
              id: 'friends_of_friends',
              name: 'Friends of Friends',
              desc: 'Only people who share mutual friends with you can find your profile.',
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
            },
            {
              id: 'noone',
              name: 'No One',
              desc: 'Your profile is completely hidden from search. Only people who already know your exact details can add you.',
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
            },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={async () => {
                setVisibility(opt.id);
                try {
                  await dispatch(
                    updateUserProfile({ visibility: opt.id }),
                  ).unwrap();
                } catch (err) {
                  console.error('Failed to auto-save visibility:', err);
                }
              }}
              className={`flex flex-col items-start p-4 rounded-xl cursor-pointer text-left transition-all duration-200 border ${
                visibility === opt.id
                  ? opt.id === 'noone'
                    ? 'border-amber-500/60 bg-amber-500/10'
                    : 'border-[var(--accent-primary)] bg-[var(--theme-btn-active)]'
                  : 'border-[var(--glass-border)] bg-[var(--theme-btn)]'
              }`}
              onMouseEnter={(e) => {
                if (visibility !== opt.id) {
                  e.currentTarget.style.background = 'var(--theme-btn-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (visibility !== opt.id) {
                  e.currentTarget.style.background = 'var(--theme-btn)';
                }
              }}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span
                  className={`flex items-center gap-1.5 ${
                    opt.id === 'noone' && visibility === opt.id
                      ? 'text-amber-400'
                      : ''
                  }`}
                  style={{
                    color:
                      opt.id === 'noone' && visibility === opt.id
                        ? undefined
                        : visibility === opt.id
                          ? 'var(--theme-btn-active-text)'
                          : 'var(--text-muted)',
                  }}
                >
                  {opt.icon}
                </span>
                {visibility === opt.id && (
                  <span
                    style={{
                      color:
                        opt.id === 'noone'
                          ? '#f59e0b'
                          : 'var(--theme-btn-active-text)',
                    }}
                  >
                    <IconCheck />
                  </span>
                )}
              </div>
              <span
                className="font-bold text-[13px] block"
                style={{
                  color:
                    opt.id === 'noone' && visibility === opt.id
                      ? '#f59e0b'
                      : visibility === opt.id
                        ? 'var(--theme-btn-active-text)'
                        : 'var(--text-primary)',
                }}
              >
                {opt.name}
                {opt.id === 'noone' && (
                  <span className="ml-1.5 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    Private
                  </span>
                )}
              </span>
              <span
                className="text-[10.5px] mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
        {visibility === 'noone' && (
          <div className="flex items-start gap-2 p-3 rounded-lg text-[11.5px] bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 mt-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-3.5 h-3.5 shrink-0 mt-0.5"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong>No One</strong> is selected — your profile won&apos;t
              appear in any search results. New users can still add you if they
              know your exact username or email.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
