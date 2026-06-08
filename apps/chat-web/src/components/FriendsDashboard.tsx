import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../constants/config';
import { useAppDispatch, useAppSelector } from '../store';
import type { User } from '../store/slices/authSlice';
import {
  fetchFriends,
  fetchPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  createConversation,
  fetchUserProfile,
} from '../store/slices/chatSlice';
import { Avatar } from './Avatar';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';

export const FriendsDashboard = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user, accessToken } = useAppSelector((s) => s.auth);
  const { friends, pendingRequests, onlineUsers } = useAppSelector(
    (s) => s.chat,
  );

  const [activeTab, setActiveTab] = useState<
    'online' | 'all' | 'pending' | 'add'
  >('online');

  // Add Friend state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundUsers, setFoundUsers] = useState<User[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    friendId: string;
    friendName: string;
  } | null>(null);

  const [hoveredFriend, setHoveredFriend] = useState<any | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const handleMouseEnterFriend = (
    e: React.MouseEvent<HTMLDivElement>,
    friend: User,
    status: string,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPosition({
      top: rect.top + rect.height / 2,
      left: rect.left + 260,
    });
    setHoveredFriend({
      ...friend,
      presence: status,
    });
  };

  const handleMouseLeaveFriend = () => {
    setHoveredFriend(null);
  };

  useEffect(() => {
    dispatch(fetchFriends());
    dispatch(fetchPendingRequests());
  }, [dispatch]);

  // Load initial user list when entering Add Friend tab or when access token changes
  useEffect(() => {
    if (activeTab === 'add' && accessToken) {
      const fetchInitialUsers = async () => {
        setSearchLoading(true);
        setSearchError(null);
        try {
          const response = await axios.get(
            `${API_URL}/users/search-friend?query=`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );
          setFoundUsers(response.data.data || []);
        } catch (err: any) {
          setSearchError(
            err.response?.data?.error?.message ||
              err.response?.data?.message ||
              'Failed to load users.',
          );
        } finally {
          setSearchLoading(false);
        }
      };
      fetchInitialUsers();
    }
  }, [activeTab, accessToken]);

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await axios.get(
        `${API_URL}/users/search-friend?query=${searchQuery.trim()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      setFoundUsers(response.data.data || []);
    } catch (err: any) {
      setSearchError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'No users found matching query.',
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (targetUser: User) => {
    try {
      await dispatch(
        sendFriendRequest(targetUser.username || targetUser.email),
      ).unwrap();
      setSentRequests((prev) => ({ ...prev, [targetUser.id]: true }));
      showToast.success(
        `Friend request sent to ${targetUser.displayName || targetUser.email}`,
      );
      dispatch(fetchPendingRequests());
    } catch (err: any) {
      showToast.error(err || 'Failed to send friend request.');
    }
  };

  const handleAccept = async (requestId: string, senderName: string) => {
    try {
      await dispatch(acceptFriendRequest(requestId)).unwrap();
      showToast.success(`Friend request from ${senderName} accepted!`);
      dispatch(fetchFriends());
      dispatch(fetchPendingRequests());
    } catch (err: any) {
      showToast.error(err || 'Failed to accept request.');
    }
  };

  const handleDecline = async (requestId: string, actionLabel: string) => {
    try {
      await dispatch(declineFriendRequest(requestId)).unwrap();
      showToast.success(`Friend request ${actionLabel}.`);
      dispatch(fetchPendingRequests());
    } catch (err: any) {
      showToast.error(err || 'Failed to decline request.');
    }
  };

  const handleRemoveFriend = (friendId: string, friendName: string) => {
    setConfirmModal({
      isOpen: true,
      friendId,
      friendName,
    });
  };

  const handleStartDM = (friend: User) => {
    if (!user) {
      return;
    }
    dispatch(
      createConversation({
        userIds: [user.id, friend.id],
        recipient: friend,
      }),
    );
    dispatch(fetchUserProfile(friend.id));
  };

  // Filters
  const onlineFriends = friends.filter((f) => {
    const status = onlineUsers[f.id] || 'offline';
    return status === 'online' || status === 'away' || status === 'dnd';
  });

  const incomingPending = pendingRequests?.incoming || [];
  const outgoingPending = pendingRequests?.outgoing || [];
  const pendingCount = incomingPending.length;

  const getFriendshipAction = (targetUser: User) => {
    if (targetUser.id === user?.id) {
      return null;
    }

    const isAlreadyFriend = friends.some((f) => f.id === targetUser.id);
    if (isAlreadyFriend) {
      return (
        <span className="text-[12.5px] font-bold text-sky-500 bg-[rgba(56,189,248,0.1)] px-3 py-1.5 rounded-lg border border-sky-500/20">
          Friends
        </span>
      );
    }

    const isOutgoing =
      outgoingPending.some(
        (req) =>
          req.addresseeId === targetUser.id ||
          req.addressee?.id === targetUser.id,
      ) || sentRequests[targetUser.id];
    if (isOutgoing) {
      return (
        <span className="text-[12.5px] font-bold text-amber-500 bg-[rgba(245,158,11,0.1)] px-3 py-1.5 rounded-lg border border-amber-500/20">
          Request Sent
        </span>
      );
    }

    const isIncoming = incomingPending.some(
      (req) =>
        req.requesterId === targetUser.id ||
        req.requester?.id === targetUser.id,
    );
    if (isIncoming) {
      const incomingReq = incomingPending.find(
        (req) =>
          req.requesterId === targetUser.id ||
          req.requester?.id === targetUser.id,
      );
      const name = targetUser.username
        ? `@${targetUser.username}`
        : targetUser.displayName || targetUser.email.split('@')[0];
      return (
        <button
          onClick={() => incomingReq && handleAccept(incomingReq.id, name)}
          className="px-4 py-2 rounded-xl border-none cursor-pointer font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all duration-150 active-press"
        >
          Accept Request
        </button>
      );
    }

    return (
      <button
        onClick={() => handleSendRequest(targetUser)}
        className="px-4 py-2 rounded-xl border-none cursor-pointer font-semibold text-white bg-[var(--accent-primary)] hover:opacity-95 transition-all duration-150 active-press"
      >
        Send Request
      </button>
    );
  };

  if (!user) {
    return (
      <div className="flex-1 p-6 text-center text-[var(--text-muted)]">
        Loading friends dashboard...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full flex-1 bg-[var(--bg-chat)] rounded-2xl overflow-hidden animate-fade-in">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-4.5 border-b border-[var(--border-muted)] bg-[var(--bg-sidebar)]">
        <div className="flex items-center gap-3">
          <div className="text-[var(--text-primary)] flex shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5 text-[var(--accent-primary)]"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className="text-[16px] font-bold text-[var(--text-primary)] mr-4">
            Friends
          </h2>

          {/* Navigation Tabs */}
          <div className="flex gap-1.5 items-center select-none">
            {[
              { id: 'online', label: 'Online' },
              { id: 'all', label: 'All Friends' },
              { id: 'pending', label: 'Pending' },
              { id: 'add', label: 'Add Friend' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const isAdd = tab.id === 'add';
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id !== 'add') {
                      setSearchQuery('');
                      setFoundUsers([]);
                      setSearchError(null);
                    }
                  }}
                  className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all duration-150 active-press
                    ${
                      isActive
                        ? isAdd
                          ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                          : 'bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)] font-bold'
                        : isAdd
                          ? 'bg-transparent text-[var(--accent-primary)] border border-[var(--accent-primary)] hover:bg-[rgba(56,189,248,0.1)]'
                          : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  {tab.label}
                  {tab.id === 'pending' && pendingCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--danger)] text-white text-[9.5px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB: ONLINE */}
        {activeTab === 'online' && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Online Friends ({onlineFriends.length})
            </h3>
            {onlineFriends.length === 0 ? (
              <div className="py-24 text-center text-[13.5px] text-[var(--text-muted)] flex flex-col items-center gap-3 justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-12 h-12 opacity-30"
                >
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" />
                </svg>
                <span>No friends online right now. Check back later!</span>
              </div>
            ) : (
              onlineFriends.map((friend) => (
                <FriendRow
                  key={friend.id}
                  friend={friend}
                  status={onlineUsers[friend.id] || 'offline'}
                  onChat={handleStartDM}
                  onRemove={handleRemoveFriend}
                  onMouseEnter={(e) =>
                    handleMouseEnterFriend(
                      e,
                      friend,
                      onlineUsers[friend.id] || 'offline',
                    )
                  }
                  onMouseLeave={handleMouseLeaveFriend}
                />
              ))
            )}
          </div>
        )}

        {/* TAB: ALL */}
        {activeTab === 'all' && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              All Friends ({friends.length})
            </h3>
            {friends.length === 0 ? (
              <div className="py-24 text-center text-[13.5px] text-[var(--text-muted)] flex flex-col items-center gap-3 justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-12 h-12 opacity-30"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <span>
                  No friends added yet. Click "Add Friend" above to add one.
                </span>
              </div>
            ) : (
              friends.map((friend) => (
                <FriendRow
                  key={friend.id}
                  friend={friend}
                  status={onlineUsers[friend.id] || 'offline'}
                  onChat={handleStartDM}
                  onRemove={handleRemoveFriend}
                  onMouseEnter={(e) =>
                    handleMouseEnterFriend(
                      e,
                      friend,
                      onlineUsers[friend.id] || 'offline',
                    )
                  }
                  onMouseLeave={handleMouseLeaveFriend}
                />
              ))
            )}
          </div>
        )}

        {/* TAB: PENDING */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {/* Incoming Requests */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Incoming Friend Requests ({incomingPending.length})
              </h3>
              {incomingPending.length === 0 ? (
                <div className="py-6 px-4 rounded-xl border border-dashed border-[var(--glass-border)] text-center text-[12.5px] text-[var(--text-muted)] bg-[rgba(0,0,0,0.01)] dark:bg-[rgba(255,255,255,0.005)]">
                  No pending incoming requests.
                </div>
              ) : (
                incomingPending.map((req) => {
                  const requester = req.requester || {
                    displayName: 'User',
                    email: 'unknown',
                    username: '',
                  };
                  const name = requester.username
                    ? `@${requester.username}`
                    : requester.displayName || requester.email.split('@')[0];
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--theme-btn)] border border-[var(--glass-border)] mb-2 animate-fade-in"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          letter={(requester.username ||
                            requester.displayName ||
                            requester.email)[0].toUpperCase()}
                          url={requester.avatarUrl}
                          size="md"
                        />
                        <div>
                          <div className="font-semibold text-[13.5px] text-[var(--text-primary)]">
                            {name}
                          </div>
                          <div className="text-[11.5px] text-[var(--text-muted)]">
                            {requester.username && requester.displayName
                              ? `${requester.displayName} • `
                              : ''}
                            {requester.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(req.id, name)}
                          className="px-3 py-1.5 rounded-lg border-none cursor-pointer font-semibold text-[12px] bg-emerald-500 hover:bg-emerald-600 text-white transition-all active-press"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(req.id, 'declined')}
                          className="px-3 py-1.5 rounded-lg border border-[var(--danger-border)] cursor-pointer font-semibold text-[12px] bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-all active-press"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Sent Friend Requests ({outgoingPending.length})
              </h3>
              {outgoingPending.length === 0 ? (
                <div className="py-6 px-4 rounded-xl border border-dashed border-[var(--glass-border)] text-center text-[12.5px] text-[var(--text-muted)] bg-[rgba(0,0,0,0.01)] dark:bg-[rgba(255,255,255,0.005)]">
                  No sent requests.
                </div>
              ) : (
                outgoingPending.map((req) => {
                  const addressee = req.addressee || {
                    displayName: 'User',
                    email: 'unknown',
                    username: '',
                  };
                  const name = addressee.username
                    ? `@${addressee.username}`
                    : addressee.displayName || addressee.email.split('@')[0];
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--theme-btn)] border border-[var(--glass-border)] mb-2 animate-fade-in"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          letter={(addressee.username ||
                            addressee.displayName ||
                            addressee.email)[0].toUpperCase()}
                          url={addressee.avatarUrl}
                          size="md"
                        />
                        <div>
                          <div className="font-semibold text-[13.5px] text-[var(--text-primary)]">
                            {name}
                          </div>
                          <div className="text-[11.5px] text-[var(--text-muted)]">
                            {addressee.username && addressee.displayName
                              ? `${addressee.displayName} • `
                              : ''}
                            {addressee.email}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDecline(req.id, 'cancelled')}
                        className="px-3 py-1.5 rounded-lg border border-[var(--glass-border)] cursor-pointer font-semibold text-[12.5px] text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] hover:border-[var(--danger-border)] transition-all active-press"
                      >
                        Cancel Request
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB: ADD FRIEND */}
        {activeTab === 'add' && (
          <div className="space-y-6 max-w-xl animate-fade-in">
            <div>
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">
                Add Friend
              </h3>
              <p className="text-[12.5px] text-[var(--text-muted)]">
                You can add friends with their registered email address or
                unique username. It's case-sensitive!
              </p>
            </div>

            <form onSubmit={handleSearchUser} className="flex gap-2">
              <input
                type="text"
                className="input-base flex-1 rounded-xl px-4 py-3 text-[14px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
                placeholder="Enter email or username (e.g. bob or bob@example.com)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="px-5 py-3 rounded-xl border-none cursor-pointer font-semibold text-white bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-50 transition-all duration-150 active-press"
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchError && (
              <div className="p-3.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] animate-fade-in">
                {searchError}
              </div>
            )}

            {foundUsers && foundUsers.length > 0 ? (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {foundUsers.map((foundUser) => (
                  <div
                    key={foundUser.id}
                    className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--theme-btn)] flex items-center justify-between animate-fade-in"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        letter={(foundUser.username ||
                          foundUser.displayName ||
                          foundUser.email)[0].toUpperCase()}
                        url={foundUser.avatarUrl}
                        size="lg"
                      />
                      <div>
                        <div className="font-bold text-[14.5px] text-[var(--text-primary)]">
                          {foundUser.username
                            ? `@${foundUser.username}`
                            : foundUser.displayName ||
                              foundUser.email.split('@')[0]}
                        </div>
                        <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
                          {foundUser.username && foundUser.displayName
                            ? `${foundUser.displayName} • `
                            : ''}
                          {foundUser.email}
                        </div>
                      </div>
                    </div>

                    {getFriendshipAction(foundUser)}
                  </div>
                ))}
              </div>
            ) : (
              !searchLoading && (
                <div className="py-12 text-center text-[13.5px] text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-xl">
                  No users found.
                </div>
              )
            )}
          </div>
        )}
      </div>

      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title="Remove Friend"
          message={`Are you sure you want to remove ${confirmModal.friendName} from your friends?`}
          confirmLabel="Remove Friend"
          type="danger"
          onConfirm={async () => {
            try {
              await dispatch(removeFriend(confirmModal.friendId)).unwrap();
              showToast.success(
                `${confirmModal.friendName} removed from friends.`,
              );
              dispatch(fetchFriends());
            } catch (err: any) {
              showToast.error(err || 'Failed to remove friend.');
            } finally {
              setConfirmModal(null);
            }
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {hoveredFriend && popoverPosition && (
        <div
          className="fixed z-[9999] w-[260px] bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[16px] shadow-[var(--glass-shadow)] p-4 flex flex-col gap-3 animate-fade-in pointer-events-none text-left"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            transform: 'translateY(-50%)',
          }}
        >
          {/* Header with Avatar and Status */}
          <div className="flex items-center gap-3">
            <Avatar
              letter={(hoveredFriend.username ||
                hoveredFriend.displayName ||
                hoveredFriend.email)[0].toUpperCase()}
              url={hoveredFriend.avatarUrl}
              status={hoveredFriend.presence}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h3 className="m-0 text-[14px] font-bold text-[var(--text-primary)] truncate">
                {hoveredFriend.username
                  ? `@${hoveredFriend.username}`
                  : hoveredFriend.displayName ||
                    hoveredFriend.email.split('@')[0]}
              </h3>
              <div className="text-[10.5px] text-[var(--text-muted)] mt-0.5 capitalize">
                Friend
              </div>
            </div>
          </div>

          <hr className="m-0 border-none h-[1px] bg-[var(--border-muted)]" />

          {/* Details */}
          <div className="flex flex-col gap-2.5 text-[12px]">
            <div>
              <span className="text-[var(--text-muted)] font-bold block mb-0.5 uppercase tracking-wide text-[9.5px]">
                Username
              </span>
              <span className="text-[var(--text-secondary)] font-medium font-mono">
                {hoveredFriend.username ? `@${hoveredFriend.username}` : '@-'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-bold block mb-0.5 uppercase tracking-wide text-[9.5px]">
                Email Address
              </span>
              <span className="text-[var(--text-secondary)] font-medium break-all">
                {hoveredFriend.email || 'No email shared'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-bold block mb-0.5 uppercase tracking-wide text-[9.5px]">
                Presence Status
              </span>
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5 capitalize">
                <span
                  className="w-2 h-2 rounded-full inline-block animate-pulse"
                  style={{
                    backgroundColor:
                      hoveredFriend.presence === 'online'
                        ? '#10b981'
                        : hoveredFriend.presence === 'away'
                          ? '#f59e0b'
                          : hoveredFriend.presence === 'dnd'
                            ? '#ef4444'
                            : '#6b7280',
                  }}
                />
                {hoveredFriend.presence === 'dnd'
                  ? 'Do Not Disturb'
                  : hoveredFriend.presence}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── INDIVIDUAL FRIEND LIST ROW COMPONENT ─────────────────────── */
interface FriendRowProps {
  friend: User;
  status: string;
  onChat: (friend: User) => void;
  onRemove: (friendId: string, friendName: string) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
}

const FriendRow = ({
  friend,
  status,
  onChat,
  onRemove,
  onMouseEnter,
  onMouseLeave,
}: FriendRowProps) => {
  const name = friend.username
    ? `@${friend.username}`
    : friend.displayName || friend.email.split('@')[0];

  return (
    <div
      className="group/friend flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-[var(--theme-btn-hover)] hover:border-[var(--glass-border)] transition-all duration-200 fade-in-list"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          letter={(friend.username ||
            friend.displayName ||
            friend.email)[0].toUpperCase()}
          url={friend.avatarUrl}
          status={status}
          size="md"
        />
        <div className="min-w-0">
          <div className="font-semibold text-[13.5px] text-[var(--text-primary)] truncate flex items-center gap-1.5">
            <span>{name}</span>
            {friend.username && friend.displayName && (
              <span className="text-[11.5px] font-normal text-[var(--text-muted)]">
                {friend.displayName}
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-[var(--text-muted)] truncate capitalize mt-0.5">
            {status === 'online'
              ? 'Active now'
              : status === 'away'
                ? 'Away'
                : status === 'dnd'
                  ? 'Do Not Disturb'
                  : 'Offline'}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onChat(friend)}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer bg-[var(--theme-btn)] text-[var(--text-muted)] hover:bg-[var(--accent-primary)] hover:text-white border-none transition-all duration-200 active-press"
          title={`Message ${name}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-[15px] h-[15px]"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button
          onClick={() => onRemove(friend.id, name)}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer bg-[var(--theme-btn)] text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] border-none transition-all duration-200 active-press"
          title={`Remove ${name}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-[15px] h-[15px]"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
