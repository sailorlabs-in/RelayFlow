'use client';

import { INACTIVITY_TIMEOUT_MS } from '@chat-app/shared-constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Import modular components
import { AuthGate } from '../components/AuthGate';
import { ChannelSettingsModal } from '../components/ChannelSettingsModal';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { ChatArea } from '../components/ChatArea';
import { ChatSidebar } from '../components/ChatSidebar';
import { ComposeModal } from '../components/ComposeModal';
import { CreateChannelModal } from '../components/CreateChannelModal';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { GroupRail } from '../components/GroupRail';
import { GroupSettingsModal } from '../components/GroupSettingsModal';
import { InviteMembersModal } from '../components/InviteMembersModal';
import { MemberSidebar } from '../components/MemberSidebar';
import type { Theme } from '../components/ThemeSwitcher';
import { useAppDispatch, useAppSelector } from '../store';
import {
  logoutUser,
  updateUserProfile,
  setThemeMode,
  restoreSession,
} from '../store/slices/authSlice';
import { fetchConversations } from '../store/slices/chatSlice';
import { fetchGroups, setActiveGroup } from '../store/slices/groupsSlice';
import type { GroupChannel } from '../store/slices/groupsSlice';
import { socketManager } from '../store/socketManager';
import StoreProvider from '../store/StoreProvider';

import { ProfileSettingsContent } from './profile/page';

