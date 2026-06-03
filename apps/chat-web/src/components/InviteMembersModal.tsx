import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { searchUsers, clearSearchResults } from '../store/slices/chatSlice';
import { addGroupMembers, Group } from '../store/slices/groupsSlice';
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
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
          width: '460px',
          maxWidth: '100%',
          maxHeight: '80vh',
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
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Invite Friends
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Add new members to <strong style={{ color: 'var(--text-secondary)' }}>{group.name}</strong>
            </p>
          </div>
          <button
            id="close-invite-modal"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '14px 24px', borderBottom: '1.5px solid var(--border-muted)' }}>
          <input
            id="invite-search-input"
            type="text"
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
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2.5px var(--accent-ring)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* User list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 24px' }}>
          {filteredResults.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '13.5px', color: 'var(--text-muted)' }}>
              <div style={{ opacity: 0.3, marginBottom: '8px' }}>
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    transition: 'all 0.15s',
                    background: isSelected ? 'var(--theme-btn-active)' : 'transparent',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                  }}
                  onClick={() => toggleSelectUser(u.id)}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-input)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Avatar letter={(u.displayName || u.email)[0].toUpperCase()} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: isSelected ? 'var(--theme-btn-active-text)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.displayName}
                    </div>
                    <div style={{ fontSize: '11px', color: isSelected ? 'var(--theme-btn-active-text)' : 'var(--text-muted)', opacity: isSelected ? 0.8 : 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                      {u.email}
                    </div>
                  </div>
                  {/* Custom Checkbox */}
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: '1.5px solid',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                      background: isSelected ? 'var(--accent-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
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
          style={{
            padding: '16px 24px 20px',
            borderTop: '1.5px solid var(--border-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              id="invite-submit-btn"
              type="button"
              onClick={handleInviteSubmit}
              disabled={isLoading || selectedUserIds.length === 0}
              className="btn-send"
              style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: isLoading || selectedUserIds.length === 0 ? 'not-allowed' : 'pointer', opacity: isLoading || selectedUserIds.length === 0 ? 0.5 : 1, color: 'white' }}
            >
              {isLoading ? 'Inviting…' : 'Invite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
