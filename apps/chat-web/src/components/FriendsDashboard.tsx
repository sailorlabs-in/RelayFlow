import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  searchFriendUsers,
  clearSearchResults,
} from '../store/slices/chatSlice';
import { Avatar } from './Avatar';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';

interface FriendsDashboardProps {
  onMenuClick?: () => void;
}

export const FriendsDashboard = ({
  onMenuClick,
}: FriendsDashboardProps = {}): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const {
    friends,
    pendingRequests,
    onlineUsers,
    friendSearchResults: foundUsers,
  } = useAppSelector((s) => s.chat);

  const [activeTab, setActiveTab] = useState<
    'online' | 'all' | 'pending' | 'add'
  >('online');

  // Search & Filter State
  const [localFilterQuery, setLocalFilterQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Right profile panel state
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    friendId: string;
    friendName: string;
  } | null>(null);

  useEffect(() => {
    dispatch(fetchFriends());
    dispatch(fetchPendingRequests());
  }, [dispatch]);

  // Clear results when leaving Add Friend tab
  useEffect(() => {
    if (activeTab !== 'add') {
      setHasSearched(false);
    }
  }, [activeTab]);

  // Debounced search: triggers when query >= 3 chars
  const runSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 3) {
        dispatch(clearSearchResults());
        setSearchError(null);
        setHasSearched(false);
        return;
      }
      setSearchLoading(true);
      setSearchError(null);
      setHasSearched(true);
      try {
        await dispatch(searchFriendUsers(trimmed)).unwrap();
      } catch (err: any) {
        setSearchError(err || 'No users found matching your search.');
      } finally {
        setSearchLoading(false);
      }
    },
    [dispatch],
  );

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      runSearch(value);
    }, 400);
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

  const handleCopyEmail = (email: string) => {
    if (!email) {
      return;
    }
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    showToast.success('Email copied to clipboard');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Filters
  const onlineFriends = friends.filter((f) => {
    const status = onlineUsers[f.id] || 'offline';
    return status === 'online' || status === 'away' || status === 'dnd';
  });

  const incomingPending = pendingRequests?.incoming || [];
  const outgoingPending = pendingRequests?.outgoing || [];
  const pendingCount = incomingPending.length;

  // Local lists filtered by query
  const getFilteredFriendsList = (list: User[]) => {
    if (!localFilterQuery.trim()) {
      return list;
    }
    const q = localFilterQuery.toLowerCase().trim();
    return list.filter((f) => {
      const name = (f.username || '').toLowerCase();
      const disp = (f.displayName || '').toLowerCase();
      const email = (f.email || '').toLowerCase();
      return name.includes(q) || disp.includes(q) || email.includes(q);
    });
  };

  const filteredAllFriends = getFilteredFriendsList(friends);
  const filteredOnlineFriends = getFilteredFriendsList(onlineFriends);

  const filteredIncomingPending = incomingPending.filter((req) => {
    if (!localFilterQuery.trim()) {
      return true;
    }
    const q = localFilterQuery.toLowerCase().trim();
    const r = req.requester || {};
    return (
      (r.username || '').toLowerCase().includes(q) ||
      (r.displayName || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q)
    );
  });

  const filteredOutgoingPending = outgoingPending.filter((req) => {
    if (!localFilterQuery.trim()) {
      return true;
    }
    const q = localFilterQuery.toLowerCase().trim();
    const a = req.addressee || {};
    return (
      (a.username || '').toLowerCase().includes(q) ||
      (a.displayName || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q)
    );
  });

  const getFriendshipAction = (targetUser: User) => {
    if (targetUser.id === user?.id) {
      return null;
    }

    const isAlreadyFriend = friends.some((f) => f.id === targetUser.id);
    if (isAlreadyFriend) {
      return (
        <span className="text-[11.5px] font-bold text-sky-500 bg-[rgba(56,189,248,0.1)] px-2.5 py-1.25 rounded-md border border-sky-500/20 shrink-0 select-none">
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
        <span className="text-[11.5px] font-bold text-amber-500 bg-[rgba(245,158,11,0.1)] px-2.5 py-1.25 rounded-md border border-amber-500/20 shrink-0 select-none">
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
          className="px-3.5 py-1.75 text-[12px] rounded-lg border-none cursor-pointer font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all duration-150 active-press shrink-0"
        >
          Accept Request
        </button>
      );
    }

    return (
      <button
        onClick={() => handleSendRequest(targetUser)}
        className="px-3.5 py-1.75 text-[12px] rounded-lg border-none cursor-pointer font-bold text-white bg-(--accent-primary) hover:opacity-95 transition-all duration-150 active-press shrink-0"
      >
        Send Request
      </button>
    );
  };

  // Find currently selected friend details
  const selectedFriend = friends.find((f) => f.id === selectedFriendId);

  if (!user) {
    return (
      <div className="flex-1 p-6 text-center text-theme-muted">
        Loading friends dashboard...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full flex-1 bg-theme-chat rounded-2xl overflow-hidden animate-fade-in shadow-sm">
      {/* Top Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 gap-3 sm:gap-4 border-b-[1.5px] border-theme bg-theme-sidebar shrink-0 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          {onMenuClick && (
            <button
              id="mobile-menu-btn"
              onClick={onMenuClick}
              className="md:hidden flex items-center justify-center p-2 rounded-lg text-theme-muted hover:bg-theme-input hover:text-theme-primary cursor-pointer active-press focus:outline-none shrink-0"
              title="Open Navigation"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-5 h-5"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <div className="text-theme-primary flex shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5 text-(--accent-primary)"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className="text-[15px] font-extrabold text-theme-primary mr-4 shrink-0 tracking-tight">
            Friends
          </h2>
        </div>

        {/* Sleek Navigation Tabs */}
        <div
          className="flex p-0.5 gap-1 items-center select-none overflow-x-auto max-w-full no-scrollbar flex-nowrap bg-theme-input/40 rounded-lg sm:shrink-0 w-full sm:w-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[
            { id: 'online', label: 'Online' },
            { id: 'all', label: 'All Friends' },
            { id: 'pending', label: 'Pending' },
            { id: 'add', label: 'Add Friend' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            let count = 0;
            if (tab.id === 'online') {
              count = onlineFriends.length;
            }
            if (tab.id === 'all') {
              count = friends.length;
            }
            if (tab.id === 'pending') {
              count = pendingCount;
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setLocalFilterQuery('');
                  setSelectedFriendId(null);
                  // Always reset Add Friend search when switching tabs
                  setSearchQuery('');
                  dispatch(clearSearchResults());
                  setSearchError(null);
                  setHasSearched(false);
                  if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                  }
                }}
                className={`text-[12px] font-semibold px-3 py-1.25 rounded-md border-none cursor-pointer transition-all duration-150 active-press shrink-0 flex items-center gap-1.5
                  ${
                    isActive
                      ? 'bg-(--theme-btn-active) text-(--theme-btn-active-text) font-bold'
                      : 'bg-transparent text-theme-muted hover:bg-(--theme-btn-hover) hover:text-theme-primary'
                  }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.25 rounded-full text-[9px] font-bold select-none
                      ${
                        tab.id === 'pending'
                          ? 'bg-(--danger) text-white animate-pulse'
                          : isActive
                            ? 'bg-(--accent-primary) text-white'
                            : 'bg-theme-input text-theme-muted'
                      }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Split Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Friends/Requests List (responsive size) */}
        <div className="flex-1 lg:w-[68%] flex flex-col min-w-0 border-r border-theme overflow-y-auto p-4 md:p-6">
          {/* Local Search Filter input (shown on lists with contents) */}
          {activeTab !== 'add' && (
            <div className="relative mb-4 shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="w-full rounded-lg pl-10 pr-8 py-2 text-[12.5px] bg-theme-input border border-theme text-theme-primary focus:outline-none focus:border-(--accent-primary) placeholder-theme-muted transition-all duration-150 focus:ring-1 focus:ring-(--accent-ring)"
                placeholder={
                  activeTab === 'pending'
                    ? 'Filter pending requests by name...'
                    : 'Filter active list by name or email...'
                }
                value={localFilterQuery}
                onChange={(e) => setLocalFilterQuery(e.target.value)}
              />
              {localFilterQuery && (
                <button
                  onClick={() => setLocalFilterQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none text-theme-muted hover:text-theme-primary cursor-pointer p-0.5"
                  title="Clear filter"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-3.5 h-3.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* TAB: ONLINE */}
          {activeTab === 'online' && (
            <div className="space-y-2 flex-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-3 pl-1">
                Online Friends ({filteredOnlineFriends.length})
              </h3>
              {filteredOnlineFriends.length === 0 ? (
                <div className="py-16 text-center text-[13.5px] text-theme-muted flex flex-col items-center gap-3.5 justify-center border border-dashed border-theme bg-theme-sidebar/5 rounded-xl max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-theme-sidebar/20 flex items-center justify-center text-theme-muted/80">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-theme-primary m-0">
                      No active friends found
                    </p>
                    <p className="text-[11.5px] text-theme-muted mt-1 m-0 px-6">
                      {localFilterQuery
                        ? 'Try adjusting your search filter.'
                        : 'Nobody is online right now. Check back later or add new connections!'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredOnlineFriends.map((friend) => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    status={onlineUsers[friend.id] || 'offline'}
                    isSelected={selectedFriendId === friend.id}
                    onClick={() => setSelectedFriendId(friend.id)}
                    onChat={handleStartDM}
                    onRemove={handleRemoveFriend}
                  />
                ))
              )}
            </div>
          )}

          {/* TAB: ALL */}
          {activeTab === 'all' && (
            <div className="space-y-2 flex-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-3 pl-1">
                All Friends ({filteredAllFriends.length})
              </h3>
              {filteredAllFriends.length === 0 ? (
                <div className="py-16 text-center text-[13.5px] text-theme-muted flex flex-col items-center gap-3.5 justify-center border border-dashed border-theme bg-theme-sidebar/5 rounded-xl max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-theme-sidebar/20 flex items-center justify-center text-theme-muted/80">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-theme-primary m-0">
                      Start connecting
                    </p>
                    <p className="text-[11.5px] text-theme-muted mt-1 mb-3 px-6">
                      {localFilterQuery
                        ? 'No friends match your search query.'
                        : "You haven't added any friends yet. Add connections to message them!"}
                    </p>
                    {!localFilterQuery && (
                      <button
                        onClick={() => setActiveTab('add')}
                        className="px-3.5 py-1.75 text-[11.5px] rounded-lg text-white bg-(--accent-primary) border-none cursor-pointer font-bold hover:opacity-95 shadow-sm active-press"
                      >
                        Find Friends
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredAllFriends.map((friend) => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    status={onlineUsers[friend.id] || 'offline'}
                    isSelected={selectedFriendId === friend.id}
                    onClick={() => setSelectedFriendId(friend.id)}
                    onChat={handleStartDM}
                    onRemove={handleRemoveFriend}
                  />
                ))
              )}
            </div>
          )}

          {/* TAB: PENDING */}
          {activeTab === 'pending' && (
            <div className="space-y-6 flex-1">
              {/* Responsive Grid for Pending Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Incoming Requests Section */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-theme-muted pl-1">
                    Incoming ({filteredIncomingPending.length})
                  </h3>
                  {filteredIncomingPending.length === 0 ? (
                    <div className="py-8 px-4 rounded-xl border border-dashed border-theme text-center text-[12px] text-theme-muted bg-theme-sidebar/5 select-none">
                      No incoming requests.
                    </div>
                  ) : (
                    filteredIncomingPending.map((req) => {
                      const requester = req.requester || {
                        displayName: 'User',
                        email: 'unknown',
                        username: '',
                      };
                      const name = requester.username
                        ? `@${requester.username}`
                        : requester.displayName ||
                          requester.email.split('@')[0];
                      return (
                        <div
                          key={req.id}
                          className="flex flex-col gap-3 p-3.5 rounded-lg border border-theme bg-theme-sidebar/10 hover:bg-theme-sidebar/15 transition-all duration-150"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              letter={(requester.username ||
                                requester.displayName ||
                                requester.email)[0].toUpperCase()}
                              url={
                                requester.avatarThumbnailUrl ||
                                requester.avatarUrl
                              }
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[13.5px] text-theme-primary truncate">
                                {name}
                              </div>
                              <div className="text-[11px] text-theme-muted truncate">
                                {requester.email}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(req.id, name)}
                              className="flex-1 py-1.75 rounded-lg border-none cursor-pointer font-bold text-[12px] bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-150 active-press"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDecline(req.id, 'declined')}
                              className="flex-1 py-1.75 rounded-lg border border-(--danger-border) cursor-pointer font-bold text-[12px] bg-(--danger-bg) text-(--danger) hover:bg-(--danger) hover:text-white transition-all duration-150 active-press"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Sent Requests Section */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-theme-muted pl-1">
                    Sent Requests ({filteredOutgoingPending.length})
                  </h3>
                  {filteredOutgoingPending.length === 0 ? (
                    <div className="py-8 px-4 rounded-xl border border-dashed border-theme text-center text-[12px] text-theme-muted bg-theme-sidebar/5 select-none">
                      No outgoing requests.
                    </div>
                  ) : (
                    filteredOutgoingPending.map((req) => {
                      const addressee = req.addressee || {
                        displayName: 'User',
                        email: 'unknown',
                        username: '',
                      };
                      const name = addressee.username
                        ? `@${addressee.username}`
                        : addressee.displayName ||
                          addressee.email.split('@')[0];
                      return (
                        <div
                          key={req.id}
                          className="flex flex-col gap-3 p-3.5 rounded-lg border border-theme bg-theme-sidebar/10 hover:bg-theme-sidebar/15 transition-all duration-150"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              letter={(addressee.username ||
                                addressee.displayName ||
                                addressee.email)[0].toUpperCase()}
                              url={
                                addressee.avatarThumbnailUrl ||
                                addressee.avatarUrl
                              }
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[13.5px] text-theme-primary truncate">
                                {name}
                              </div>
                              <div className="text-[11px] text-theme-muted truncate">
                                {addressee.email}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDecline(req.id, 'cancelled')}
                            className="w-full py-1.75 rounded-lg border border-theme cursor-pointer font-bold text-[12px] text-theme-muted hover:bg-(--danger-bg) hover:text-(--danger) hover:border-(--danger-border) transition-all duration-150 active-press bg-transparent"
                          >
                            Cancel Request
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADD FRIEND */}
          {activeTab === 'add' && (
            <div className="space-y-5 animate-fade-in flex-1 max-w-2xl">
              {/* Header */}
              <div>
                <h3 className="text-[16px] font-extrabold text-theme-primary mb-1">
                  Add a Friend
                </h3>
                <p className="text-[12.5px] text-theme-muted m-0 leading-relaxed">
                  Search by username or email. Type at least{' '}
                  <span className="font-bold text-theme-primary">
                    3 characters
                  </span>{' '}
                  to see results. Only exact email or username matches are
                  returned.
                </p>
              </div>

              {/* Search Input */}
              <div className="relative flex items-center bg-theme-sidebar/15 border border-theme rounded-xl shadow-inner overflow-hidden focus-within:border-(--accent-primary) focus-within:ring-1 focus-within:ring-(--accent-ring) transition-all duration-200">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-4.5 h-4.5 absolute left-4 text-theme-muted pointer-events-none shrink-0"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="add-friend-search"
                  type="text"
                  className="w-full rounded-xl pl-11 pr-10 py-3 text-[13.5px] bg-transparent border-none text-theme-primary focus:outline-none placeholder-theme-muted"
                  placeholder="Search by @username or email address…"
                  value={searchQuery}
                  onChange={(e) => handleSearchQueryChange(e.target.value)}
                  autoFocus
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      dispatch(clearSearchResults());
                      setSearchError(null);
                      setHasSearched(false);
                    }}
                    className="absolute right-3.5 bg-transparent border-none text-theme-muted hover:text-theme-primary cursor-pointer p-1 rounded transition-colors"
                    title="Clear search"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-3.5 h-3.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Hint chips */}
              {!searchQuery && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[11px] text-theme-muted font-semibold">
                    Examples:
                  </span>
                  {['john_doe', 'jane@example.com', 'alex123'].map((hint) => (
                    <button
                      key={hint}
                      type="button"
                      onClick={() => handleSearchQueryChange(hint)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-theme-input border border-theme text-theme-muted hover:text-theme-primary hover:border-(--accent-primary) transition-all duration-150 cursor-pointer border-none"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading */}
              {searchLoading && (
                <div className="flex items-center justify-center gap-3 py-10 text-[12.5px] text-theme-muted animate-fade-in">
                  <svg
                    className="w-4 h-4 animate-spin text-(--accent-primary)"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Searching…
                </div>
              )}

              {/* Error */}
              {!searchLoading && searchError && (
                <div className="p-3.5 rounded-xl border border-(--danger-border) bg-(--danger-bg) text-(--danger) text-[12.5px] animate-fade-in flex items-start gap-2.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4 shrink-0 mt-0.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {searchError}
                </div>
              )}

              {/* Min-chars prompt */}
              {!searchLoading &&
                !searchError &&
                searchQuery.trim().length > 0 &&
                searchQuery.trim().length < 3 && (
                  <div className="py-8 text-center text-[12.5px] text-theme-muted border border-dashed border-theme rounded-xl animate-fade-in">
                    <span className="font-bold text-theme-primary">
                      {3 - searchQuery.trim().length}
                    </span>{' '}
                    more character
                    {3 - searchQuery.trim().length !== 1 ? 's' : ''} needed to
                    search…
                  </div>
                )}

              {/* Results */}
              {!searchLoading &&
                !searchError &&
                foundUsers &&
                foundUsers.length > 0 && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-theme-muted pl-0.5">
                        Results · {foundUsers.length} found
                      </h4>
                    </div>
                    {foundUsers.map((foundUser) => (
                      <div
                        key={foundUser.id}
                        className="group p-3.5 rounded-xl border border-theme bg-theme-sidebar/10 hover:bg-theme-sidebar/20 hover:border-(--accent-primary)/30 flex items-center justify-between gap-3 transition-all duration-150"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            letter={(foundUser.username ||
                              foundUser.displayName ||
                              foundUser.email)[0].toUpperCase()}
                            url={
                              foundUser.avatarThumbnailUrl ||
                              foundUser.avatarUrl
                            }
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-[13.5px] text-theme-primary truncate">
                              {foundUser.username
                                ? `@${foundUser.username}`
                                : foundUser.displayName ||
                                  foundUser.email.split('@')[0]}
                            </div>
                            <div className="text-[11px] text-theme-muted mt-0.5 truncate">
                              {foundUser.displayName && foundUser.username
                                ? `${foundUser.displayName} · `
                                : ''}
                              {foundUser.email}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {getFriendshipAction(foundUser)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* No results */}
              {!searchLoading &&
                !searchError &&
                hasSearched &&
                foundUsers?.length === 0 &&
                searchQuery.trim().length >= 3 && (
                  <div className="py-12 text-center text-[12.5px] text-theme-muted border border-dashed border-theme rounded-xl animate-fade-in flex flex-col items-center gap-3">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-8 h-8 text-theme-muted/50"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <div>
                      <p className="font-semibold text-theme-primary m-0">
                        No users found
                      </p>
                      <p className="text-[11.5px] text-theme-muted mt-1 m-0">
                        No one matches{' '}
                        <span className="font-semibold text-theme-primary">
                          &ldquo;{searchQuery}&rdquo;
                        </span>
                        . Try an exact username or email.
                      </p>
                    </div>
                  </div>
                )}

              {/* Empty state (nothing typed yet) */}
              {!searchQuery && (
                <div className="py-12 border border-dashed border-theme rounded-xl flex flex-col items-center gap-4 text-center bg-theme-sidebar/5 select-none animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-theme-sidebar/20 flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-7 h-7 text-(--accent-primary)"
                    >
                      <path
                        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                        fill="currentColor"
                        stroke="none"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-[14px] text-theme-primary m-0">
                      Find someone to connect with
                    </p>
                    <p className="text-[12px] text-theme-muted mt-1.5 m-0 max-w-[260px] leading-relaxed">
                      Start typing a username or email above. Results appear
                      after 3 characters.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-theme-muted bg-theme-input/60 px-3 py-1.5 rounded-lg border border-theme">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-3.5 h-3.5 text-(--accent-primary) shrink-0"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Users with{' '}
                    <span className="font-bold text-theme-primary mx-0.5">
                      No One
                    </span>{' '}
                    visibility won&apos;t appear in results.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Detail Profile / Summary Activity Panel (Desktop Only) */}
        <div className="hidden lg:flex lg:w-[32%] flex-col bg-theme-sidebar/5 overflow-y-auto p-6 border-l border-theme min-w-[290px] select-none">
          {selectedFriend ? (
            /* Profile Detail View */
            <div className="flex flex-col h-full animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-theme-muted">
                  Friend Profile
                </span>
                <button
                  onClick={() => setSelectedFriendId(null)}
                  className="bg-transparent border-none text-theme-muted hover:text-theme-primary cursor-pointer p-1 rounded-md hover:bg-theme-input active-press transition-colors"
                  title="Clear Selection"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Profile Card Header */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl border border-theme bg-theme-sidebar/10 mb-5 relative overflow-hidden">
                {/* Visual Glow Ornament */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-(--bg-glow-1) rounded-full blur-2xl opacity-50" />
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-(--bg-glow-2) rounded-full blur-2xl opacity-50" />

                <div className="relative mb-3">
                  <Avatar
                    letter={(selectedFriend.username ||
                      selectedFriend.displayName ||
                      selectedFriend.email)[0].toUpperCase()}
                    url={
                      selectedFriend.avatarThumbnailUrl ||
                      selectedFriend.avatarUrl
                    }
                    status={onlineUsers[selectedFriend.id] || 'offline'}
                    size="lg"
                  />
                </div>

                <h3 className="text-[15.5px] font-extrabold text-theme-primary m-0 truncate w-full max-w-full">
                  {selectedFriend.displayName ||
                    selectedFriend.username ||
                    'Workspace Contact'}
                </h3>
                {selectedFriend.username && (
                  <span className="text-[11.5px] text-theme-muted font-semibold mt-0.5">
                    @{selectedFriend.username}
                  </span>
                )}

                <div className="mt-3 flex items-center gap-1.5 bg-theme-input/40 border border-theme/50 px-2.5 py-0.75 rounded-md text-[10.5px] text-(--accent-primary) font-bold capitalize">
                  <span className="w-1.5 h-1.5 rounded-full bg-(--accent-primary) animate-pulse" />
                  Connected Friend
                </div>
              </div>

              {/* Profile Detail Fields */}
              <div className="space-y-3.5 flex-1">
                <div className="p-3 rounded-lg bg-theme-sidebar/10 border border-theme">
                  <span className="text-theme-muted font-bold block mb-1 uppercase tracking-wider text-[8.5px]">
                    Email Address
                  </span>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-theme-secondary font-medium text-[12.5px] truncate select-all">
                      {selectedFriend.email}
                    </span>
                    <button
                      onClick={() => handleCopyEmail(selectedFriend.email)}
                      className="bg-transparent border-none text-theme-muted hover:text-theme-primary cursor-pointer p-1 rounded transition-all active-press shrink-0"
                      title="Copy email"
                    >
                      {copiedEmail ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="w-3.5 h-3.5 text-emerald-500"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="w-3.5 h-3.5"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-theme-sidebar/10 border border-theme">
                  <span className="text-theme-muted font-bold block mb-1 uppercase tracking-wider text-[8.5px]">
                    User Presence
                  </span>
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-theme-primary capitalize">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{
                        backgroundColor:
                          (onlineUsers[selectedFriend.id] || 'offline') ===
                          'online'
                            ? '#10b981'
                            : (onlineUsers[selectedFriend.id] || 'offline') ===
                                'away'
                              ? '#f59e0b'
                              : (onlineUsers[selectedFriend.id] ||
                                    'offline') === 'dnd'
                                ? '#ef4444'
                                : '#6b7280',
                      }}
                    />
                    <span>
                      {(onlineUsers[selectedFriend.id] || 'offline') === 'dnd'
                        ? 'Do Not Disturb'
                        : onlineUsers[selectedFriend.id] || 'offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 mt-6 pt-4 border-t border-theme shrink-0">
                <button
                  onClick={() => handleStartDM(selectedFriend)}
                  className="w-full py-2.5 rounded-lg border-none cursor-pointer font-bold text-[12.5px] text-white bg-(--accent-primary) hover:opacity-95 transition-all duration-150 active-press flex items-center justify-center gap-2"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Open Chat
                </button>
                <button
                  onClick={() =>
                    handleRemoveFriend(
                      selectedFriend.id,
                      selectedFriend.username || selectedFriend.email,
                    )
                  }
                  className="w-full py-2.5 rounded-lg border border-(--danger-border) cursor-pointer font-bold text-[12.5px] bg-(--danger-bg) text-(--danger) hover:bg-(--danger) hover:text-white transition-all duration-150 active-press flex items-center justify-center gap-2"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4"
                  >
                    <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                  </svg>
                  Remove Connection
                </button>
              </div>
            </div>
          ) : (
            /* General Overview stats view */
            <div className="flex flex-col h-full justify-between animate-fade-in">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-theme-muted block mb-5">
                  Workspace Stats
                </span>

                {/* Main statistics indicator card */}
                <div className="p-5 rounded-xl border border-theme bg-theme-sidebar/10 relative overflow-hidden mb-5">
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-(--bg-glow-1) rounded-full blur-2xl opacity-40 pointer-events-none" />
                  <div className="text-[28px] font-black text-theme-primary">
                    {onlineFriends.length}{' '}
                    <span className="text-[14px] text-theme-muted font-bold">
                      / {friends.length}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-theme-muted uppercase tracking-wider mt-1">
                    Friends Online Now
                  </div>
                  <div className="w-full bg-theme-input rounded-full h-1.5 mt-4 overflow-hidden border border-theme/35">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${friends.length > 0 ? (onlineFriends.length / friends.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Sub Stats breakdown */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="p-3 rounded-lg border border-theme bg-theme-sidebar/5">
                    <div className="text-[16px] font-extrabold text-theme-primary">
                      {pendingCount}
                    </div>
                    <div className="text-[9px] font-bold text-theme-muted uppercase tracking-wider mt-0.5">
                      Incoming Req
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-theme bg-theme-sidebar/5">
                    <div className="text-[16px] font-extrabold text-theme-primary">
                      {outgoingPending.length}
                    </div>
                    <div className="text-[9px] font-bold text-theme-muted uppercase tracking-wider mt-0.5">
                      Sent Requests
                    </div>
                  </div>
                </div>

                {/* Quick Info Box */}
                <div className="p-3.5 rounded-lg border border-theme bg-theme-sidebar/5 text-[11.5px] text-theme-secondary leading-relaxed select-none">
                  <span className="font-bold text-theme-primary block mb-1">
                    💡 Workspace Tip
                  </span>
                  Add colleagues to discuss projects privately, share files up
                  to 20MB, and connect in screen-sharing voice channels.
                </div>
              </div>

              {/* Bottom display of own status info */}
              <div className="p-3 rounded-lg border border-theme bg-theme-sidebar/10 flex items-center gap-3 shrink-0">
                <Avatar
                  letter={(user.username ||
                    user.displayName ||
                    user.email)[0].toUpperCase()}
                  url={user.avatarThumbnailUrl || user.avatarUrl}
                  status="online"
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[12.5px] text-theme-primary truncate">
                    {user.displayName || user.username}
                  </div>
                  <div className="text-[10px] text-theme-muted truncate">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
              setSelectedFriendId(null);
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
    </div>
  );
};

/* ── INDIVIDUAL FRIEND LIST ROW COMPONENT ─────────────────────── */
interface FriendRowProps {
  friend: User;
  status: string;
  isSelected: boolean;
  onClick: () => void;
  onChat: (friend: User) => void;
  onRemove: (friendId: string, friendName: string) => void;
}

const FriendRow = ({
  friend,
  status,
  isSelected,
  onClick,
  onChat,
  onRemove,
}: FriendRowProps) => {
  const name = friend.username
    ? `@${friend.username}`
    : friend.displayName || friend.email.split('@')[0];

  return (
    <div
      onClick={onClick}
      className={`group/friend flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-150 mb-1.5 select-none fade-in-list
        ${
          isSelected
            ? 'border-(--accent-primary) bg-theme-sidebar/30 shadow-sm'
            : 'border-theme bg-theme-sidebar/10 hover:bg-theme-sidebar/20'
        }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          letter={(friend.username ||
            friend.displayName ||
            friend.email)[0].toUpperCase()}
          url={friend.avatarThumbnailUrl || friend.avatarUrl}
          status={status}
          size="md"
        />
        <div className="min-w-0">
          <div className="font-semibold text-[13px] text-theme-primary truncate flex items-center gap-1.5">
            <span>{name}</span>
            {friend.username && friend.displayName && (
              <span className="text-[11px] font-normal text-theme-muted truncate max-w-[120px]">
                {friend.displayName}
              </span>
            )}
          </div>
          <div className="text-[11px] text-theme-muted truncate capitalize mt-0.5">
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
          onClick={(e) => {
            e.stopPropagation();
            onChat(friend);
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer bg-theme-input text-theme-muted hover:bg-(--accent-primary) hover:text-white border-none transition-all duration-150 active-press"
          title={`Message ${name}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="w-4 h-4"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(friend.id, name);
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer bg-theme-input text-theme-muted hover:bg-(--danger-bg) hover:text-(--danger) border-none transition-all duration-150 active-press"
          title={`Remove ${name}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="w-4 h-4"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
