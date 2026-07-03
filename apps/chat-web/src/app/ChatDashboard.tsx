'use client';

import {
  INACTIVITY_TIMEOUT_MS,
  AUTO_OFFLINE_TIMEOUT_MS,
} from '@chat-app/shared-constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Import modular components
import { AuthGate } from '../components/AuthGate';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ChannelSettingsModal } from '../components/ChannelSettingsModal';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { ChatArea } from '../components/ChatArea';
import { ChatSidebar } from '../components/ChatSidebar';
import { VoiceDashboard } from '../components/VoiceDashboard';
import { ComposeModal } from '../components/ComposeModal';
import { CreateChannelModal } from '../components/CreateChannelModal';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { GroupRail } from '../components/GroupRail';
import { GroupSettingsModal } from '../components/GroupSettingsModal';
import { InviteMembersModal } from '../components/InviteMembersModal';
import { MemberSidebar } from '../components/MemberSidebar';
import { useAppDispatch, useAppSelector } from '../store';
import {
  logoutUser,
  restoreSession,
  fetchCurrentUser,
} from '../store/slices/authSlice';
import {
  fetchConversations,
  fetchFriends,
  fetchPendingRequests,
  setActiveConversation,
} from '../store/slices/chatSlice';
import { fetchGroups, setActiveGroup } from '../store/slices/groupsSlice';
import type { GroupChannel, GroupSection } from '../store/slices/groupsSlice';
import { CreateSectionModal } from '../components/CreateSectionModal';
import { socketManager } from '../store/socketManager';
import StoreProvider from '../store/StoreProvider';

import { ProfileSettingsContent } from './profile/page';
import { useNotificationClient } from './useNotificationClient';
import { MobileDashboard } from '../components/MobileDashboard';
import { CallOverlay } from '../components/CallOverlay';

