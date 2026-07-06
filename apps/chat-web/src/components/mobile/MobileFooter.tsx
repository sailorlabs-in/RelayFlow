import React from 'react';
import { useAppSelector } from '../../store';
import { IconChat, IconServer, IconPeople } from '../Icons';
import { Avatar } from '../Avatar';

interface MobileFooterProps {
  activeTab: 'chats' | 'groups' | 'friends' | 'profile';
  setActiveTab: (tab: 'chats' | 'groups' | 'friends' | 'profile') => void;
  setSelectedGroupId: (id: string | null) => void;
  ownStatus: string;
}

export const MobileFooter = ({
  activeTab,
  setActiveTab,
  setSelectedGroupId,
  ownStatus,
}: MobileFooterProps): React.JSX.Element => {
  const { user } = useAppSelector((s) => s.auth);
  const { conversations } = useAppSelector((s) => s.chat);

  if (!user) {
    return <React.Fragment />;
  }

  const hasUnreadMessages = conversations.some((c) => {
    const lastMsg = c.lastMessage;
    return lastMsg && lastMsg.senderId !== user.id && !lastMsg.isRead;
  });

  return (
    <footer className="glass-panel mx-3 mb-4 border border-glass shadow-lg flex items-center justify-around py-1.5 px-1.5 rounded-4xl shrink-0 z-40 pb-safe">
      {/* Chats Tab */}
      <button
        onClick={() => {
          setActiveTab('chats');
          setSelectedGroupId(null);
        }}
        className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
          activeTab === 'chats'
            ? 'bg-(--theme-btn-active) border border-glass shadow-sm text-(--accent-primary)'
            : 'text-theme-muted hover:text-theme-primary'
        }`}
      >
        <div className="relative w-8 h-8 flex items-center justify-center mobile-nav-icon-container">
          <IconChat />
          {hasUnreadMessages && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-(--accent-primary) animate-pulse" />
          )}
        </div>
        <span className="text-[10px] font-semibold mt-0.5">Chats</span>
      </button>

      {/* Groups Tab */}
      <button
        onClick={() => {
          setActiveTab('groups');
        }}
        className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
          activeTab === 'groups'
            ? 'bg-(--theme-btn-active) border border-glass shadow-sm text-(--accent-primary)'
            : 'text-theme-muted hover:text-theme-primary'
        }`}
      >
        <div className="w-8 h-8 flex items-center justify-center mobile-nav-icon-container">
          <IconServer />
        </div>
        <span className="text-[10px] font-semibold mt-0.5">Groups</span>
      </button>

      {/* Friends Tab */}
      <button
        onClick={() => {
          setActiveTab('friends');
          setSelectedGroupId(null);
        }}
        className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
          activeTab === 'friends'
            ? 'bg-(--theme-btn-active) border border-glass shadow-sm text-(--accent-primary)'
            : 'text-theme-muted hover:text-theme-primary'
        }`}
      >
        <div className="w-8 h-8 flex items-center justify-center mobile-nav-icon-container">
          <IconPeople />
        </div>
        <span className="text-[10px] font-semibold mt-0.5">Friends</span>
      </button>

      {/* Profile Tab */}
      <button
        onClick={() => {
          setActiveTab('profile');
          setSelectedGroupId(null);
        }}
        className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
          activeTab === 'profile'
            ? 'bg-(--theme-btn-active) border border-glass shadow-sm text-(--accent-primary)'
            : 'text-theme-muted hover:text-theme-primary'
        }`}
      >
        <div className="w-8 h-8 rounded-full overflow-hidden border border-glass flex items-center justify-center bg-theme-input shrink-0 mobile-nav-profile-container">
          <Avatar
            letter={(user.username ||
              user.displayName ||
              user.email)[0].toUpperCase()}
            url={user.avatarThumbnailUrl || user.avatarUrl}
            status={ownStatus}
            size="xs"
          />
        </div>
        <span className="text-[10px] font-semibold mt-0.5">Profile</span>
      </button>
    </footer>
  );
};
