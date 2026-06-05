import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { User } from '../store/slices/authSlice';
import {
  searchUsers,
  clearSearchResults,
  createConversation,
  fetchUserProfile,
} from '../store/slices/chatSlice';

import { Avatar } from './Avatar';
import { IconChat } from './Icons';

interface ComposeModalProps {
  onClose: () => void;
}

export const ComposeModal = ({
  onClose,
}: ComposeModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { searchResults } = useAppSelector((s) => s.chat);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSelectSearchedUser = (selectedUser: User) => {
    if (!user) {
      return;
    }
    dispatch(
      createConversation({
        userIds: [user.id, selectedUser.id],
        recipient: selectedUser,
      }),
    );
    dispatch(fetchUserProfile(selectedUser.id));
    dispatch(clearSearchResults());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in bg-[rgba(4,6,12,0.65)] backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-w-full max-h-[540px] flex flex-col overflow-hidden animate-slide-up bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-muted)]">
          <h3 className="text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
            New Conversation
          </h3>
          <button
            id="modal-close-btn"
            className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer text-[18px] leading-none transition-all duration-200 border-none bg-[var(--theme-btn)] text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)] hover:text-[var(--text-primary)] active-press"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Modal search */}
        <div className="px-5 py-3.5 border-b border-[var(--border-muted)]">
          <input
            id="compose-search"
            type="text"
            className="input-base w-full rounded-[10px] px-4 py-2.5 text-[14px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
          />
        </div>

        {/* Modal user list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2">
          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-[13.5px] leading-relaxed text-[var(--text-muted)]">
              <div className="w-9 h-9 mx-auto mb-3 opacity-30">
                <IconChat />
              </div>
              No users found. Try a different search.
            </div>
          ) : (
            searchResults
              .filter((u) => u.id !== user?.id)
              .map((u) => (
                <div
                  key={u.id}
                  id={`compose-user-${u.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-1 border border-transparent hover:bg-[var(--theme-btn-hover)] hover:border-[var(--glass-border)] active-press fade-in-list"
                  onClick={() => handleSelectSearchedUser(u)}
                >
                  <Avatar
                    letter={(u.displayName || u.email)[0].toUpperCase()}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13.5px] truncate text-[var(--text-primary)]">
                      {u.displayName}
                    </div>
                    <div className="text-[11.5px] truncate mt-0.5 text-[var(--text-muted)]">
                      {u.email}
                    </div>
                  </div>
                  <span className="text-[11.5px] font-bold px-3 py-1.5 rounded-[7px] flex-shrink-0 transition-all duration-200 bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)] active-press">
                    Chat
                  </span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};
