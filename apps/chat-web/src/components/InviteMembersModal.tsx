import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { searchUsers, clearSearchResults } from '../store/slices/chatSlice';
import type { Group } from '../store/slices/groupsSlice';
import { addGroupMembers } from '../store/slices/groupsSlice';

import { Avatar } from './Avatar';
import { IconX, IconPeople } from './Icons';
import { showToast } from './toast';

interface InviteMembersModalProps {
  group: Group;
  onClose: () => void;
}

export const InviteMembersModal = ({
  group,
  onClose,
}: InviteMembersModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { searchResults } = useAppSelector((s) => s.chat);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search all users on modal load
  useEffect(() => {
    dispatch(searchUsers(''));
    return () => {
      dispatch(clearSearchResults());
    };
  }, [dispatch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      dispatch(searchUsers(val.trim()));
    } else {
      dispatch(searchUsers(''));
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleInviteSubmit = async () => {
    if (selectedUserIds.length === 0) {
      showToast.error('Please select at least one user.');
      return;
    }
    setIsLoading(true);
    try {
      await dispatch(addGroupMembers({ groupId: group.id, userIds: selectedUserIds })).unwrap();
      showToast.success('Invites sent successfully!');
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to send invites.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out users who are already members
  const existingMemberIds = new Set(group.members.map((m) => m.userId));
  const filteredResults = searchResults.filter(
    (u) => u.id !== user?.id && !existingMemberIds.has(u.id),
  );

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-[14px]"
      onClick={onClose}
    >
      <div
        className="w-[460px] max-w-full max-h-[80vh] flex flex-col overflow-hidden bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-muted)] flex items-center justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-[var(--text-primary)]">
              Invite Friends
            </h2>
            <p className="m-1 text-[12.5px] text-[var(--text-muted)]">
              Add new members to <strong className="text-[var(--text-secondary)]">{group.name}</strong>
            </p>
          </div>
          <button
            id="close-invite-modal"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 rounded-md flex items-center"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3.5 border-b border-[var(--border-muted)]">
          <input
            id="invite-search-input"
            type="text"
            className="input-base w-full px-3.5 py-2.5 rounded-[10px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] text-sm box-border focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[2.5px] focus:ring-[var(--accent-ring)]"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
          />
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-5 py-2.5">
          {filteredResults.length === 0 ? (
            <div className="py-10 px-5 text-center text-[13.5px] text-[var(--text-muted)]">
              <div className="opacity-30 mb-2">
                <IconPeople />
              </div>
              No eligible users found.
            </div>
          ) : (
            filteredResults.map((u) => {
              const isSelected = selectedUserIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  id={`invite-user-${u.id}`}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer mb-1 transition-all duration-150 border ${isSelected ? 'bg-[var(--theme-btn-active)] border-[var(--accent-primary)]' : 'bg-transparent border-transparent hover:bg-[var(--bg-input)]'}`}
                  onClick={() => toggleSelectUser(u.id)}
                >
                  <Avatar letter={(u.displayName || u.email)[0].toUpperCase()} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13.5px] font-semibold truncate ${isSelected ? 'text-[var(--theme-btn-active-text)]' : 'text-[var(--text-primary)]'}`}>
                      {u.displayName}
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-[var(--theme-btn-active-text)] opacity-80' : 'text-[var(--text-muted)]'}`}>
                      {u.email}
                    </div>
                  </div>
                  {/* Custom Checkbox */}
                  <div
                    className={`w-[18px] h-[18px] rounded-[4px] border-[1.5px] flex items-center justify-center text-[11px] font-bold shrink-0 text-white ${isSelected ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-[var(--text-muted)] bg-transparent'}`}
                  >
                    {isSelected && '✓'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t border-[var(--border-muted)] flex justify-between items-center"
        >
          <div className="text-[13px] text-[var(--text-muted)]">
            {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--glass-border)] bg-transparent text-[var(--text-secondary)] text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="invite-submit-btn"
              type="button"
              onClick={handleInviteSubmit}
              disabled={isLoading || selectedUserIds.length === 0}
              className="btn-send px-6 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Inviting…' : 'Invite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
