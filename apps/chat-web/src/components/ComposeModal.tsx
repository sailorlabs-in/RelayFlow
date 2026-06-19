import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { User } from '../store/slices/authSlice';
import {
  createConversation,
  fetchUserProfile,
  fetchFriends,
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
  const { friends } = useAppSelector((s) => s.chat);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch friends list on mount
  useEffect(() => {
    dispatch(fetchFriends());
  }, [dispatch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
    onClose();
  };

  // Filter friends list locally
  const filteredFriends = friends.filter((f) => {
    if (!searchQuery.trim()) {
      return true;
    }
    const query = searchQuery.toLowerCase().trim();
    return (
      (f.displayName && f.displayName.toLowerCase().includes(query)) ||
      f.email.toLowerCase().includes(query) ||
      (f.username && f.username.toLowerCase().includes(query))
    );
  });

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center p-4 animate-fade-in bg-[rgba(4,6,12,0.65)] backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-120 max-w-full max-h-135 flex flex-col overflow-hidden animate-slide-up bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-[18px] shadow-(--glass-shadow)"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <h3 className="text-[17px] font-bold tracking-tight text-theme-primary">
            New Conversation
          </h3>
          <button
            id="modal-close-btn"
            className="w-7.5 h-7.5 rounded-lg flex items-center justify-center cursor-pointer text-[18px] leading-none transition-all duration-200 border-none bg-(--theme-btn) text-theme-muted hover:bg-(--theme-btn-hover) hover:text-theme-primary active-press"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Modal search */}
        <div className="px-5 py-3.5 border-b border-theme">
          <input
            id="compose-search"
            type="text"
            className="input-base w-full rounded-[10px] px-4 py-2.5 text-[14px] bg-theme-input border-[1.5px] border-glass text-theme-primary focus:outline-none focus:border-(--accent-primary) focus:ring-[3px] focus:ring-(--accent-ring)"
            placeholder="Search friends by name, email or username…"
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
          />
        </div>

        {/* Modal user list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2">
          {filteredFriends.length === 0 ? (
            <div className="py-12 text-center text-[13.5px] leading-relaxed text-theme-muted">
              <div className="w-9 h-9 mx-auto mb-3 opacity-30">
                <IconChat />
              </div>
              No friends found. Try a different search, or add friends in the
              Friends tab.
            </div>
          ) : (
            filteredFriends
              .filter((u) => u.id !== user?.id)
              .map((u) => (
                <div
                  key={u.id}
                  id={`compose-user-${u.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-1 border border-transparent hover:bg-(--theme-btn-hover) hover:border-glass active-press fade-in-list"
                  onClick={() => handleSelectSearchedUser(u)}
                >
                  <Avatar
                    letter={(u.username ||
                      u.displayName ||
                      u.email)[0].toUpperCase()}
                    url={u.avatarThumbnailUrl || u.avatarUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13.5px] truncate text-theme-primary">
                      {u.username
                        ? `@${u.username}`
                        : u.displayName || u.email.split('@')[0]}
                    </div>
                    <div className="text-[11.5px] truncate mt-0.5 text-theme-muted">
                      {u.username && u.displayName ? `${u.displayName} • ` : ''}
                      {u.email}
                    </div>
                  </div>
                  <span className="text-[11.5px] font-bold px-3 py-1.5 rounded-[7px] shrink-0 transition-all duration-200 bg-(--theme-btn-active) text-(--theme-btn-active-text) active-press">
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
