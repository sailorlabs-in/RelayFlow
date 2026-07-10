import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { Avatar } from '../Avatar';
import { IconLogout } from '../Icons';
import { PRESENCE_STATUS_DETAILS } from '@chat-app/shared-constants';
import {
  updateUserStatusOptimistic,
  updateUserProfile,
} from '../../store/slices/authSlice';
import { socketUpdateUserStatus } from '../../store/slices/chatSlice';
import { socketManager } from '../../store/socketManager';
import { showToast } from '../toast';
import { ProfileSettingsContent } from '../../app/profile/page';

const IconUser = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconPalette = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.01445 19.1559 5.06822 19.3868 4.99513 19.5962C4.78696 20.1941 4.95473 20.8624 5.43625 21.2828C5.91777 21.7032 6.6027 21.7779 7.15949 21.4746C7.37583 21.3567 7.63665 21.3789 7.83143 21.531C9.06646 21.8349 10.514 22 12 22Z" />
    <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
    <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
    <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
  </svg>
);

const IconActivity = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconBell = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconMegaphone = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const IconChevronRight = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-4 h-4 opacity-50"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

interface MobileProfileTabProps {
  ownStatus: string;
  handleLogout: () => void;
  profileSubPage:
    | 'root'
    | 'account'
    | 'theme'
    | 'status'
    | 'notifications'
    | 'update-notes';
  setProfileSubPage: (
    page:
      | 'root'
      | 'account'
      | 'theme'
      | 'status'
      | 'notifications'
      | 'update-notes',
  ) => void;
}

export const MobileProfileTab = ({
  ownStatus,
  handleLogout,
  profileSubPage,
  setProfileSubPage,
}: MobileProfileTabProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const handleUpdateStatus = async (statusId: string) => {
    if (!user) {
      return;
    }
    try {
      dispatch(updateUserStatusOptimistic(statusId));
      dispatch(
        socketUpdateUserStatus({
          userId: user.id,
          status: statusId,
          autoStatus: 'online',
        }),
      );
      socketManager.updateStatus(statusId);
      await dispatch(updateUserProfile({ status: statusId })).unwrap();
      showToast.success(`Status updated to ${statusId}`);
    } catch (err) {
      console.error('Failed to save status:', err);
      showToast.error('Failed to save status changes.');
    }
  };

  if (!user) {
    return <React.Fragment />;
  }

  return (
    <div
      className={`flex flex-col gap-4 h-full animate-fade-in px-3 py-3 ${
        profileSubPage === 'root' ? 'overflow-y-auto' : 'overflow-hidden'
      }`}
    >
      {profileSubPage === 'root' ? (
        <>
          {/* User Profile Card */}
          <div className="glass-panel p-5 border border-glass rounded-[28px] flex flex-col items-center text-center shadow-md">
            <Avatar
              letter={(user.username ||
                user.displayName ||
                user.email)[0].toUpperCase()}
              url={user.avatarThumbnailUrl || user.avatarUrl}
              status={ownStatus}
              size="lg"
            />
            <h2 className="font-bold text-[17px] mt-3 leading-snug">
              {user.displayName || 'Active User'}
            </h2>
            <p className="text-[12px] text-theme-muted mt-0.5">
              {user.username ? `@${user.username}` : user.email}
            </p>
          </div>

          {/* Settings Navigation Menu List */}
          <div className="glass-panel p-2.5 border border-glass rounded-[24px] flex flex-col gap-1 shadow-md">
            {[
              {
                id: 'account',
                label: 'Account Settings',
                desc: 'Profile photo, username, password, 2FA',
                icon: <IconUser />,
              },
              {
                id: 'theme',
                label: 'Appearance & Themes',
                desc: 'Theme colors, dark/light mode, custom editor',
                icon: <IconPalette />,
              },
              {
                id: 'status',
                label: 'Status & Visibility',
                desc: 'Custom status, presence visibility rules',
                icon: <IconActivity />,
              },
              {
                id: 'notifications',
                label: 'Notifications & Devices',
                desc: 'Alerts, push settings, device sessions',
                icon: <IconBell />,
              },
              {
                id: 'update-notes',
                label: 'Update Notes',
                desc: 'Timeline of recent patch notes and updates',
                icon: <IconMegaphone />,
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setProfileSubPage(item.id as any)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-theme-input text-left active-press transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-(--theme-btn-hover) text-(--accent-primary) shrink-0 border border-glass">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13.5px] font-bold text-theme-primary leading-tight">
                      {item.label}
                    </h4>
                    <p className="text-[10px] text-theme-muted truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <IconChevronRight />
              </button>
            ))}
          </div>

          {/* User Status Options */}
          <div className="glass-panel p-4 border border-glass rounded-[24px] flex flex-col gap-3 shadow-md">
            <h3 className="font-bold text-[11px] text-theme-muted tracking-wide uppercase px-1">
              Quick Presence Status
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESENCE_STATUS_DETAILS.map((status) => {
                const isCurrent = ownStatus === status.id;
                return (
                  <button
                    key={status.id}
                    onClick={() => handleUpdateStatus(status.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all active-press ${
                      isCurrent
                        ? 'bg-(--theme-btn-active) border-(--accent-primary)/40 text-theme-primary font-bold'
                        : 'bg-transparent border-glass hover:bg-theme-input text-theme-muted'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-[12.5px] truncate">
                      {status.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logout Panel */}
          <div className="glass-panel p-4 border border-glass rounded-[24px] flex flex-col gap-2 shadow-md">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-(--danger-bg) hover:bg-(--danger-bg)/80 text-(--danger) border border-(--danger-border) rounded-2xl text-[13.5px] font-bold active-press"
            >
              <IconLogout />
              <span>Sign Out Account</span>
            </button>
          </div>
        </>
      ) : (
        <div className="glass-panel p-4 border border-glass rounded-[28px] flex flex-col shadow-md h-full min-h-[calc(100vh-200px)] overflow-hidden animate-fade-in">
          <ProfileSettingsContent
            isModal={false}
            isMobileView={true}
            activeTab={profileSubPage}
            onSignOut={handleLogout}
            onClose={() => setProfileSubPage('root')}
            onSaveSuccess={() => setProfileSubPage('root')}
          />
        </div>
      )}
    </div>
  );
};
