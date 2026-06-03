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

export const ComposeModal = ({ onClose }: ComposeModalProps): React.JSX.Element => {
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
    if (!user) {return;}
    dispatch(createConversation({ userIds: [user.id, selectedUser.id], recipient: selectedUser }));
    dispatch(fetchUserProfile(selectedUser.id));
    dispatch(clearSearchResults());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-content p-4 animate-fade-in"
      style={{ background: 'rgba(4,6,12,0.65)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        className="w-[480px] max-w-full max-h-[540px] flex flex-col overflow-hidden animate-slide-up"
        style={{
          background: 'var(--glass-bg)',
          border: '1.5px solid var(--glass-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '18px',
          boxShadow: 'var(--glass-shadow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-muted)' }}>
          <h3 className="text-[17px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            New Conversation
          </h3>
          <button
            id="modal-close-btn"
            className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer text-[18px] leading-none transition-all duration-200 border-none"
            style={{ background: 'var(--theme-btn)', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-btn-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-btn)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Modal search */}
        <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-muted)' }}>
          <input
            id="compose-search"
            type="text"
            className="input-base w-full rounded-[10px] px-4 py-2.5 text-[14px]"
            style={{ background: 'var(--bg-input)', border: '1.5px solid var(--glass-border)', color: 'var(--text-primary)' }}
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Modal user list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2">
          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-[13.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <div className="w-9 h-9 mx-auto mb-3 opacity-30"><IconChat /></div>
              No users found. Try a different search.
            </div>
          ) : (
            searchResults
              .filter((u) => u.id !== user?.id)
              .map((u) => (
                <div
                  key={u.id}
                  id={`compose-user-${u.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-1 border"
                  style={{ borderColor: 'transparent' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--theme-btn-hover)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--glass-border)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}
                  onClick={() => handleSelectSearchedUser(u)}
                >
                  <Avatar letter={(u.displayName || u.email)[0].toUpperCase()} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13.5px] truncate" style={{ color: 'var(--text-primary)' }}>
                      {u.displayName}
                    </div>
                    <div className="text-[11.5px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {u.email}
                    </div>
                  </div>
                  <span className="text-[11.5px] font-bold px-3 py-1.5 rounded-[7px] flex-shrink-0 transition-all duration-200"
                    style={{ background: 'var(--theme-btn-active)', color: 'var(--theme-btn-active-text)' }}>
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
