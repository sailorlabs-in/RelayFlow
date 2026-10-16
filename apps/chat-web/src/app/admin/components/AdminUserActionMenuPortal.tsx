'use client';

import React from 'react';
import ReactDOM from 'react-dom';
import type { UserData } from './adminTypes';

interface ActiveMenuState {
  userId: string;
  u: UserData;
  top: number;
  left: number;
}

interface AdminUserActionMenuPortalProps {
  activeMenu: ActiveMenuState | null;
  currentUserId?: string;
  onClose: () => void;
  onToggleRole: (u: UserData) => void;
  onSendWarning: (u: UserData) => void;
  onFriendRequest: (u: UserData) => void;
  onEditIdentity: (u: UserData) => void;
  onForceReload: (u: UserData) => void;
}

export const AdminUserActionMenuPortal: React.FC<
  AdminUserActionMenuPortalProps
> = ({
  activeMenu,
  currentUserId,
  onClose,
  onToggleRole,
  onSendWarning,
  onFriendRequest,
  onEditIdentity,
  onForceReload,
}) => {
  if (!activeMenu || typeof window === 'undefined') {
    return null;
  }

  const { u, top, left } = activeMenu;
  const isSelf = u.id === currentUserId;

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: `${left}px`,
        }}
        className="w-44 rounded-xl border border-glass bg-[var(--bg-primary)] shadow-2xl py-1 z-50 animate-fade-in text-left backdrop-blur-md"
      >
        <button
          onClick={() => {
            onClose();
            onToggleRole(u);
          }}
          disabled={isSelf}
          className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-theme-primary hover:bg-theme-input flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none bg-transparent transition-colors"
        >
          {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
        </button>
        <button
          onClick={() => {
            onClose();
            onSendWarning(u);
          }}
          className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-amber-400 hover:bg-theme-input flex items-center gap-2 cursor-pointer border-none bg-transparent transition-colors"
        >
          Send Warning
        </button>
        <button
          onClick={() => {
            onClose();
            onFriendRequest(u);
          }}
          disabled={isSelf}
          className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-emerald-400 hover:bg-theme-input flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none bg-transparent transition-colors"
        >
          Friend Request
        </button>
        <button
          onClick={() => {
            onClose();
            onEditIdentity(u);
          }}
          className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-violet-400 hover:bg-theme-input flex items-center gap-2 cursor-pointer border-none bg-transparent transition-colors"
        >
          Edit Identity Info
        </button>
        <div className="h-[1px] bg-[var(--glass-border)] my-1" />
        <button
          onClick={() => {
            onClose();
            onForceReload(u);
          }}
          disabled={isSelf}
          className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-red-500 hover:bg-theme-input flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none bg-transparent transition-colors"
        >
          Force Reset
        </button>
      </div>
    </>,
    document.body,
  );
};
