import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { User } from '../store/slices/authSlice';
import { searchUsers, clearSearchResults } from '../store/slices/chatSlice';
import { createGroup } from '../store/slices/groupsSlice';

import { Avatar } from './Avatar';
import { IconX, IconSearch, IconPlus } from './Icons';
import { showToast } from './toast';

interface CreateGroupModalProps {
  onClose: () => void;
}

export const CreateGroupModal = ({ onClose }: CreateGroupModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { searchResults } = useAppSelector((s) => s.chat);

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      dispatch(searchUsers(val.trim()));
    } else {
      dispatch(clearSearchResults());
    }
  };

  const handleAddUser = (u: User) => {
    if (!selectedUsers.some((s) => s.id === u.id)) {
      setSelectedUsers((prev) => [...prev, u]);
    }
    setSearchQuery('');
    dispatch(clearSearchResults());
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
      dispatch(clearSearchResults());
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to create group.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResults = searchResults.filter(
    (u) => u.id !== user?.id && !selectedUsers.some((s) => s.id === u.id),
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(4,6,12,0.65)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '480px',
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--glass-bg)',
          border: '1.5px solid var(--glass-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '18px',
          boxShadow: 'var(--glass-shadow)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1.5px solid var(--border-muted)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Create a Group
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Your group is where your friends hang out.
            </p>
          </div>
          <button
            id="close-create-group-modal"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Group Name */}
          <div>
            <label
              htmlFor="group-name-input"
              style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}
            >
              Group Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="group-name-input"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. The Squad, Dev Team…"
              maxLength={100}
              required
              className="input-base"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1.5px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2.5px var(--accent-ring)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="group-desc-input"
              style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}
            >
              Description <span style={{ fontSize: '10px', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optional)</span>
            </label>
            <input
              id="group-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              maxLength={500}
              className="input-base"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1.5px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2.5px var(--accent-ring)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Add Members */}
          <div>
            <label
              style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}
            >
              Add Members <span style={{ fontSize: '10px', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optional)</span>
            </label>

            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {selectedUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px 4px 6px',
                      borderRadius: '20px',
                      background: 'var(--theme-btn-active)',
                      border: '1px solid var(--accent-primary)',
                    }}
                  >
                    <Avatar letter={(u.displayName || u.email)[0].toUpperCase()} size="sm" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-btn-active-text)' }}>
                      {u.displayName || u.email.split('@')[0]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(u.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                    >
                      <IconX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex' }}>
                <IconSearch />
              </span>
              <input
                id="add-members-search"
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by name or email…"
                className="input-base"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  borderRadius: '10px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2.5px var(--accent-ring)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />

              {/* Search Dropdown */}
              {filteredResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: 'var(--glass-bg)',
                    border: '1.5px solid var(--glass-border)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: 'var(--glass-shadow)',
                  }}
                >
                  {filteredResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleAddUser(u)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        borderBottom: '1px solid var(--border-muted)',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-input)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <Avatar letter={(u.displayName || u.email)[0].toUpperCase()} size="sm" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.displayName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', color: 'var(--accent-primary)', display: 'flex' }}>
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
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1.5px solid var(--border-muted)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1.5px solid var(--glass-border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            id="create-group-submit-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !groupName.trim()}
            className="btn-send"
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLoading || !groupName.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !groupName.trim() ? 0.5 : 1,
              color: 'white',
            }}
          >
            {isLoading ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
