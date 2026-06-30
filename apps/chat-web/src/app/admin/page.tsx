'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useRouter } from 'next/navigation';
import StoreProvider from '../../store/StoreProvider';
import { useAppSelector, useAppDispatch } from '../../store';
import { restoreSession } from '../../store/slices/authSlice';
import ApiRequest from '../../utils/ApiRequest';
import { showToast } from '../../components/toast';
import { Avatar } from '../../components/Avatar';
import { socketManager } from '../../store/socketManager';

interface UserData {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  role: string;
  warnings: string[];
  status: string;
  visibility?: string;
  lastSeen?: string | null;
  createdAt: string;
}

function formatLastSeen(dateString: string | null | undefined): string {
  if (!dateString) {
    return 'never';
  }
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) {
      return 'recently';
    }
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) {
      return 'just now';
    }
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }
    if (diffHr < 24) {
      return `${diffHr}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  } catch {
    return 'recently';
  }
}

interface GroupData {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  memberCount: number;
  owner: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  } | null;
}

function AdminDashboardContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, accessToken } = useAppSelector((s) => s.auth);

  // hydrated = true once restoreSession has synchronously read localStorage
  const [hydrated, setHydrated] = useState(false);

  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(false);

  // Search queries
  const [userSearch, setUserSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  // Modals
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    userId: string;
    username: string;
  } | null>(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningSubmitting, setWarningSubmitting] = useState(false);

  const [addMemberModal, setAddMemberModal] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
  } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addMemberSubmitting, setAddMemberSubmitting] = useState(false);

  // Friend Request Modal
  const [friendRequestModal, setFriendRequestModal] = useState<{
    isOpen: boolean;
    userId: string;
    username: string;
  } | null>(null);
  const [friendRequestSubmitting, setFriendRequestSubmitting] = useState(false);

  // Dropdown menu state for user row actions (using React Portals to prevent clipping)
  const [activeMenu, setActiveMenu] = useState<{
    userId: string;
    u: UserData;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setActiveMenu(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Edit Identity Modal
  const [editIdentityModal, setEditIdentityModal] = useState<{
    isOpen: boolean;
    userId: string;
    username: string;
    currentUsername: string;
    currentDisplayName: string;
  } | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editIdentitySubmitting, setEditIdentitySubmitting] = useState(false);

  // Step 1: Restore session from localStorage on first render (synchronous)
  useEffect(() => {
    dispatch(restoreSession());
    setHydrated(true);
  }, [dispatch]);

  // Step 2: After hydration, redirect if there is no token
  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/');
    }
  }, [hydrated, accessToken, router]);

  // Step 3: Fetch admin data once confirmed as admin
  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedGroups] = await Promise.all([
        ApiRequest('/admin/users', 'get'),
        ApiRequest('/admin/groups', 'get'),
      ]);
      setUsers(fetchedUsers?.data || []);
      setGroups(fetchedGroups?.data || []);
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to fetch administration data',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated && user?.role === 'admin') {
      fetchData();
    }
  }, [hydrated, user]);

  // Step 4: Subscribe to socket events for real-time admin panel updates
  useEffect(() => {
    if (!hydrated || !accessToken) {
      return;
    }

    // Connect socket for the admin dashboard to enable real-time status
    socketManager.connect(accessToken);
    const socket = socketManager.getSocket();
    if (!socket) {
      return;
    }

    // Helper: patch a single user's status and lastSeen in local state
    const patchStatus = (userId: string, status: string, lastSeen?: string) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status, ...(lastSeen !== undefined && { lastSeen }) }
            : u,
        ),
      );
    };

    const onStatusChanged = (data: {
      userId: string;
      status: string;
      autoStatus?: string;
      lastSeen?: string;
    }) => {
      // Resolve the display status the same way the app does
      const resolved =
        data.status === 'online' ? data.autoStatus || 'online' : data.status;
      patchStatus(data.userId, resolved, data.lastSeen);
    };

    const onOnline = (data: { userId: string }) => {
      patchStatus(data.userId, 'online', new Date().toISOString());
    };

    const onOffline = (data: { userId: string }) => {
      patchStatus(data.userId, 'offline', new Date().toISOString());
    };

    const onProfileUpdated = (data: {
      userId: string;
      displayName?: string;
      username?: string;
      avatarUrl?: string;
      avatarThumbnailUrl?: string;
    }) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== data.userId) {
            return u;
          }
          return {
            ...u,
            ...(data.displayName !== undefined && {
              displayName: data.displayName,
            }),
            ...(data.username !== undefined && { username: data.username }),
            ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
          };
        }),
      );
    };

    socket.on('user.status.changed', onStatusChanged);
    socket.on('user.online', onOnline);
    socket.on('user.offline', onOffline);
    socket.on('user.profile.updated', onProfileUpdated);

    return () => {
      socket.off('user.status.changed', onStatusChanged);
      socket.off('user.online', onOnline);
      socket.off('user.offline', onOffline);
      socket.off('user.profile.updated', onProfileUpdated);
      socketManager.disconnect();
    };
  }, [hydrated, accessToken]);

  const handleToggleRole = async (targetUser: UserData) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const label =
      targetUser.displayName || targetUser.username || targetUser.email;
    if (
      !window.confirm(`Change ${label}'s role to ${newRole.toUpperCase()}?`)
    ) {
      return;
    }
    try {
      await ApiRequest(`/admin/users/${targetUser.id}/role`, 'post', {
        role: newRole,
      });
      showToast.success('User role updated successfully');
      fetchData();
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to update user role',
      );
    }
  };

  const handleForceReload = async (targetUser: UserData) => {
    const label =
      targetUser.displayName || targetUser.username || targetUser.email;
    if (
      !window.confirm(
        `Force clear cache and hard reload for ${label}'s registered devices?`,
      )
    ) {
      return;
    }
    try {
      await ApiRequest(`/admin/users/${targetUser.id}/reset`, 'post');
      showToast.success(
        'Clear cache & hard reload command queued successfully',
      );
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to trigger clear cache & reload',
      );
    }
  };

  const handleResetAllDevices = async () => {
    if (
      !window.confirm(
        'Are you sure you want to force clear cache and hard reload for ALL registered users and sessions? This will affect everyone globally.',
      )
    ) {
      return;
    }
    try {
      await ApiRequest('/admin/users/reset-all', 'post');
      showToast.success(
        'Global silent clear cache & hard reload command queued',
      );
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to trigger global reset',
      );
    }
  };

  const handleSendWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningModal || !warningMessage.trim()) {
      return;
    }
    setWarningSubmitting(true);
    try {
      await ApiRequest(`/admin/users/${warningModal.userId}/warning`, 'post', {
        message: warningMessage.trim(),
      });
      showToast.success(`Warning sent to ${warningModal.username}`);
      setWarningModal(null);
      setWarningMessage('');
      fetchData();
    } catch (err: any) {
      showToast.error(err.response?.data?.message || 'Failed to send warning');
    } finally {
      setWarningSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberModal || !selectedUserId) {
      return;
    }
    setAddMemberSubmitting(true);
    try {
      await ApiRequest(
        `/admin/groups/${addMemberModal.groupId}/members`,
        'post',
        {
          userId: selectedUserId,
        },
      );
      showToast.success('User added to the group successfully');
      setAddMemberModal(null);
      setSelectedUserId('');
      fetchData();
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to add user to group',
      );
    } finally {
      setAddMemberSubmitting(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!friendRequestModal) {
      return;
    }
    setFriendRequestSubmitting(true);
    try {
      await ApiRequest(
        `/admin/users/${friendRequestModal.userId}/send-friend-request`,
        'post',
      );
      showToast.success(
        `Friend request sent to @${friendRequestModal.username}`,
      );
      setFriendRequestModal(null);
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to send friend request',
      );
    } finally {
      setFriendRequestSubmitting(false);
    }
  };

  const handleEditIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editIdentityModal || !editReason.trim()) {
      return;
    }
    if (!editUsername.trim() && !editDisplayName.trim()) {
      showToast.error('Provide at least a new username or display name.');
      return;
    }
    setEditIdentitySubmitting(true);
    try {
      const body: Record<string, string> = { reason: editReason.trim() };
      if (editUsername.trim()) {
        body.username = editUsername.trim();
      }
      if (editDisplayName.trim()) {
        body.displayName = editDisplayName.trim();
      }
      await ApiRequest(
        `/admin/users/${editIdentityModal.userId}/identity`,
        'patch',
        body,
      );
      showToast.success(
        `Identity updated for @${editIdentityModal.currentUsername}`,
      );
      setEditIdentityModal(null);
      setEditUsername('');
      setEditDisplayName('');
      setEditReason('');
      fetchData();
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to update user identity',
      );
    } finally {
      setEditIdentitySubmitting(false);
    }
  };

  // ── Loading / redirecting ───────────────────────────────────────────────────
  if (!hydrated || (hydrated && !accessToken)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-theme-primary text-theme-primary">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-theme-secondary" />
          <p className="text-sm text-theme-muted">
            {!hydrated ? 'Restoring session...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Access denied ──────────────────────────────────────────────────────────
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen p-6 text-theme-primary bg-theme-primary">
        <div className="glass-panel p-8 max-w-md w-full text-center flex flex-col items-center gap-5 border border-glass animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-theme-primary mb-1">
              Access Denied
            </h1>
            <p className="text-sm text-theme-muted">
              Platform Admin privileges are required to view this page.
            </p>
            {user && (
              <p className="text-xs text-theme-muted mt-2">
                Signed in as{' '}
                <span className="text-theme-secondary font-medium">
                  {user.email}
                </span>
                {' · '}role:{' '}
                <span className="font-semibold uppercase text-xs">
                  {user.role ?? 'user'}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full btn-send py-2.5 rounded-lg text-sm font-bold text-white transition-all cursor-pointer"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  // Filters
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  });

  const filteredGroups = groups.filter((g) => {
    const q = groupSearch.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      (g.description && g.description.toLowerCase().includes(q))
    );
  });

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen p-3 md:p-3.5 gap-3 md:gap-3.5 bg-theme-primary text-theme-primary overflow-hidden font-sans antialiased">
      {/* Left Sidebar */}
      <div className="glass-panel w-full md:w-64 shrink-0 flex flex-col justify-between p-5 h-auto md:h-full border border-glass animate-fade-in">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 pb-4 border-b border-glass">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-theme-input/40 border border-glass flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-7 h-7 object-cover"
              />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-theme-primary leading-none">
                RelayFlow
              </h1>
              <span className="text-[10px] font-bold tracking-wider text-theme-secondary uppercase">
                Platform Control
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex flex-row md:flex-col gap-1.5 w-full">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-theme-input border-glass text-theme-secondary'
                  : 'bg-transparent border-transparent text-theme-muted hover:text-theme-primary hover:bg-theme-input/10'
              }`}
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Users
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                activeTab === 'groups'
                  ? 'bg-theme-input border-glass text-theme-secondary'
                  : 'bg-transparent border-transparent text-theme-muted hover:text-theme-primary hover:bg-theme-input/10'
              }`}
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Groups
            </button>
          </nav>
        </div>

        {/* User Info & Back Button */}
        <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-glass">
          <div className="flex items-center gap-2.5 px-1">
            <Avatar
              letter={(user?.displayName ||
                user?.email ||
                'A')[0].toUpperCase()}
              url={user?.avatarUrl}
              status="online"
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-theme-primary truncate leading-tight">
                {user?.displayName || 'Administrator'}
              </p>
              <p className="text-[10px] text-theme-muted truncate mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-theme-primary bg-theme-input border border-glass rounded-xl hover:bg-theme-input-focus transition-all cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-theme-secondary shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Workspace
          </button>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="glass-panel flex-1 flex flex-col p-6 h-full overflow-hidden border border-glass animate-slide-up">
        {/* Header of Content Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-glass">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-theme-primary">
              {activeTab === 'users' ? 'User Accounts' : 'Registered Servers'}
            </h2>
            <p className="text-[11px] text-theme-muted mt-0.5">
              {activeTab === 'users'
                ? 'Administer platform user identities and warning systems.'
                : 'Manage group servers and direct group user assignments.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'users' && (
              <button
                onClick={handleResetAllDevices}
                className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold cursor-pointer transition-all active-press"
              >
                Reset All Devices
              </button>
            )}
            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-input/40 px-2.5 py-1 rounded border border-glass">
              {activeTab === 'users'
                ? `${filteredUsers.length} Users`
                : `${filteredGroups.length} Servers`}
            </span>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-3 gap-4 my-5 shrink-0">
          <div className="glass-panel bg-theme-sidebar/10 p-4 border border-glass flex items-center justify-between hover:shadow-md transition-all">
            <div>
              <p className="text-[9px] uppercase font-bold text-theme-muted tracking-wider">
                Users
              </p>
              <h3 className="text-xl font-extrabold text-theme-primary mt-0.5">
                {users.length}
              </h3>
            </div>
            <div className="p-2 bg-theme-input rounded-lg border border-glass text-theme-secondary">
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
          <div className="glass-panel bg-theme-sidebar/10 p-4 border border-glass flex items-center justify-between hover:shadow-md transition-all">
            <div>
              <p className="text-[9px] uppercase font-bold text-theme-muted tracking-wider">
                Groups
              </p>
              <h3 className="text-xl font-extrabold text-theme-primary mt-0.5">
                {groups.length}
              </h3>
            </div>
            <div className="p-2 bg-theme-input rounded-lg border border-glass text-theme-secondary">
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <div className="glass-panel bg-theme-sidebar/10 p-4 border border-glass flex items-center justify-between hover:shadow-md transition-all">
            <div>
              <p className="text-[9px] uppercase font-bold text-theme-muted tracking-wider">
                Warned
              </p>
              <h3 className="text-xl font-extrabold text-theme-primary mt-0.5">
                {
                  users.filter((u) => u.warnings && u.warnings.length > 0)
                    .length
                }
              </h3>
            </div>
            <div className="p-2 bg-theme-input rounded-lg border border-glass text-theme-secondary">
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-theme-secondary mb-4" />
              <p className="text-xs text-theme-muted font-bold">
                Loading records...
              </p>
            </div>
          ) : activeTab === 'users' ? (
            <div className="flex-1 flex flex-col min-h-0 border border-glass bg-theme-sidebar/10 rounded-2xl p-5">
              {/* Search bar */}
              <div className="relative shrink-0 mb-4">
                <input
                  type="text"
                  placeholder="Search user by email, name or username..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="input-base focus:input-focus w-full pl-9 pr-4 py-2.5 text-xs rounded-xl placeholder-theme-muted"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-3 text-theme-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Users Table Scroll */}
              <div className="flex-1 overflow-y-auto rounded-xl">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--glass-border)]">
                    <tr className="text-theme-muted text-[10px] font-bold uppercase tracking-wider">
                      <th className="px-6 py-3 w-[220px]">User Profile</th>
                      <th className="px-6 py-3 w-[200px]">Email</th>
                      <th className="px-6 py-3 w-[100px]">Role</th>
                      <th className="px-6 py-3 w-[110px]">Warnings</th>
                      <th className="px-6 py-3 w-[180px]">Status</th>
                      <th className="px-6 py-3 w-[130px]">Visibility</th>
                      <th className="px-6 py-3 w-[110px]">Joined</th>
                      <th className="px-6 py-3 text-right w-[100px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)] text-xs text-theme-primary">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-12 text-center text-theme-muted font-semibold"
                        >
                          No matching users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-theme-sidebar/10 transition-colors"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar
                                letter={(u.displayName || u.username || 'U')
                                  .trim()[0]
                                  .toUpperCase()}
                                url={u.avatarUrl}
                                status={u.status}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-theme-primary truncate leading-tight">
                                  {u.displayName || 'No Display Name'}
                                </p>
                                <p className="text-[10px] text-theme-muted font-mono truncate mt-0.5">
                                  @{u.username || 'unknown'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 font-mono text-theme-secondary text-[11px] truncate">
                            {u.email}
                          </td>
                          <td className="px-6 py-3.5">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-theme-input text-theme-muted border border-glass">
                                User
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            {u.warnings && u.warnings.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20 font-bold">
                                {u.warnings.length} Warned
                              </span>
                            ) : (
                              <span className="text-theme-muted font-medium text-xs">
                                Clean
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            {(() => {
                              const s = u.status || 'offline';
                              const cfg: Record<
                                string,
                                {
                                  dot: string;
                                  text: string;
                                  label: string;
                                  pulse?: boolean;
                                }
                              > = {
                                online: {
                                  dot: 'bg-emerald-400',
                                  text: 'text-emerald-400',
                                  label: 'Online',
                                  pulse: true,
                                },
                                away: {
                                  dot: 'bg-amber-400',
                                  text: 'text-amber-400',
                                  label: 'Away',
                                },
                                dnd: {
                                  dot: 'bg-red-400',
                                  text: 'text-red-400',
                                  label: 'DND',
                                },
                                offline: {
                                  dot: 'bg-slate-500',
                                  text: 'text-theme-muted',
                                  label: 'Offline',
                                },
                              };
                              const c = cfg[s] ?? cfg.offline;
                              let displayLabel = c.label;
                              if (s === 'offline' && u.lastSeen) {
                                displayLabel = `Offline (${formatLastSeen(u.lastSeen)})`;
                              }
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 font-semibold text-xs ${c.text}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${c.dot}${c.pulse ? ' animate-pulse' : ''}`}
                                  />
                                  {displayLabel}
                                </span>
                              );
                            })()}
                          </td>

                          <td className="px-6 py-3.5">
                            {(() => {
                              const vis = u.visibility || 'everyone';
                              if (vis === 'noone') {
                                return (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      className="w-2.5 h-2.5 shrink-0"
                                    >
                                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    Private
                                  </span>
                                );
                              }
                              if (vis === 'friends_of_friends') {
                                return (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      className="w-2.5 h-2.5 shrink-0"
                                    >
                                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                      <circle cx="9" cy="7" r="4" />
                                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    Mutuals
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    className="w-2.5 h-2.5 shrink-0"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                  </svg>
                                  Everyone
                                </span>
                              );
                            })()}
                          </td>

                          <td className="px-6 py-3.5 text-theme-muted font-medium">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3.5 text-right overflow-visible">
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeMenu?.userId === u.id) {
                                    setActiveMenu(null);
                                  } else {
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();
                                    const menuWidth = 176; // w-44 = 176px
                                    const menuHeight = 220; // Safe height estimate of dropdown menu
                                    let left =
                                      rect.right - menuWidth + window.scrollX;
                                    if (left < 8) {
                                      left = 8;
                                    }

                                    // Collision detection for viewport bottom edge:
                                    // If menu extends below screen bottom, push it upwards until it fits
                                    let top = rect.bottom + window.scrollY;
                                    if (
                                      rect.bottom + menuHeight >
                                      window.innerHeight
                                    ) {
                                      const overflow =
                                        rect.bottom +
                                        menuHeight -
                                        window.innerHeight;
                                      top = Math.max(
                                        8 + window.scrollY,
                                        top - overflow - 8,
                                      );
                                    }

                                    setActiveMenu({
                                      userId: u.id,
                                      u,
                                      top,
                                      left,
                                    });
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-glass bg-theme-input hover:bg-theme-input-focus text-theme-primary text-xs font-bold cursor-pointer transition-all flex items-center justify-center shrink-0 active:scale-95"
                                title="User Actions"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 border border-glass bg-theme-sidebar/10 rounded-2xl p-5">
              {/* Search bar */}
              <div className="relative shrink-0 mb-4">
                <input
                  type="text"
                  placeholder="Search group by name or description..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="input-base focus:input-focus w-full pl-9 pr-4 py-2.5 text-xs rounded-xl placeholder-theme-muted"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-3 text-theme-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Groups Table Scroll */}
              <div className="flex-1 overflow-y-auto rounded-xl">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--glass-border)]">
                    <tr className="text-theme-muted text-[10px] font-bold uppercase tracking-wider">
                      <th className="px-6 py-3 w-[250px]">Server Identity</th>
                      <th className="px-6 py-3 w-[300px]">Description</th>
                      <th className="px-6 py-3 w-[220px]">Group Owner</th>
                      <th className="px-6 py-3 w-[120px]">Members</th>
                      <th className="px-6 py-3 w-[110px]">Created</th>
                      <th className="px-6 py-3 text-right w-[150px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)] text-xs text-theme-primary">
                    {filteredGroups.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-theme-muted font-semibold"
                        >
                          No Group registered
                        </td>
                      </tr>
                    ) : (
                      filteredGroups.map((g) => (
                        <tr
                          key={g.id}
                          className="hover:bg-theme-sidebar/10 transition-colors"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-theme-secondary flex items-center justify-center font-extrabold text-white uppercase shrink-0 shadow-sm border border-glass/20">
                                {g.name[0]}
                              </div>
                              <span className="font-bold text-theme-primary truncate">
                                {g.name}
                              </span>
                            </div>
                          </td>
                          <td
                            className="px-6 py-3.5 truncate text-theme-muted font-medium"
                            title={g.description}
                          >
                            {g.description || 'No description provided'}
                          </td>
                          <td className="px-6 py-3.5">
                            {g.owner ? (
                              <div className="min-w-0">
                                <p className="font-bold text-theme-primary truncate leading-tight">
                                  {g.owner.displayName || 'No Display Name'}
                                </p>
                                <p className="text-[10px] text-theme-muted font-mono truncate mt-0.5">
                                  @{g.owner.username || 'unknown'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-theme-muted font-mono text-[9px] bg-theme-input px-1.5 py-0.5 rounded border border-glass">
                                Orphaned
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-theme-input border border-glass text-theme-primary font-bold">
                              {g.memberCount} member
                              {g.memberCount !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-theme-muted font-medium">
                            {new Date(g.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() =>
                                setAddMemberModal({
                                  isOpen: true,
                                  groupId: g.id,
                                  groupName: g.name,
                                })
                              }
                              className="btn-send px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-white cursor-pointer transition-all active-press"
                            >
                              Add Member
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warning Modal */}
      {warningModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel p-6 max-w-md w-full animate-slide-up flex flex-col gap-4 border border-glass">
            <div className="flex items-center gap-3 border-b border-glass pb-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-theme-primary">
                  Send Warning Notification
                </h2>
                <p className="text-xs text-theme-muted">
                  The user @{warningModal.username} receives it in real-time.
                </p>
              </div>
            </div>
            <form onSubmit={handleSendWarning} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                  Warning Message
                </label>
                <textarea
                  required
                  placeholder="E.g., Your activity in community guidelines violates our service terms."
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  rows={4}
                  className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-sm text-theme-primary placeholder-theme-muted resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-glass">
                <button
                  type="button"
                  onClick={() => {
                    setWarningModal(null);
                    setWarningMessage('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={warningSubmitting}
                  className="btn-send px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {warningSubmitting ? 'Sending...' : 'Send Warning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel p-6 max-w-md w-full animate-slide-up flex flex-col gap-4 border border-glass">
            <div className="flex items-center gap-3 border-b border-glass pb-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-theme-secondary">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-theme-primary">
                  Direct Server Assignment
                </h2>
                <p className="text-xs text-theme-muted">
                  Directly assign a user into {addMemberModal.groupName}.
                </p>
              </div>
            </div>
            <form onSubmit={handleAddMember} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                  Select Platform User
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-xs text-theme-primary focus:bg-theme-primary cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  <option
                    value=""
                    className="bg-theme-primary text-theme-muted"
                  >
                    -- Choose User --
                  </option>
                  {users.map((u) => (
                    <option
                      key={u.id}
                      value={u.id}
                      className="bg-theme-primary text-theme-primary"
                    >
                      {u.displayName || u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-glass">
                <button
                  type="button"
                  onClick={() => {
                    setAddMemberModal(null);
                    setSelectedUserId('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberSubmitting || !selectedUserId}
                  className="btn-send px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {addMemberSubmitting ? 'Adding...' : 'Add to Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Friend Request Confirmation Modal */}
      {friendRequestModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel p-6 max-w-sm w-full animate-slide-up flex flex-col gap-4 border border-glass">
            <div className="flex items-center gap-3 border-b border-glass pb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-theme-primary">
                  Send Friend Request
                </h2>
                <p className="text-xs text-theme-muted">
                  Send a friend request to @{friendRequestModal.username} as the
                  platform admin.
                </p>
              </div>
            </div>
            <p className="text-xs text-theme-secondary leading-relaxed">
              This will send a friend request from your admin account to{' '}
              <span className="font-bold text-theme-primary">
                @{friendRequestModal.username}
              </span>
              . They will be notified in real-time.
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-glass">
              <button
                type="button"
                onClick={() => setFriendRequestModal(null)}
                className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={friendRequestSubmitting}
                onClick={handleSendFriendRequest}
                className="px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-emerald-500 hover:bg-emerald-600 border-none"
              >
                {friendRequestSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Identity Modal */}
      {editIdentityModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel p-6 max-w-lg w-full animate-slide-up flex flex-col gap-4 border border-glass">
            <div className="flex items-center gap-3 border-b border-glass pb-3">
              <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-theme-primary">
                  Edit User Identity
                </h2>
                <p className="text-xs text-theme-muted">
                  Modify @{editIdentityModal.currentUsername}&apos;s username or
                  display name.
                </p>
              </div>
            </div>

            {/* Warning notice */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px]">
              <svg
                className="w-3.5 h-3.5 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                The user will be notified in real-time:{' '}
                <strong>
                  &ldquo;Relay Guardian AI changed your [field] due to:
                  [reason]&rdquo;
                </strong>
              </span>
            </div>

            <form onSubmit={handleEditIdentity} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                    New Username
                  </label>
                  <input
                    type="text"
                    placeholder={
                      editIdentityModal.currentUsername || 'username'
                    }
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-xs text-theme-primary placeholder-theme-muted font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                    New Display Name
                  </label>
                  <input
                    type="text"
                    placeholder={
                      editIdentityModal.currentDisplayName || 'Display Name'
                    }
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-xs text-theme-primary placeholder-theme-muted"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                  Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  placeholder="E.g., Username contained inappropriate language."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  rows={3}
                  className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-xs text-theme-primary placeholder-theme-muted resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-glass">
                <button
                  type="button"
                  onClick={() => {
                    setEditIdentityModal(null);
                    setEditUsername('');
                    setEditDisplayName('');
                    setEditReason('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    editIdentitySubmitting ||
                    (!editUsername.trim() && !editDisplayName.trim()) ||
                    !editReason.trim()
                  }
                  className="btn-send px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {editIdentitySubmitting ? 'Applying...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* React Portal actions dropdown menu to prevent table layout/border clipping */}
      {activeMenu &&
        typeof window !== 'undefined' &&
        ReactDOM.createPortal(
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(null);
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: `${activeMenu.top}px`,
                left: `${activeMenu.left}px`,
              }}
              className="w-44 rounded-xl border border-glass bg-[var(--bg-primary)] shadow-2xl py-1 z-50 animate-fade-in text-left"
            >
              <button
                onClick={() => {
                  setActiveMenu(null);
                  handleToggleRole(activeMenu.u);
                }}
                disabled={activeMenu.u.id === user?.id}
                className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-theme-primary hover:bg-theme-input flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none bg-transparent"
              >
                {activeMenu.u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  setWarningModal({
                    isOpen: true,
                    userId: activeMenu.u.id,
                    username: activeMenu.u.username || activeMenu.u.email,
                  });
                }}
                className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-amber-400 hover:bg-theme-input flex items-center gap-2 cursor-pointer border-none bg-transparent"
              >
                Send Warning
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  setFriendRequestModal({
                    isOpen: true,
                    userId: activeMenu.u.id,
                    username: activeMenu.u.username || activeMenu.u.email,
                  });
                }}
                disabled={activeMenu.u.id === user?.id}
                className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-emerald-400 hover:bg-theme-input flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none bg-transparent"
              >
                Friend Request
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  setEditIdentityModal({
                    isOpen: true,
                    userId: activeMenu.u.id,
                    username: activeMenu.u.username || activeMenu.u.email,
                    currentUsername: activeMenu.u.username || '',
                    currentDisplayName: activeMenu.u.displayName || '',
                  });
                  setEditUsername(activeMenu.u.username || '');
                  setEditDisplayName(activeMenu.u.displayName || '');
                  setEditReason('');
                }}
                className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-violet-400 hover:bg-theme-input flex items-center gap-2 cursor-pointer border-none bg-transparent"
              >
                Edit Identity Info
              </button>
              <div className="h-[1px] bg-[var(--glass-border)] my-1" />
              <button
                onClick={() => {
                  setActiveMenu(null);
                  handleForceReload(activeMenu.u);
                }}
                disabled={activeMenu.u.id === user?.id}
                className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-red-500 hover:bg-theme-input flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none bg-transparent"
              >
                Force Reset
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <StoreProvider>
      <AdminDashboardContent />
    </StoreProvider>
  );
}
