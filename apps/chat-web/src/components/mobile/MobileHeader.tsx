import React from 'react';
import { IconPlus } from '../Icons';

interface MobileHeaderProps {
  activeTab: 'chats' | 'groups' | 'friends' | 'profile';
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
  setIsComposeOpen: (open: boolean) => void;
  setIsCreateGroupOpen: (open: boolean) => void;
}

export const MobileHeader = ({
  activeTab,
  profileSubPage,
  setProfileSubPage,
  setIsComposeOpen,
  setIsCreateGroupOpen,
}: MobileHeaderProps): React.JSX.Element => {
  return (
    <header className="glass-panel mx-3 mt-3 px-4 py-3 flex items-center justify-between shrink-0 rounded-2xl border border-glass shadow-lg">
      {activeTab === 'profile' && profileSubPage !== 'root' ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => setProfileSubPage('root')}
            className="flex items-center justify-center p-1.5 rounded-lg text-theme-muted hover:bg-theme-input active-press mr-1"
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
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-[15px] font-bold truncate">
              {profileSubPage === 'account' && 'Account Settings'}
              {profileSubPage === 'theme' && 'Appearance & Themes'}
              {profileSubPage === 'status' && 'Status & Visibility'}
              {profileSubPage === 'notifications' && 'Notifications & Devices'}
              {profileSubPage === 'update-notes' && 'Update Notes'}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="text-[18px] font-black tracking-tight bg-gradient-to-r from-(--accent-primary) to-(--accent-secondary) bg-clip-text text-transparent">
              {activeTab === 'chats' && 'Messages'}
              {activeTab === 'groups' && 'Groups'}
              {activeTab === 'friends' && 'Friends'}
              {activeTab === 'profile' && 'My Profile'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'chats' && (
              <button
                onClick={() => setIsComposeOpen(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-(--theme-btn-hover) hover:bg-(--theme-btn-active) text-(--accent-primary) active-press border border-glass"
                title="New DM"
              >
                <IconPlus />
              </button>
            )}
            {activeTab === 'groups' && (
              <button
                onClick={() => setIsCreateGroupOpen(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-(--theme-btn-hover) hover:bg-(--theme-btn-active) text-(--accent-primary) active-press border border-glass"
                title="Create Group"
              >
                <IconPlus />
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
};
