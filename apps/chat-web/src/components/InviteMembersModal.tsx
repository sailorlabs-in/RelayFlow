import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { fetchFriends } from '../store/slices/chatSlice';
import type { Group } from '../store/slices/groupsSlice';
import {
  addGroupMembers,
  fetchGroupInvites,
  createGroupInvite,
  revokeGroupInvite,
} from '../store/slices/groupsSlice';

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
  const { user, timeFormat } = useAppSelector((s) => s.auth);
  const { friends, onlineUsers } = useAppSelector((s) => s.chat);
  const {
    invites,
    isInvitesLoading,
    isGeneratingInvite: isGenerating,
  } = useAppSelector((s) => s.groups);

  const [activeTab, setActiveTab] = useState<'add' | 'links'>('add');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Invite Link States
  const [expiresIn, setExpiresIn] = useState('24h');

  // Fetch friends and invites on mount
  useEffect(() => {
    dispatch(fetchFriends());
  }, [dispatch]);

  // Load invites when link tab is selected or on mount
  const loadInvites = () => {
    dispatch(fetchGroupInvites(group.id));
  };

  useEffect(() => {
    if (activeTab === 'links') {
      loadInvites();
    }
  }, [activeTab, dispatch, group.id]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleInviteSubmit = async () => {
    if (selectedUserIds.length === 0) {
      showToast.error('Please select at least one user.');
      return;
    }
    setIsLoading(true);
    try {
      await dispatch(
        addGroupMembers({ groupId: group.id, userIds: selectedUserIds }),
      ).unwrap();
      showToast.success('Invites sent successfully!');
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to send invites.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a new invite link
  const handleGenerateLink = async () => {
    try {
      const result = await dispatch(
        createGroupInvite({ groupId: group.id, expiresIn }),
      ).unwrap();
      // Copy to clipboard
      const inviteUrl = `${window.location.origin}/invite/${result.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      showToast.success('Invite link generated and copied to clipboard!');
      // Reload invites list
      loadInvites();
    } catch (err: any) {
      showToast.error(err || 'Failed to generate invite link.');
    }
  };

  // Revoke an active invite link
  const handleRevokeLink = async (inviteId: string) => {
    try {
      await dispatch(
        revokeGroupInvite({ groupId: group.id, inviteId }),
      ).unwrap();
      showToast.success('Invite link revoked.');
    } catch (err: any) {
      showToast.error(err || 'Failed to revoke invite link.');
    }
  };

  // Filter out friends who are already members
  const existingMemberIds = new Set(group.members.map((m) => m.userId));
  const filteredResults = friends.filter(
    (u) =>
      u.id !== user?.id &&
      !existingMemberIds.has(u.id) &&
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
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-xs">
      <div
        className="w-120 max-w-full h-150 max-h-[85vh] flex flex-col overflow-hidden bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-[18px] shadow-(--glass-shadow) animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-theme flex items-center justify-between shrink-0">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-theme-primary">
              Invite Members
            </h2>
            <p className="m-1 text-[12.5px] text-theme-muted">
              Manage invites for{' '}
              <strong className="text-theme-secondary">{group.name}</strong>
            </p>
          </div>
          <button
            id="close-invite-modal"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-theme-muted p-1 rounded-md flex items-center active-press"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-theme px-5 bg-[rgba(255,255,255,0.01)] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`py-3 px-4 text-[13px] font-bold bg-transparent border-none cursor-pointer relative transition-all duration-150 ${activeTab === 'add' ? 'text-(--accent-primary)' : 'text-theme-muted hover:text-theme-secondary'}`}
          >
            Add Friends
            {activeTab === 'add' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-(--accent-primary) rounded-full animate-fade-in" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`py-3 px-4 text-[13px] font-bold bg-transparent border-none cursor-pointer relative transition-all duration-150 ${activeTab === 'links' ? 'text-(--accent-primary)' : 'text-theme-muted hover:text-theme-secondary'}`}
          >
            Invite Links
            {activeTab === 'links' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-(--accent-primary) rounded-full animate-fade-in" />
            )}
          </button>
        </div>

        {/* Tab 1: Add Friends Panel */}
        {activeTab === 'add' && (
          <>
            {/* Search */}
            <div className="px-5 py-3 border-b border-theme shrink-0">
              <input
                id="invite-search-input"
                type="text"
                className="input-base w-full px-3.5 py-2.5 rounded-[10px] bg-theme-input border-[1.5px] border-glass text-theme-primary text-sm box-border focus:outline-none focus:border-(--accent-primary) focus:ring-[2.5px] focus:ring-(--accent-ring)"
                placeholder="Search friends by name, username or email..."
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
              />
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {filteredResults.length === 0 ? (
                <div className="py-10 px-5 text-center text-[13.5px] text-theme-muted flex flex-col items-center justify-center gap-2">
                  <IconPeople />
                  <span>No eligible friends found.</span>
                </div>
              ) : (
                filteredResults.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      id={`invite-user-${u.id}`}
                      className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl cursor-pointer mb-1 transition-all duration-150 border active-press fade-in-list ${isSelected ? 'bg-(--theme-btn-active) border-(--accent-primary)' : 'bg-transparent border-transparent hover:bg-theme-input'}`}
                      onClick={() => toggleSelectUser(u.id)}
                    >
                      <Avatar
                        letter={(u.username ||
                          u.displayName ||
                          u.email)[0].toUpperCase()}
                        url={u.avatarThumbnailUrl || u.avatarUrl}
                        status={onlineUsers[u.id] || 'offline'}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[13.5px] font-semibold truncate ${isSelected ? 'text-(--theme-btn-active-text)' : 'text-theme-primary'}`}
                        >
                          {u.username
                            ? `@${u.username}`
                            : u.displayName || u.email.split('@')[0]}
                        </div>
                        <div
                          className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-(--theme-btn-active-text) opacity-80' : 'text-theme-muted'}`}
                        >
                          {u.username && u.displayName
                            ? `${u.displayName} • `
                            : ''}
                          {u.email}
                        </div>
                      </div>
                      {/* Checkbox */}
                      <div
                        className={`w-4.5 h-4.5 rounded-sm border-[1.5px] flex items-center justify-center text-[11px] font-bold shrink-0 text-white ${isSelected ? 'border-(--accent-primary) bg-(--accent-primary)' : 'border-(--text-muted) bg-transparent'}`}
                      >
                        {isSelected && '✓'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-theme flex justify-between items-center shrink-0">
              <div className="text-[13px] text-theme-muted">
                {selectedUserIds.length} friend
                {selectedUserIds.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-glass bg-transparent text-theme-secondary text-sm font-semibold cursor-pointer active-press"
                >
                  Cancel
                </button>
                <button
                  id="invite-submit-btn"
                  type="button"
                  onClick={handleInviteSubmit}
                  disabled={isLoading || selectedUserIds.length === 0}
                  className="btn-send px-6 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 active-press"
                >
                  {isLoading ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Invite Links Panel */}
        {activeTab === 'links' && (
          <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
            {/* Link Generator Box */}
            <div className="p-4 rounded-xl border border-glass bg-(--theme-btn) flex flex-col gap-3 shrink-0">
              <label className="text-[11px] font-bold uppercase tracking-wider text-theme-secondary">
                Create Invite Link
              </label>
              <div className="flex gap-2.5">
                <div className="flex-1">
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[10px] bg-(--dropdown-bg) border-[1.5px] border-glass text-theme-primary text-sm box-border focus:outline-none focus:border-(--accent-primary)"
                  >
                    <option
                      value="1h"
                      className="bg-(--dropdown-bg) text-theme-primary"
                    >
                      Expires in 1 Hour
                    </option>
                    <option
                      value="2h"
                      className="bg-(--dropdown-bg) text-theme-primary"
                    >
                      Expires in 2 Hours
                    </option>
                    <option
                      value="24h"
                      className="bg-(--dropdown-bg) text-theme-primary"
                    >
                      Expires in 24 Hours
                    </option>
                    <option
                      value="7d"
                      className="bg-(--dropdown-bg) text-theme-primary"
                    >
                      Expires in 7 Days
                    </option>
                    <option
                      value="30d"
                      className="bg-(--dropdown-bg) text-theme-primary"
                    >
                      Expires in 30 Days
                    </option>
                    <option
                      value="never"
                      className="bg-(--dropdown-bg) text-theme-primary"
                    >
                      Never Expires
                    </option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="btn-send px-5 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white disabled:opacity-50 active-press shrink-0"
                >
                  {isGenerating ? 'Generating…' : 'Generate Link'}
                </button>
              </div>
            </div>

            {/* Links List Header */}
            <div className="text-[11.5px] font-bold uppercase tracking-wider text-theme-secondary mt-1 shrink-0">
              Active Invite Links
            </div>

            {/* Links list scrollbox */}
            <div className="flex-1 overflow-y-auto pr-1">
              {isInvitesLoading ? (
                <div className="py-10 text-center text-[13px] text-theme-muted">
                  Loading invite links...
                </div>
              ) : invites?.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-theme-muted">
                  No active invite links. Generate one above!
                </div>
              ) : (
                invites?.map((invite) => {
                  const inviteUrl = `${window.location.origin}/invite/${invite.token}`;
                  const isExpired =
                    invite.expiresAt && new Date(invite.expiresAt) < new Date();
                  const isOwner = group.ownerId === user?.id;
                  const isCreator = invite.createdBy === user?.id;

                  return (
                    <div
                      key={invite.id}
                      className="p-3.5 rounded-xl border border-glass bg-[rgba(255,255,255,0.015)] mb-2.5 flex flex-col gap-2 relative fade-in-list"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono select-all truncate text-theme-primary font-semibold flex-1">
                          {inviteUrl}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(inviteUrl);
                              showToast.info('Link copied to clipboard!');
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-glass bg-(--theme-btn) text-theme-secondary hover:text-theme-primary cursor-pointer active-press"
                          >
                            Copy
                          </button>
                          {/* Revoke Link Button */}
                          {(isOwner || isCreator) && (
                            <button
                              type="button"
                              onClick={() => handleRevokeLink(invite.id)}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-transparent bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] text-(--danger) cursor-pointer active-press"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[10.5px] text-theme-muted border-t border-[rgba(255,255,255,0.04)] pt-2 mt-0.5 shrink-0">
                        <span>
                          {invite.expiresAt ? (
                            isExpired ? (
                              <span className="text-(--danger)">Expired</span>
                            ) : (
                              `Expires: ${new Date(
                                invite.expiresAt,
                              ).toLocaleString([], {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: timeFormat !== '24h',
                              })}`
                            )
                          ) : (
                            'Never Expires'
                          )}
                        </span>
                        <span>
                          Created:{' '}
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
