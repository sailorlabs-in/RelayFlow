import React from 'react';
import { Avatar } from '../../../components/Avatar';
import type { AdminTabType } from './adminTypes';

interface AdminSidebarProps {
  activeTab: AdminTabType;
  setActiveTab: (tab: AdminTabType) => void;
  user: any;
  onBackToWorkspace: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onBackToWorkspace,
}) => {
  return (
    <div className="glass-panel w-full md:w-64 shrink-0 flex flex-col justify-between p-5 h-auto md:h-full border border-glass animate-fade-in">
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3 pb-4 border-b border-glass">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-theme-input/40 border border-glass flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Logo" className="w-7 h-7 object-cover" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-theme-primary leading-none">
              RelayFlow
            </h1>
            <span className="text-[10px] font-bold tracking-wider text-theme-secondary uppercase">
              Platform Control
            </span>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex flex-row md:flex-col gap-1.5 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-theme-input border-glass text-theme-secondary'
                : 'bg-transparent border-transparent text-theme-muted hover:text-theme-primary hover:bg-theme-input/10'
            }`}
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Users
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-theme-input border-glass text-theme-secondary'
                : 'bg-transparent border-transparent text-theme-muted hover:text-theme-primary hover:bg-theme-input/10'
            }`}
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Groups
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('update-notes')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
              activeTab === 'update-notes'
                ? 'bg-theme-input border-glass text-theme-secondary'
                : 'bg-transparent border-transparent text-theme-muted hover:text-theme-primary hover:bg-theme-input/10'
            }`}
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 012 2v5a2 2 0 01-2 2h-2m-6-4h.01M9 16h5"
              />
            </svg>
            Update Notes
          </button>
        </nav>
      </div>

      {/* User Info & Back Button */}
      <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-glass">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar
            letter={(user?.displayName || user?.email || 'A')[0].toUpperCase()}
            url={user?.avatarUrl}
            status="online"
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-theme-primary truncate leading-tight">
              {user?.displayName || 'Administrator'}
            </p>
            <p className="text-[10px] text-theme-muted truncate mt-0.5">
              {user?.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToWorkspace}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-theme-primary bg-theme-input border border-glass rounded-xl hover:bg-theme-input-focus transition-all cursor-pointer"
        >
          <svg
            className="w-4 h-4 text-theme-secondary shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Workspace
        </button>
      </div>
    </div>
  );
};
