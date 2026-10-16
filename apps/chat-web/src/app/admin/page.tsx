'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StoreProvider from '../../store/StoreProvider';
import { useAppSelector, useAppDispatch } from '../../store';
import { restoreSession } from '../../store/slices/authSlice';
import ApiRequest from '../../utils/ApiRequest';
import { showToast } from '../../components/toast';
import { socketManager } from '../../store/socketManager';
import type {
  UserData,
  GroupData,
  UpdateNoteData,
  AdminTabType,
} from './components';
import {
  AdminSidebar,
  AdminMetricsCards,
  AdminUsersTab,
  AdminGroupsTab,
  AdminUpdateNotesTab,
  AdminUserActionMenuPortal,
  AdminNoteModal,
  AdminWarningModal,
  AdminAddMemberModal,
  AdminFriendRequestModal,
  AdminEditIdentityModal,
  AdminDeleteNoteModal,
} from './components';

function AdminDashboardContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, accessToken } = useAppSelector((s) => s.auth);

  // hydrated = true once restoreSession has synchronously read localStorage
  const [hydrated, setHydrated] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTabType>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [updateNotes, setUpdateNotes] = useState<UpdateNoteData[]>([]);
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

  // Update Notes modals
  const [noteModal, setNoteModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    noteId?: string;
  } | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [deleteNoteModal, setDeleteNoteModal] = useState<{
    isOpen: boolean;
    noteId: string;
    noteTitle: string;
  } | null>(null);
  const [deleteNoteSubmitting, setDeleteNoteSubmitting] = useState(false);

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
      const [fetchedUsers, fetchedGroups, fetchedNotes] = await Promise.all([
        ApiRequest('/admin/users', 'get'),
        ApiRequest('/admin/groups', 'get'),
        ApiRequest('/admin/update-notes', 'get'),
      ]);
      setUsers(fetchedUsers?.data || []);
      setGroups(fetchedGroups?.data || []);
      setUpdateNotes(fetchedNotes?.data || []);
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

    socketManager.connect(accessToken);
    const socket = socketManager.getSocket();
    if (!socket) {
      return;
    }

    const patchStatus = (userId: string, status: string, lastSeen?: string) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              status,
              ...(lastSeen !== undefined && { lastSeen }),
            };
          }
          return u;
        }),
      );
    };

    const onStatusChanged = (data: {
      userId: string;
      status: string;
      autoStatus?: string;
      lastSeen?: string;
    }) => {
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
      showToast.error('Provide at least a new username or Name.');
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

  const handleDeleteNote = async () => {
    if (!deleteNoteModal) {
      return;
    }
    setDeleteNoteSubmitting(true);
    try {
      await ApiRequest(
        `/admin/update-notes/${deleteNoteModal.noteId}`,
        'delete',
      );
      showToast.success('Update note deleted');
      setDeleteNoteModal(null);
      fetchData();
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to delete update note',
      );
    } finally {
      setDeleteNoteSubmitting(false);
    }
  };

  const handleOpenUserMenu = (
    u: UserData,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();
    if (activeMenu?.userId === u.id) {
      setActiveMenu(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 220;
      let left = rect.right - menuWidth + window.scrollX;
      if (left < 8) {
        left = 8;
      }

      let top = rect.bottom + window.scrollY;
      if (rect.bottom + menuHeight > window.innerHeight) {
        const overflow = rect.bottom + menuHeight - window.innerHeight;
        top = Math.max(8 + window.scrollY, top - overflow - 8);
      }

      setActiveMenu({
        userId: u.id,
        u,
        top,
        left,
      });
    }
  };

  const handleSaveNote = async (title: string, content: string) => {
    setNoteSubmitting(true);
    try {
      if (noteModal?.mode === 'edit' && noteModal?.noteId) {
        await ApiRequest(`/admin/update-notes/${noteModal.noteId}`, 'patch', {
          title: title.trim(),
          content: content.trim(),
        });
        showToast.success('Update note saved');
      } else {
        await ApiRequest('/admin/update-notes', 'post', {
          title: title.trim(),
          content: content.trim(),
        });
        showToast.success('Update note published to all users');
      }
      setNoteModal(null);
      fetchData();
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to save update note',
      );
    } finally {
      setNoteSubmitting(false);
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
        <div className="glass-panel p-8 max-w-md w-full text-center flex flex-col items-center gap-5 border border-glass animate-slide-up shadow-2xl">
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
            className="w-full btn-send py-2.5 rounded-lg text-sm font-bold text-white transition-all cursor-pointer shadow-md"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  const warnedUsersCount = users.filter(
    (u) => u.warnings && u.warnings.length > 0,
  ).length;

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen p-3 md:p-3.5 gap-3 md:gap-3.5 bg-theme-primary text-theme-primary overflow-hidden font-sans antialiased">
      {/* Left Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onBackToWorkspace={() => router.push('/')}
      />

      {/* Right Content Area */}
      <div className="glass-panel flex-1 flex flex-col p-6 h-full overflow-hidden border border-glass animate-slide-up shadow-sm">
        {/* Header of Content Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-glass">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-theme-primary">
              {activeTab === 'users'
                ? 'User Accounts'
                : activeTab === 'groups'
                  ? 'Registered Servers'
                  : 'Update Notes'}
            </h2>
            <p className="text-[11px] text-theme-muted mt-0.5">
              {activeTab === 'users'
                ? 'Administer platform user identities and warning systems.'
                : activeTab === 'groups'
                  ? 'Manage group servers and direct group user assignments.'
                  : 'Publish new update logs and patch notes to the site.'}
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
            {activeTab === 'update-notes' && (
              <button
                onClick={() => {
                  setNoteTitle('');
                  setNoteContent('');
                  setNoteModal({ isOpen: true, mode: 'create' });
                }}
                className="px-3 py-1.5 rounded-lg bg-theme-secondary hover:bg-theme-secondary/90 text-white text-[10px] font-bold cursor-pointer transition-all active-press shadow-sm"
              >
                Publish New Note
              </button>
            )}
            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-input/40 px-2.5 py-1 rounded border border-glass">
              {activeTab === 'users'
                ? `${users.length} Users`
                : activeTab === 'groups'
                  ? `${groups.length} Servers`
                  : `${updateNotes.length} Updates`}
            </span>
          </div>
        </div>

        {/* Metric Cards Row */}
        <AdminMetricsCards
          userCount={users.length}
          groupCount={groups.length}
          warnedCount={warnedUsersCount}
        />

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
            <AdminUsersTab
              users={users}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              onOpenMenu={handleOpenUserMenu}
              activeMenuUserId={activeMenu?.userId}
            />
          ) : activeTab === 'groups' ? (
            <AdminGroupsTab
              groups={groups}
              groupSearch={groupSearch}
              setGroupSearch={setGroupSearch}
              onAddMemberClick={(g) =>
                setAddMemberModal({
                  isOpen: true,
                  groupId: g.id,
                  groupName: g.name,
                })
              }
            />
          ) : (
            <AdminUpdateNotesTab
              updateNotes={updateNotes}
              onEditNote={(note) => {
                setNoteTitle(note.title);
                setNoteContent(note.content);
                setNoteModal({
                  isOpen: true,
                  mode: 'edit',
                  noteId: note.id,
                });
              }}
              onDeleteNote={(note) => {
                setDeleteNoteModal({
                  isOpen: true,
                  noteId: note.id,
                  noteTitle: note.title,
                });
              }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <AdminWarningModal
        isOpen={Boolean(warningModal?.isOpen)}
        username={warningModal?.username || ''}
        warningMessage={warningMessage}
        warningSubmitting={warningSubmitting}
        onChangeMessage={setWarningMessage}
        onClose={() => {
          setWarningModal(null);
          setWarningMessage('');
        }}
        onSubmit={handleSendWarning}
      />

      <AdminAddMemberModal
        isOpen={Boolean(addMemberModal?.isOpen)}
        groupName={addMemberModal?.groupName || ''}
        users={users}
        selectedUserId={selectedUserId}
        addMemberSubmitting={addMemberSubmitting}
        onSelectUser={setSelectedUserId}
        onClose={() => {
          setAddMemberModal(null);
          setSelectedUserId('');
        }}
        onSubmit={handleAddMember}
      />

      <AdminFriendRequestModal
        isOpen={Boolean(friendRequestModal?.isOpen)}
        username={friendRequestModal?.username || ''}
        submitting={friendRequestSubmitting}
        onClose={() => setFriendRequestModal(null)}
        onConfirm={handleSendFriendRequest}
      />

      <AdminEditIdentityModal
        isOpen={Boolean(editIdentityModal?.isOpen)}
        currentUsername={editIdentityModal?.currentUsername || ''}
        currentDisplayName={editIdentityModal?.currentDisplayName || ''}
        editUsername={editUsername}
        editDisplayName={editDisplayName}
        editReason={editReason}
        submitting={editIdentitySubmitting}
        onChangeUsername={setEditUsername}
        onChangeDisplayName={setEditDisplayName}
        onChangeReason={setEditReason}
        onClose={() => {
          setEditIdentityModal(null);
          setEditUsername('');
          setEditDisplayName('');
          setEditReason('');
        }}
        onSubmit={handleEditIdentity}
      />

      <AdminDeleteNoteModal
        isOpen={Boolean(deleteNoteModal?.isOpen)}
        noteTitle={deleteNoteModal?.noteTitle || ''}
        submitting={deleteNoteSubmitting}
        onClose={() => setDeleteNoteModal(null)}
        onConfirm={handleDeleteNote}
      />

      <AdminNoteModal
        isOpen={Boolean(noteModal?.isOpen)}
        mode={noteModal?.mode || 'create'}
        initialTitle={noteTitle}
        initialContent={noteContent}
        onClose={() => setNoteModal(null)}
        onSave={handleSaveNote}
        submitting={noteSubmitting}
      />

      {/* React Portal User Actions Dropdown Menu */}
      <AdminUserActionMenuPortal
        activeMenu={activeMenu}
        currentUserId={user?.id}
        onClose={() => setActiveMenu(null)}
        onToggleRole={handleToggleRole}
        onSendWarning={(u) =>
          setWarningModal({
            isOpen: true,
            userId: u.id,
            username: u.username || u.email,
          })
        }
        onFriendRequest={(u) =>
          setFriendRequestModal({
            isOpen: true,
            userId: u.id,
            username: u.username || u.email,
          })
        }
        onEditIdentity={(u) => {
          setEditIdentityModal({
            isOpen: true,
            userId: u.id,
            username: u.username || u.email,
            currentUsername: u.username || '',
            currentDisplayName: u.displayName || '',
          });
          setEditUsername(u.username || '');
          setEditDisplayName(u.displayName || '');
          setEditReason('');
        }}
        onForceReload={handleForceReload}
      />
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