function ChatDashboardContent() {
  const dispatch = useAppDispatch();

  const { user, accessToken } = useAppSelector((s) => s.auth);
  const { activeConversationId } = useAppSelector((s) => s.chat);
  const { groups: rawGroups, activeGroupId, activeChannelId } = useAppSelector((s) => s.groups);
  const groups = Array.isArray(rawGroups) ? rawGroups : [];

  // --- Modal & Panel States ---
  const [isHydrated, setIsHydrated] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  
  // New settings and member features states
  const [isMembersListOpen, setIsMembersListOpen] = useState(true);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState<GroupChannel | null>(null);
  const [isInviteMembersOpen, setIsInviteMembersOpen] = useState(false);

  const [isDMMode, setIsDMMode] = useState(true); // true = show DM sidebar, false = show group channel sidebar
  const [autoStatus, setAutoStatus] = useState<'online' | 'away'>('online');

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Session recovery on client mount ---
  useEffect(() => {
    dispatch(restoreSession());
    setIsHydrated(true);
  }, [dispatch]);

  const handleThemeChange = useCallback((t: Theme) => {
    dispatch(setThemeMode(t));
    if (user && user.themeMode !== t) {
      dispatch(updateUserProfile({ themeMode: t }));
    }
  }, [user, dispatch]);

  const handleLogout = useCallback(() => {
    socketManager.disconnect();
    dispatch(logoutUser());
  }, [dispatch]);

  // ---- Socket + conversations + groups fetch on login ----
  useEffect(() => {
    if (accessToken && user) {
      dispatch(fetchConversations(user.id));
      dispatch(fetchGroups());
      socketManager.connect(accessToken);

      return () => {
        socketManager.disconnect();
      };
    }
    return undefined;
  }, [accessToken, user, dispatch]);

  // When a group is activated, switch from DM mode
  useEffect(() => {
    if (activeGroupId) {
      setIsDMMode(false);
    }
  }, [activeGroupId]);

  const handleShowDMs = () => {
    setIsDMMode(true);
  };

  const handleSelectGroup = (groupId: string) => {
    dispatch(setActiveGroup(groupId));
    setIsDMMode(false);
  };

  const manualStatus = user?.status || 'online';
  const ownStatus = manualStatus === 'online' ? autoStatus : manualStatus;

  // Sync ownStatus with document dataset
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.ownStatus = ownStatus;
  }

  // Ref to access current values inside listeners without re-binding
  const autoStatusRef = useRef(autoStatus);
  useEffect(() => {
    autoStatusRef.current = autoStatus;
  }, [autoStatus]);

  // ---- Inactivity detection: auto-away after 2 minutes ----
  useEffect(() => {
    if (!accessToken || !user) {return;}

    if (manualStatus !== 'online') {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      socketManager.updateStatus(manualStatus, 'online');
      return;
    }

    const INACTIVITY_MS = INACTIVITY_TIMEOUT_MS;

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      if (autoStatusRef.current === 'away') {
        setAutoStatus('online');
        socketManager.updateStatus('online', 'online');
      }

      inactivityTimerRef.current = setTimeout(() => {
        setAutoStatus('away');
        socketManager.updateStatus('online', 'away');
      }, INACTIVITY_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        setAutoStatus('away');
        socketManager.updateStatus('online', 'away');
      } else {
        resetTimer();
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, user?.id, manualStatus]);

  // ── RENDER: Hydration & Auth Gate ──
  if (!isHydrated) {
    return <div style={{ background: 'var(--bg-primary)', height: '100vh', width: '100vw' }} />;
  }

  if (!accessToken || !user) {
    return <AuthGate />;
  }

  // Resolve active group
  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) || null : null;

  // In group mode, the active conversation is the selected channel
  const effectiveActiveConversationId = isDMMode ? activeConversationId : activeChannelId;

  return (
    <div
      className="flex h-screen w-screen p-3.5 gap-3.5"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ── Left: Group Rail ─────────────────────────────────────── */}
      <GroupRail
        onCreateGroup={() => setIsCreateGroupOpen(true)}
        onShowDMs={handleShowDMs}
        onSelectGroup={handleSelectGroup}
        isDMMode={isDMMode}
      />

      {/* ── Middle: DM Sidebar OR Channel Sidebar ────────────────── */}
      {isDMMode ? (
        <ChatSidebar
          ownStatus={ownStatus}
          setIsProfileOpen={setIsProfileOpen}
          setIsComposeOpen={setIsComposeOpen}
          handleLogout={handleLogout}
          handleThemeChange={handleThemeChange}
        />
      ) : activeGroup ? (
        <ChannelSidebar
          group={activeGroup}
          onCreateChannel={() => setIsCreateChannelOpen(true)}
          onEditChannel={(c) => {
            setChannelToEdit(c);
            setIsChannelSettingsOpen(true);
          }}
          onEditGroup={() => setIsGroupSettingsOpen(true)}
          onInviteMembers={() => setIsInviteMembersOpen(true)}
          ownStatus={ownStatus}
          setIsProfileOpen={setIsProfileOpen}
        />
      ) : (
        /* Fallback: no group selected yet */
        <div
          className="glass-panel flex flex-col items-center justify-center"
          style={{ width: '240px', minWidth: '240px', height: '100%' }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            Select a group from the rail or create a new one.
          </p>
        </div>
      )}

      {/* ── Right: Chat Area ─────────────────────────────────────── */}
      <ChatArea
        activeConversationId={effectiveActiveConversationId}
        setIsComposeOpen={setIsComposeOpen}
        isChannelMode={!isDMMode}
        activeChannelName={
          !isDMMode && activeGroup && activeChannelId
            ? activeGroup.channels.find((c) => c.id === activeChannelId)?.name || null
            : null
        }
        isMembersListOpen={isMembersListOpen}
        onToggleMembersList={() => setIsMembersListOpen((v) => !v)}
      />

      {/* ── Collapsible Group Member Sidebar ─────────────────────── */}
      {!isDMMode && activeGroup && isMembersListOpen && (
        <MemberSidebar group={activeGroup} />
      )}

      {/* ── Modals ───────────────────────────────────────────────── */}

      {/* Compose DM */}
      {isComposeOpen && (
        <ComposeModal onClose={() => setIsComposeOpen(false)} />
      )}

      {/* Create Group */}
      {isCreateGroupOpen && (
        <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} />
      )}

      {/* Create Channel */}
      {isCreateChannelOpen && activeGroup && (
        <CreateChannelModal
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          onClose={() => setIsCreateChannelOpen(false)}
        />
      )}

      {/* Invite Members */}
      {isInviteMembersOpen && activeGroup && (
        <InviteMembersModal
          group={activeGroup}
          onClose={() => setIsInviteMembersOpen(false)}
        />
      )}

      {/* Group Settings */}
      {isGroupSettingsOpen && activeGroup && (
        <GroupSettingsModal
          group={activeGroup}
          onClose={() => setIsGroupSettingsOpen(false)}
        />
      )}

      {/* Channel Settings */}
      {isChannelSettingsOpen && activeGroup && channelToEdit && (
        <ChannelSettingsModal
          groupId={activeGroup.id}
          channel={channelToEdit}
          onClose={() => {
            setIsChannelSettingsOpen(false);
            setChannelToEdit(null);
          }}
        />
      )}

      {/* Profile Settings Modal */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(4,6,12,0.65)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          onClick={() => setIsProfileOpen(false)}
        >
          <div
            className="w-[800px] max-w-full h-[85vh] flex flex-col overflow-hidden animate-slide-up"
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
            <ProfileSettingsContent isModal onClose={() => setIsProfileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatDashboard() {
  return (
    <StoreProvider>
      <ChatDashboardContent />
    </StoreProvider>
  );
}
