'use client';

import React from 'react';
import type { UserData } from './adminTypes';

interface WarningModalProps {
  isOpen: boolean;
  username: string;
  warningMessage: string;
  warningSubmitting: boolean;
  onChangeMessage: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminWarningModal: React.FC<WarningModalProps> = ({
  isOpen,
  username,
  warningMessage,
  warningSubmitting,
  onChangeMessage,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel p-6 max-w-md w-full animate-slide-up flex flex-col gap-4 border border-glass shadow-2xl">
        <div className="flex items-center gap-3 border-b border-glass pb-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-theme-primary">
              Send Warning Notification
            </h2>
            <p className="text-xs text-theme-muted">
              The user @{username} receives it in real-time.
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col p-2 gap-1.5">
            <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
              Warning Message
            </label>
            <textarea
              required
              placeholder="E.g., Your activity in community guidelines violates our service terms."
              value={warningMessage}
              onChange={(e) => onChangeMessage(e.target.value)}
              rows={4}
              className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-sm text-theme-primary placeholder-theme-muted resize-none transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-glass">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={warningSubmitting}
              className="btn-send px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {warningSubmitting ? 'Sending...' : 'Send Warning'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddMemberModalProps {
  isOpen: boolean;
  groupName: string;
  users: UserData[];
  selectedUserId: string;
  addMemberSubmitting: boolean;
  onSelectUser: (userId: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminAddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  groupName,
  users,
  selectedUserId,
  addMemberSubmitting,
  onSelectUser,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel p-6 max-w-md w-full animate-slide-up flex flex-col gap-4 border border-glass shadow-2xl">
        <div className="flex items-center gap-3 border-b border-glass pb-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-theme-secondary">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-theme-primary">
              Direct Server Assignment
            </h2>
            <p className="text-xs text-theme-muted">
              Directly assign a user into {groupName}.
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
              Select Platform User
            </label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => onSelectUser(e.target.value)}
              className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-xs text-theme-primary focus:bg-theme-primary cursor-pointer transition-all"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" className="bg-theme-primary text-theme-muted">
                -- Choose User --
              </option>
              {users.map((u) => (
                <option
                  key={u.id}
                  value={u.id}
                  className="bg-theme-primary text-theme-primary"
                >
                  {u.displayName || u.username} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-glass">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMemberSubmitting || !selectedUserId}
              className="btn-send px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {addMemberSubmitting ? 'Adding...' : 'Add to Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface FriendRequestModalProps {
  isOpen: boolean;
  username: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AdminFriendRequestModal: React.FC<FriendRequestModalProps> = ({
  isOpen,
  username,
  submitting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel p-6 max-w-sm w-full animate-slide-up flex flex-col gap-4 border border-glass shadow-2xl">
        <div className="flex items-center gap-3 border-b border-glass pb-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-theme-primary">
              Send Friend Request
            </h2>
            <p className="text-xs text-theme-muted">
              Send a friend request to @{username} as the platform admin.
            </p>
          </div>
        </div>
        <p className="text-xs text-theme-secondary leading-relaxed">
          This will send a friend request from your admin account to{' '}
          <span className="font-bold text-theme-primary">@{username}</span>.
          They will be notified in real-time.
        </p>
        <div className="flex justify-end gap-3 pt-2 border-t border-glass">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-emerald-500 hover:bg-emerald-600 border-none shadow-sm"
          >
            {submitting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface EditIdentityModalProps {
  isOpen: boolean;
  currentUsername: string;
  currentDisplayName: string;
  editUsername: string;
  editDisplayName: string;
  editReason: string;
  submitting: boolean;
  onChangeUsername: (val: string) => void;
  onChangeDisplayName: (val: string) => void;
  onChangeReason: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminEditIdentityModal: React.FC<EditIdentityModalProps> = ({
  isOpen,
  currentUsername,
  currentDisplayName,
  editUsername,
  editDisplayName,
  editReason,
  submitting,
  onChangeUsername,
  onChangeDisplayName,
  onChangeReason,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel p-6 max-w-lg w-full animate-slide-up flex flex-col gap-4 border border-glass shadow-2xl">
        <div className="flex items-center gap-3 border-b border-glass pb-3">
          <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-theme-primary">
              Edit User Identity
            </h2>
            <p className="text-xs text-theme-muted">
              Modify @{currentUsername}&apos;s username or Name.
            </p>
          </div>
        </div>

        {/* Warning notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px]">
          <svg
            className="w-3.5 h-3.5 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            The user will be notified in real-time:{' '}
            <strong>
              &ldquo;Relay Guardian AI changed your [field] due to:
              [reason]&rdquo;
            </strong>
          </span>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                New Username
              </label>
              <input
                type="text"
                placeholder={currentUsername || 'username'}
                value={editUsername}
                onChange={(e) => onChangeUsername(e.target.value)}
                className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-xs text-theme-primary placeholder-theme-muted font-mono transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                New Name
              </label>
              <input
                type="text"
                placeholder={currentDisplayName || 'Name'}
                value={editDisplayName}
                onChange={(e) => onChangeDisplayName(e.target.value)}
                className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-xs text-theme-primary placeholder-theme-muted transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              placeholder="E.g., Username contained inappropriate language."
              value={editReason}
              onChange={(e) => onChangeReason(e.target.value)}
              rows={3}
              className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-xs text-theme-primary placeholder-theme-muted resize-none transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-glass">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                (!editUsername.trim() && !editDisplayName.trim()) ||
                !editReason.trim()
              }
              className="btn-send px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? 'Applying...' : 'Apply Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteNoteModalProps {
  isOpen: boolean;
  noteTitle: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AdminDeleteNoteModal: React.FC<DeleteNoteModalProps> = ({
  isOpen,
  noteTitle,
  submitting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel p-6 max-w-sm w-full animate-slide-up flex flex-col gap-4 border border-glass shadow-2xl">
        <div className="flex items-center gap-3 border-b border-glass pb-3">
          <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-theme-primary">
              Delete Update Note
            </h2>
            <p className="text-xs text-theme-muted font-semibold">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <p className="text-xs text-theme-secondary leading-relaxed">
          Are you sure you want to delete update note:{' '}
          <span className="font-bold text-theme-primary">
            &ldquo;{noteTitle}&rdquo;
          </span>
          ? Users will no longer be able to see it.
        </p>
        <div className="flex justify-end gap-3 pt-2 border-t border-glass">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-red-500 hover:bg-red-600 border-none shadow-sm"
          >
            {submitting ? 'Deleting...' : 'Delete Note'}
          </button>
        </div>
      </div>
    </div>
  );
};
