import React from 'react';
import type { ProfileTabType } from './types';
import {
  IconUser,
  IconPalette,
  IconActivity,
  IconBell,
  IconClock,
  IconMegaphone,
  IconLogout,
} from './ProfileIcons';

interface ProfileNavSidebarProps {
  activeTab: ProfileTabType;
  setActiveTab: (tab: ProfileTabType) => void;
  onSignOut: () => void;
}

export const ProfileNavSidebar: React.FC<ProfileNavSidebarProps> = ({
  activeTab,
  setActiveTab,
  onSignOut,
}) => {
  const tabs = [
    {
      id: 'account' as ProfileTabType,
      label: 'Account settings',
      icon: <IconUser />,
    },
    {
      id: 'theme' as ProfileTabType,
      label: 'Appearance & Themes',
      icon: <IconPalette />,
    },
    {
      id: 'status' as ProfileTabType,
      label: 'Status & Visibility',
      icon: <IconActivity />,
    },
    {
      id: 'notifications' as ProfileTabType,
      label: 'Notifications',
      icon: <IconBell />,
    },
    {
      id: 'retention' as ProfileTabType,
      label: 'Data & Auto-Deletion',
      icon: <IconClock />,
    },
    {
      id: 'update-notes' as ProfileTabType,
      label: 'Update Notes',
      icon: <IconMegaphone />,
    },
  ];

  return (
    <div
      className="w-full md:w-[240px] flex flex-row md:flex-col p-3 gap-1.5 border-b md:border-b-0 md:border-r overflow-x-auto md:overflow-x-visible shrink-0 flex-nowrap"
      style={{
        borderColor: 'var(--border-muted)',
        background: 'rgba(0,0,0,0.015)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-3 shrink-0 w-max md:w-full px-4 py-3 rounded-xl text-[13.5px] font-semibold cursor-pointer text-left transition-all duration-200 border-none ${
            activeTab === tab.id ? 'theme-btn-active' : ''
          }`}
          style={
            activeTab === tab.id
              ? {
                  background: 'var(--theme-btn-active)',
                  color: 'var(--theme-btn-active-text)',
                }
              : {
                  background: 'transparent',
                  color: 'var(--text-muted)',
                }
          }
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.background = 'var(--theme-btn-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}

      <div className="flex-grow hidden md:block" />
      <button
        type="button"
        onClick={onSignOut}
        className="flex items-center gap-3 shrink-0 w-max md:w-full px-4 py-3 rounded-xl text-[13.5px] font-semibold cursor-pointer text-left transition-all duration-200 border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:opacity-85 mt-auto md:mt-0"
      >
        <IconLogout />
        <span>Sign Out</span>
      </button>
    </div>
  );
};
