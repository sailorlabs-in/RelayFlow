import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { User } from '../store/slices/authSlice';
import { createGroup } from '../store/slices/groupsSlice';

import { Avatar } from './Avatar';
import { IconX, IconSearch, IconPlus } from './Icons';
import { showToast } from './toast';

interface CreateGroupModalProps {
  onClose: () => void;
}

export const CreateGroupModal = ({
  onClose,
}: CreateGroupModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { friends } = useAppSelector((s) => s.chat);

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleAddUser = (u: User) => {
    if (!selectedUsers.some((s) => s.id === u.id)) {
      setSelectedUsers((prev) => [...prev, u]);
    }
    setSearchQuery('');
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showToast.error('Please enter a group name.');
      return;
    }
    setIsLoading(true);
    try {
      await dispatch(
        createGroup({
          name: groupName.trim(),
          description: description.trim() || undefined,
          memberUserIds: selectedUsers.map((u) => u.id),
        }),
      ).unwrap();
      showToast.success(`Group "${groupName}" created!`);
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to create group.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResults = friends.filter(
    (u) =>
      u.id !== user?.id &&
      !selectedUsers.some((s) => s.id === u.id) &&
      (searchQuery.trim() === '' ||
        (u.displayName || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim()) ||
        (u.username || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase().trim())),
  );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-muted)] flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-[var(--text-primary)]">
              Create a Group
            </h2>
            <p className="m-1 text-[13px] text-[var(--text-muted)]">
              Your group is where your friends hang out.
            </p>
          </div>
          <button
            id="close-create-group-modal"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 rounded-md flex items-center shrink-0 active-press"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4"
        >
          {/* Group Name */}
          <div>
            <label
              htmlFor="group-name-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2"
            >
              Group Name <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              id="group-name-input"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. The Squad, Dev Team…"
              maxLength={100}
              required
              className="input-base w-full px-3.5 py-2.5 rounded-[10px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] text-sm box-border focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[2.5px] focus:ring-[var(--accent-ring)]"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="group-desc-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2"
            >
              Description{' '}
              <span className="text-xs text-normal normal-case tracking-none font-normal">
                (optional)
              </span>
            </label>
            <input
              id="group-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              maxLength={500}
              className="input-base w-full px-3.5 py-2.5 rounded-[10px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] text-sm box-border focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[2.5px] focus:ring-[var(--accent-ring)]"
            />
          </div>

          {/* Add Members */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Add Members{' '}
              <span className="text-xs text-normal normal-case tracking-none font-normal">
                (optional)
              </span>
            </label>

            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-1.5 py-1 pl-1.5 pr-2 rounded-full bg-[var(--theme-btn-active)] border border-[var(--accent-primary)]"
                  >
                    <Avatar
                      letter={(u.username ||
                        u.displayName ||
                        u.email)[0].toUpperCase()}
                      size="sm"
                    />
                    <span className="text-xs font-semibold text-[var(--theme-btn-active-text)]">
                      {u.username
                        ? `@${u.username}`
                        : u.displayName || u.email.split('@')[0]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(u.id)}
                      className="bg-transparent border-none cursor-pointer p-0 flex items-center text-[var(--text-muted)] active-press"
                    >
                      <IconX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex">
                <IconSearch />
              </span>
              <input
                id="add-members-search"
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by name or email…"
                className="input-base w-full py-2.5 pl-9 pr-3.5 rounded-[10px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] text-[13.5px] box-border focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[2.5px] focus:ring-[var(--accent-ring)]"
              />

              {/* Search Dropdown */}
              {(isSearchFocused || searchQuery.trim() !== '') &&
                filteredResults.length > 0 && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] rounded-[10px] overflow-y-auto max-h-[180px] z-[100] shadow-[var(--glass-shadow)]">
                    {filteredResults.map((u) => (
                      <div
                        key={u.id}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevents blur event
                          handleAddUser(u);
                        }}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer border-b border-[var(--border-muted)] hover:bg-[var(--bg-input)] transition-colors duration-150 active-press fade-in-list"
                      >
                        <Avatar
                          letter={(u.username ||
                            u.displayName ||
                            u.email)[0].toUpperCase()}
                          size="sm"
                        />
                        <div>
                          <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                            {u.username
                              ? `@${u.username}`
                              : u.displayName || u.email.split('@')[0]}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {u.username && u.displayName
                              ? `${u.displayName} • `
                              : ''}
                            {u.email}
                          </div>
                        </div>
                        <div className="ml-auto text-[var(--accent-primary)] flex">
                          <IconPlus size={14} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--border-muted)] flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--glass-border)] bg-transparent text-[var(--text-secondary)] text-sm font-semibold cursor-pointer active-press"
          >
            Cancel
          </button>
          <button
            id="create-group-submit-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !groupName.trim()}
            className="btn-send px-6 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 active-press"
          >
            {isLoading ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