function ChatDashboardContent() {
  const dispatch = useAppDispatch();

  const { user, accessToken } = useAppSelector((s) => s.auth);
  const { activeConversationId } = useAppSelector((s) => s.chat);
  const {
    groups: rawGroups,
    activeGroupId,
    activeChannelId,
    activeVoiceChannelId,
    voiceStates,
  } = useAppSelector((s) => s.groups);
  const groups = Array.isArray(rawGroups) ? rawGroups : [];

  // --- Modal & Panel States ---
  const [isHydrated, setIsHydrated] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [createChannelSectionId, setCreateChannelSectionId] = useState<
    string | undefined
  >(undefined);
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState<GroupSection | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // New settings and member features states
  const [isMembersListOpen, setIsMembersListOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState<GroupChannel | null>(null);
  const [isInviteMembersOpen, setIsInviteMembersOpen] = useState(false);

  const [isDMMode, setIsDMMode] = useState(true); // true = show DM sidebar, false = show group channel sidebar
  const [autoStatus, setAutoStatus] = useState<'online' | 'away' | 'offline'>(
    'online',
  );

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useNotificationClient(user, setIsDMMode);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const awayToOfflineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsDMModeRef = useRef(isDMMode);
  const prevActiveGroupIdRef = useRef(activeGroupId);

  // Sync mobile sidebar open state based on conversation selection
  useEffect(() => {
    const activeId = isDMMode ? activeConversationId : activeChannelId;
    if (!activeId) {
      setIsMobileSidebarOpen(true);
      return;
    }

    const isDMModeChanged = prevIsDMModeRef.current !== isDMMode;
    const activeGroupIdChanged = prevActiveGroupIdRef.current !== activeGroupId;

    // Update refs for the next run
    prevIsDMModeRef.current = isDMMode;
    prevActiveGroupIdRef.current = activeGroupId;

    if (isDMModeChanged || activeGroupIdChanged) {
      // Keep sidebar open when switching group or DM mode via rail
      setIsMobileSidebarOpen(true);
      return;
    }

    // Close sidebar only when a specific channel or DM row is selected
    setIsMobileSidebarOpen(false);
  }, [activeConversationId, activeChannelId, isDMMode, activeGroupId]);

  // --- Session recovery on client mount ---
  useEffect(() => {
    dispatch(restoreSession());
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('chat_token') : null;
    if (token) {
      dispatch(fetchCurrentUser());
    }
    setIsHydrated(true);
  }, [dispatch]);

  // Disable default browser context menu globally
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
  }, []);

  const handleLogout = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your account?',
      confirmLabel: 'Sign Out',
      type: 'info',
      onConfirm: () => {
        socketManager.disconnect();
        dispatch(logoutUser());
        setConfirmModal(null);
      },
    });
  }, [dispatch]);

  // ---- Socket + conversations + groups fetch on login ----
  useEffect(() => {
    if (accessToken && user) {
      dispatch(fetchConversations(user.id));
      dispatch(fetchGroups());
      dispatch(fetchFriends());
      dispatch(fetchPendingRequests());
      socketManager.connect(accessToken);

      return () => {
        socketManager.disconnect();
      };
    }
    return undefined;
  }, [accessToken, user, dispatch]);

  // When a group is activated, switch from DM mode.
  useEffect(() => {
    if (activeGroupId) {
      setIsDMMode(false);
    } else {
      setIsDMMode(true);
    }
  }, [activeGroupId]);

  const handleShowDMs = () => {
    setIsDMMode(true);
    dispatch(setActiveConversation('friends'));
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

  // ---- Inactivity detection: auto-away after 2 minutes, auto-offline after another 10 minutes ----
  useEffect(() => {
    if (!accessToken || !user) {
      return;
    }

    if (manualStatus !== 'online') {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (awayToOfflineTimerRef.current) {
        clearTimeout(awayToOfflineTimerRef.current);
        awayToOfflineTimerRef.current = null;
      }
      socketManager.updateStatus(manualStatus, 'online');
      return;
    }

    const INACTIVITY_MS = INACTIVITY_TIMEOUT_MS;

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (awayToOfflineTimerRef.current) {
        clearTimeout(awayToOfflineTimerRef.current);
        awayToOfflineTimerRef.current = null;
      }

      if (
        autoStatusRef.current === 'away' ||
        autoStatusRef.current === 'offline'
      ) {
        setAutoStatus('online');
        socketManager.updateStatus('online', 'online');
      }

      inactivityTimerRef.current = setTimeout(() => {
        setAutoStatus('away');
        socketManager.updateStatus('online', 'away');

        // Start 10 minutes countdown to automatically transition to offline
        awayToOfflineTimerRef.current = setTimeout(() => {
          setAutoStatus('offline');
          socketManager.updateStatus('offline', 'online');
        }, AUTO_OFFLINE_TIMEOUT_MS);
      }, INACTIVITY_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        if (awayToOfflineTimerRef.current) {
          clearTimeout(awayToOfflineTimerRef.current);
        }
        setAutoStatus('away');
        socketManager.updateStatus('online', 'away');

        // Start 10 minutes countdown to automatically transition to offline if tab stays hidden
        awayToOfflineTimerRef.current = setTimeout(() => {
          setAutoStatus('offline');
          socketManager.updateStatus('offline', 'online');
        }, AUTO_OFFLINE_TIMEOUT_MS);
      } else {
        resetTimer();
      }
    };

    const activityEvents = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ];
    activityEvents.forEach((ev) =>
      window.addEventListener(ev, resetTimer, { passive: true }),
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (awayToOfflineTimerRef.current) {
        clearTimeout(awayToOfflineTimerRef.current);
      }
      activityEvents.forEach((ev) =>
        window.removeEventListener(ev, resetTimer),
      );
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, user?.id, manualStatus]);

  // In group mode, the active conversation is the selected channel
  const effectiveActiveConversationId = isDMMode
    ? activeConversationId
    : activeChannelId;

  // Sync activeConversationId in chatSlice with effectiveActiveConversationId
  useEffect(() => {
    if (effectiveActiveConversationId !== activeConversationId) {
      dispatch(setActiveConversation(effectiveActiveConversationId));
    }
  }, [effectiveActiveConversationId, activeConversationId, dispatch]);

  // ── RENDER: Hydration & Auth Gate ──
  if (!isHydrated) {
    return <div className="bg-theme-primary h-screen w-screen" />;
  }

  if (!accessToken || !user) {
    return <AuthGate />;
  }

  // Resolve active group
  const activeGroup = activeGroupId
    ? groups.find((g) => g.id === activeGroupId) || null
    : null;

  if (isMobile) {
    return (
      <>
        <MobileDashboard
          ownStatus={ownStatus}
          handleLogout={handleLogout}
          _setIsProfileOpen={setIsProfileOpen}
          setIsComposeOpen={setIsComposeOpen}
          setIsCreateGroupOpen={setIsCreateGroupOpen}
          setIsCreateChannelOpen={setIsCreateChannelOpen}
          setCreateChannelSectionId={setCreateChannelSectionId}
          setIsCreateSectionOpen={setIsCreateSectionOpen}
          setSectionToEdit={setSectionToEdit}
          setIsGroupSettingsOpen={setIsGroupSettingsOpen}
          setIsInviteMembersOpen={setIsInviteMembersOpen}
          isMembersListOpen={isMembersListOpen}
          setIsMembersListOpen={setIsMembersListOpen}
          onEditChannel={(c) => {
            setChannelToEdit(c);
            setIsChannelSettingsOpen(true);
          }}
        />

        {/* Backdrop for mobile member sidebar */}
        {!isDMMode && activeGroup && (
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300
              ${isMembersListOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsMembersListOpen(false)}
          />
        )}

        {/* Collapsible Group Member Sidebar */}
        {!isDMMode && activeGroup && (
          <MemberSidebar
            group={activeGroup}
            isOpen={isMembersListOpen}
            onInviteClick={() => setIsInviteMembersOpen(true)}
          />
        )}
        {/* ── Global Voice Dashboard Connection (Portal based) ── */}
        {(() => {
          let voiceGroup = null;
          let voiceChannel = null;
          if (activeVoiceChannelId) {
            for (const g of groups) {
              const ch = g.channels?.find((c) => c.id === activeVoiceChannelId);
              if (ch) {
                voiceGroup = g;
                voiceChannel = ch;
                break;
              }
            }
          }
          if (activeVoiceChannelId && voiceGroup && voiceChannel) {
            return (
              <VoiceDashboard
                groupId={voiceGroup.id}
                channel={voiceChannel}
                voiceStates={voiceStates}
                groupMembers={voiceGroup.members || []}
                currentUser={user}
                isViewed={
                  !isDMMode &&
                  activeGroupId === voiceGroup.id &&
                  activeChannelId === voiceChannel.id
                }
              />
            );
          }
          return null;
        })()}

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
            sectionId={createChannelSectionId}
            onClose={() => {
              setIsCreateChannelOpen(false);
              setCreateChannelSectionId(undefined);
            }}
          />
        )}

        {/* Create Section Category */}
        {isCreateSectionOpen && activeGroup && (
          <CreateSectionModal
            groupId={activeGroup.id}
            section={sectionToEdit || undefined}
            onClose={() => {
              setIsCreateSectionOpen(false);
              setSectionToEdit(null);
            }}
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
            className="fixed inset-0 z-1000 flex items-center justify-center p-4 animate-fade-in bg-[rgba(4,6,12,0.65)] backdrop-blur-xs"
            onClick={() => setIsProfileOpen(false)}
          >
            <div
              className="w-200 max-w-full h-[85vh] flex flex-col overflow-hidden animate-slide-up bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-[18px] shadow-(--glass-shadow)"
              onClick={(e) => e.stopPropagation()}
            >
              <ProfileSettingsContent
                isModal
                onClose={() => setIsProfileOpen(false)}
                onSignOut={() => {
                  setIsProfileOpen(false);
                  handleLogout();
                }}
              />
            </div>
          </div>
        )}
        {confirmModal && (
          <ConfirmationModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmLabel={confirmModal.confirmLabel}
            type={confirmModal.type}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}
        <CallOverlay />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen p-0 md:p-3.5 gap-0 md:gap-3.5 bg-theme-primary">
      {/* Backdrop for mobile sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Responsive Navigation Container (GroupRail + Active Sidebar) */}
      <div
        className={`flex h-full gap-3.5 shrink-0 transition-transform duration-300 z-50
          fixed inset-y-0 left-0 p-3.5 bg-theme-primary/95 backdrop-blur-md md:bg-transparent md:p-0 md:relative md:translate-x-0
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* ── Left: Group Rail ─────────────────────────────────────── */}
        <GroupRail
          onCreateGroup={() => setIsCreateGroupOpen(true)}
          onShowDMs={handleShowDMs}
          onSelectGroup={handleSelectGroup}
          isDMMode={isDMMode}
          isCollapsed={isSidebarCollapsed}
        />

        {/* ── Middle: DM Sidebar OR Channel Sidebar ────────────────── */}
        {isDMMode ? (
          <ChatSidebar
            ownStatus={ownStatus}
            setIsProfileOpen={setIsProfileOpen}
            setIsComposeOpen={setIsComposeOpen}
            handleLogout={handleLogout}
            isRailCollapsed={isSidebarCollapsed}
            onToggleRail={() => setIsSidebarCollapsed((v) => !v)}
          />
        ) : activeGroup ? (
          <ChannelSidebar
            group={activeGroup}
            onCreateChannel={(secId) => {
              setCreateChannelSectionId(secId);
              setIsCreateChannelOpen(true);
            }}
            onCreateSection={() => {
              setSectionToEdit(null);
              setIsCreateSectionOpen(true);
            }}
            onEditSection={(sec) => {
              setSectionToEdit(sec);
              setIsCreateSectionOpen(true);
            }}
            onEditChannel={(c) => {
              setChannelToEdit(c);
              setIsChannelSettingsOpen(true);
            }}
            onEditGroup={() => setIsGroupSettingsOpen(true)}
            onInviteMembers={() => setIsInviteMembersOpen(true)}
            ownStatus={ownStatus}
            setIsProfileOpen={setIsProfileOpen}
            isRailCollapsed={isSidebarCollapsed}
            onToggleRail={() => setIsSidebarCollapsed((v) => !v)}
          />
        ) : (
          /* Fallback: no group selected yet */
          <div className="glass-panel flex flex-col items-center justify-center w-60 min-w-60 h-full">
            <p className="text-theme-muted text-[13px] text-center p-5">
              Select a group from the rail or create a new one.
            </p>
          </div>
        )}
      </div>

      {/* ── Right: Chat Area ─────────────────────────────────────── */}
      <ChatArea
        activeConversationId={effectiveActiveConversationId}
        setIsComposeOpen={setIsComposeOpen}
        isChannelMode={!isDMMode}
        activeChannelName={
          !isDMMode && activeGroup && activeChannelId
            ? activeGroup.channels.find((c) => c.id === activeChannelId)
                ?.name || null
            : null
        }
        isMembersListOpen={isMembersListOpen}
        onToggleMembersList={() => setIsMembersListOpen((v) => !v)}
        onMenuClick={() => setIsMobileSidebarOpen(true)}
      />

      {/* ── Global Voice Dashboard Connection (Portal based) ── */}
      {(() => {
        let voiceGroup = null;
        let voiceChannel = null;
        if (activeVoiceChannelId) {
          for (const g of groups) {
            const ch = g.channels?.find((c) => c.id === activeVoiceChannelId);
            if (ch) {
              voiceGroup = g;
              voiceChannel = ch;
              break;
            }
          }
        }
        if (activeVoiceChannelId && voiceGroup && voiceChannel) {
          return (
            <VoiceDashboard
              groupId={voiceGroup.id}
              channel={voiceChannel}
              voiceStates={voiceStates}
              groupMembers={voiceGroup.members || []}
              currentUser={user}
              isViewed={
                !isDMMode &&
                activeGroupId === voiceGroup.id &&
                activeChannelId === voiceChannel.id
              }
            />
          );
        }
        return null;
      })()}

      {/* Backdrop for mobile member sidebar */}
      {!isDMMode && activeGroup && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300
            ${isMembersListOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsMembersListOpen(false)}
        />
      )}

      {/* ── Collapsible Group Member Sidebar ─────────────────────── */}
      {!isDMMode && activeGroup && (
        <MemberSidebar
          group={activeGroup}
          isOpen={isMembersListOpen}
          onInviteClick={() => setIsInviteMembersOpen(true)}
        />
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
          sectionId={createChannelSectionId}
          onClose={() => {
            setIsCreateChannelOpen(false);
            setCreateChannelSectionId(undefined);
          }}
        />
      )}

      {/* Create Section Category */}
      {isCreateSectionOpen && activeGroup && (
        <CreateSectionModal
          groupId={activeGroup.id}
          section={sectionToEdit || undefined}
          onClose={() => {
            setIsCreateSectionOpen(false);
            setSectionToEdit(null);
          }}
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
          className="fixed inset-0 z-1000 flex items-center justify-center p-4 animate-fade-in bg-[rgba(4,6,12,0.65)] backdrop-blur-xs"
          onClick={() => setIsProfileOpen(false)}
        >
          <div
            className="w-200 max-w-full h-[85vh] flex flex-col overflow-hidden animate-slide-up bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-[18px] shadow-(--glass-shadow)"
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileSettingsContent
              isModal
              onClose={() => setIsProfileOpen(false)}
              onSignOut={() => {
                setIsProfileOpen(false);
                handleLogout();
              }}
            />
          </div>
        </div>
      )}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      <CallOverlay />
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
