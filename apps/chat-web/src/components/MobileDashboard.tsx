import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { FriendsDashboard } from './FriendsDashboard';
import { IconTrash, IconLogout } from './Icons';
import {
  setActiveConversation,
  deleteConversation,
  toggleMuteConversation,
} from '../store/slices/chatSlice';
import {
  setActiveGroup,
  setActiveChannel,
  removeGroupMember,
  deleteGroup,
  updateGroupNotificationPref,
} from '../store/slices/groupsSlice';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';

// Subcomponents
import { MobileHeader } from './mobile/MobileHeader';
import { MobileFooter } from './mobile/MobileFooter';
import { MobileChatsTab } from './mobile/MobileChatsTab';
import { MobileGroupsTab } from './mobile/MobileGroupsTab';
import { MobileProfileTab } from './mobile/MobileProfileTab';
import { MobileVoiceOverlay } from './mobile/MobileVoiceOverlay';
import { MobileChatAreaWrapper } from './mobile/MobileChatAreaWrapper';

interface MobileDashboardProps {
  ownStatus: string;
  handleLogout: () => void;
  _setIsProfileOpen: (open: boolean) => void;
  setIsComposeOpen: (open: boolean) => void;
  setIsCreateGroupOpen: (open: boolean) => void;
  setIsCreateChannelOpen: (open: boolean) => void;
  setCreateChannelSectionId: (sectionId: string | undefined) => void;
  setIsCreateSectionOpen: (open: boolean) => void;
  setSectionToEdit: (section: any | null) => void;
  setIsGroupSettingsOpen: (open: boolean) => void;
  setIsInviteMembersOpen: (open: boolean) => void;
  isMembersListOpen: boolean;
  setIsMembersListOpen: (open: boolean) => void;
  onEditChannel: (channel: any) => void;
}

export const MobileDashboard = ({
  ownStatus,
  handleLogout,
  setIsComposeOpen,
  setIsCreateGroupOpen,
  setIsCreateChannelOpen,
  setCreateChannelSectionId,
  setIsCreateSectionOpen,
  setSectionToEdit,
  setIsGroupSettingsOpen,
  setIsInviteMembersOpen,
  isMembersListOpen,
  setIsMembersListOpen,
  onEditChannel,
}: MobileDashboardProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { conversations, activeConversationId, mutedConversationIds } =
    useAppSelector((s) => s.chat);

  const { groups: rawGroups, activeChannelId } = useAppSelector(
    (s) => s.groups,
  );
  const groups = Array.isArray(rawGroups) ? rawGroups : [];

  // Tab State: 'chats' | 'groups' | 'friends' | 'profile'
  const [activeTab, setActiveTab] = useState<
    'chats' | 'groups' | 'friends' | 'profile'
  >('chats');

  // Selected Group State (used to track local selections in tab footer)
  const [, setSelectedGroupId] = useState<string | null>(null);

  // Mobile Settings Navigation
  const [profileSubPage, setProfileSubPage] = useState<
    'root' | 'account' | 'theme' | 'status' | 'notifications'
  >('root');

  // Mobile Context Menu for hold gesture
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'chat' | 'group';
    id: string;
  } | null>(null);

  // Mobile Confirmation Dialog
  const [localConfirmModal, setLocalConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Hold gesture refs & handlers
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleTouchStart = (
    type: 'chat' | 'group',
    id: string,
    e: React.TouchEvent,
  ) => {
    // Only capture primary touch
    if (e.touches.length > 1) {
      return;
    }
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    isLongPressRef.current = false;

    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }

    touchTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setContextMenu({
        x: clientX,
        y: clientY,
        type,
        id,
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('touchstart', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('touchstart', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, []);

  // Sync isDMMode based on tab changes or active items
  useEffect(() => {
    setProfileSubPage('root');
    if (activeTab === 'chats') {
      dispatch(setActiveChannel(null));
      dispatch(setActiveGroup(null));
      dispatch(setActiveConversation(null));
    } else if (activeTab === 'groups') {
      dispatch(setActiveConversation(null));
    } else if (activeTab === 'friends') {
      dispatch(setActiveConversation('friends'));
      dispatch(setActiveChannel(null));
      dispatch(setActiveGroup(null));
    } else {
      dispatch(setActiveConversation(null));
      dispatch(setActiveChannel(null));
      dispatch(setActiveGroup(null));
    }
  }, [activeTab, dispatch]);

  const showDMChat =
    activeTab === 'chats' &&
    !!activeConversationId &&
    activeConversationId !== 'friends' &&
    conversations.some((c) => c.id === activeConversationId);
  const showChannelChat = activeTab === 'groups' && !!activeChannelId;
  const showChatArea = showDMChat || showChannelChat;

  if (!user) {
    return <div className="h-screen w-screen bg-theme-primary" />;
  }

  // Active Chat Screen overlay
  if (showChatArea) {
    return (
      <React.Fragment>
        <MobileChatAreaWrapper
          setIsComposeOpen={setIsComposeOpen}
          isMembersListOpen={isMembersListOpen}
          setIsMembersListOpen={setIsMembersListOpen}
          setLocalConfirmModal={setLocalConfirmModal}
        />
        {localConfirmModal && (
          <ConfirmationModal
            isOpen={true}
            title={localConfirmModal.title}
            message={localConfirmModal.message}
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            onConfirm={localConfirmModal.onConfirm}
            onCancel={() => setLocalConfirmModal(null)}
            type="danger"
          />
        )}
      </React.Fragment>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-theme-primary overflow-hidden text-theme-primary select-none">
      {/* ── TOP APP HEADER ── */}
      <MobileHeader
        activeTab={activeTab}
        profileSubPage={profileSubPage}
        setProfileSubPage={setProfileSubPage}
        setIsComposeOpen={setIsComposeOpen}
        setIsCreateGroupOpen={setIsCreateGroupOpen}
      />

      {/* ── CORE VIEW CONTENT CONTAINER ── */}
      <main className="flex-1 overflow-hidden min-h-0 relative">
        {/* TAB 1: CHATS LIST */}
        {activeTab === 'chats' && (
          <MobileChatsTab
            handleTouchStart={handleTouchStart}
            handleTouchEnd={handleTouchEnd}
          />
        )}

        {/* TAB 2: GROUPS */}
        {activeTab === 'groups' && (
          <MobileGroupsTab
            setIsCreateGroupOpen={setIsCreateGroupOpen}
            setIsInviteMembersOpen={setIsInviteMembersOpen}
            setIsGroupSettingsOpen={setIsGroupSettingsOpen}
            setIsCreateSectionOpen={setIsCreateSectionOpen}
            setIsCreateChannelOpen={setIsCreateChannelOpen}
            setCreateChannelSectionId={setCreateChannelSectionId}
            setSectionToEdit={setSectionToEdit}
            onEditChannel={onEditChannel}
            setLocalConfirmModal={setLocalConfirmModal}
          />
        )}

        {/* TAB 3: FRIENDS TAB */}
        {activeTab === 'friends' && (
          <div className="h-full pb-10 flex flex-col overflow-y-auto px-3 py-3">
            <div className="flex-1 h-full min-h-0">
              <FriendsDashboard />
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE/ME TAB */}
        {activeTab === 'profile' && (
          <MobileProfileTab
            ownStatus={ownStatus}
            handleLogout={handleLogout}
            profileSubPage={profileSubPage}
            setProfileSubPage={setProfileSubPage}
          />
        )}
      </main>

      {/* ── VOICE PILL OVERLAY (Floating on Mobile) ── */}
      <MobileVoiceOverlay />

      {/* ── FOOTER NAVIGATION BAR ── */}
      <MobileFooter
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelectedGroupId={setSelectedGroupId}
        ownStatus={ownStatus}
      />

      {/* ── HOLD GESTURE CONTEXT MENU ── */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-9999 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="w-full max-w-[280px] bg-theme-sidebar/95 border border-glass backdrop-blur-lg rounded-[28px] shadow-2xl p-4 flex flex-col gap-1.5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.type === 'chat' ? (
              <>
                <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-theme-muted border-b border-glass mb-1.5">
                  Chat Options
                </div>
                <button
                  onClick={() => {
                    dispatch(
                      toggleMuteConversation({
                        conversationId: contextMenu.id,
                        userId: user.id,
                      }),
                    );
                    setContextMenu(null);
                  }}
                  className="w-full text-left bg-transparent border-none py-3 px-3 text-[13px] font-semibold text-theme-primary hover:bg-theme-input rounded-2xl active-press flex items-center gap-2"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-4 h-4 text-theme-muted"
                  >
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  </svg>
                  <span>
                    {mutedConversationIds.includes(contextMenu.id)
                      ? 'Unmute Notifications'
                      : 'Mute Notifications'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setLocalConfirmModal({
                      title: 'Delete Chat',
                      message:
                        'Are you sure you want to delete this conversation and all messages for both participants?',
                      onConfirm: async () => {
                        try {
                          await dispatch(
                            deleteConversation(contextMenu.id),
                          ).unwrap();
                          showToast.success('Conversation deleted.');
                        } catch {
                          showToast.error('Failed to delete conversation.');
                        } finally {
                          setLocalConfirmModal(null);
                        }
                      },
                    });
                    setContextMenu(null);
                  }}
                  className="w-full text-left bg-transparent border-none py-3 px-3 text-[13px] font-semibold text-(--danger) hover:bg-(--danger-bg) rounded-2xl active-press flex items-center gap-2"
                >
                  <IconTrash />
                  <span>Delete Conversation</span>
                </button>
              </>
            ) : (
              <>
                <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-theme-muted border-b border-glass mb-1.5 font-sans">
                  Server Options
                </div>
                {(() => {
                  const targetGroup = groups.find(
                    (g) => g.id === contextMenu.id,
                  );
                  if (!targetGroup) {
                    return null;
                  }
                  const isTargetOwner = targetGroup.ownerId === user.id;
                  const targetMember = targetGroup.members?.find(
                    (m) => m.userId === user.id,
                  );
                  const targetNotificationPref =
                    targetMember?.notificationPref || 'all';
                  return (
                    <>
                      <button
                        onClick={() => {
                          const nextPref =
                            targetNotificationPref === 'none' ? 'all' : 'none';
                          dispatch(
                            updateGroupNotificationPref({
                              groupId: targetGroup.id,
                              userId: user.id,
                              notificationPref: nextPref,
                            }),
                          );
                          setContextMenu(null);
                        }}
                        className="w-full text-left bg-transparent border-none py-3 px-3 text-[13px] font-semibold text-theme-primary hover:bg-theme-input rounded-2xl active-press flex items-center gap-2"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="w-4 h-4 text-theme-muted"
                        >
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        </svg>
                        <span>
                          {targetNotificationPref === 'none'
                            ? 'Unmute Server'
                            : 'Mute Server'}
                        </span>
                      </button>
                      <div className="h-px bg-glass my-1" />
                      {isTargetOwner ? (
                        <button
                          onClick={() => {
                            setLocalConfirmModal({
                              title: 'Delete Server',
                              message: `Are you sure you want to delete "${targetGroup.name}"? This will delete all channels and messages permanently.`,
                              onConfirm: async () => {
                                try {
                                  await dispatch(
                                    deleteGroup(targetGroup.id),
                                  ).unwrap();
                                  showToast.success(
                                    `Server "${targetGroup.name}" deleted.`,
                                  );
                                } catch {
                                  showToast.error('Failed to delete server.');
                                } finally {
                                  setLocalConfirmModal(null);
                                }
                              },
                            });
                            setContextMenu(null);
                          }}
                          className="w-full text-left bg-transparent border-none py-3 px-3 text-[13px] font-semibold text-(--danger) hover:bg-(--danger-bg) rounded-2xl active-press flex items-center gap-2"
                        >
                          <IconTrash />
                          <span>Delete Group</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setLocalConfirmModal({
                              title: 'Leave Server',
                              message: `Are you sure you want to leave "${targetGroup.name}"?`,
                              onConfirm: async () => {
                                try {
                                  await dispatch(
                                    removeGroupMember({
                                      groupId: targetGroup.id,
                                      userId: user.id,
                                    }),
                                  ).unwrap();
                                  showToast.success(
                                    `You left "${targetGroup.name}".`,
                                  );
                                } catch {
                                  showToast.error('Failed to leave server.');
                                } finally {
                                  setLocalConfirmModal(null);
                                }
                              },
                            });
                            setContextMenu(null);
                          }}
                          className="w-full text-left bg-transparent border-none py-3 px-3 text-[13px] font-semibold text-(--danger) hover:bg-(--danger-bg) rounded-2xl active-press flex items-center gap-2"
                        >
                          <IconLogout />
                          <span>Leave Group</span>
                        </button>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            <button
              onClick={() => setContextMenu(null)}
              className="w-full text-center bg-theme-input/40 border border-glass py-2.5 px-3 text-[12.5px] font-bold text-theme-muted hover:text-theme-primary rounded-2xl active-press mt-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE LOCAL CONFIRMATION MODAL ── */}
      {localConfirmModal && (
        <ConfirmationModal
          isOpen={true}
          title={localConfirmModal.title}
          message={localConfirmModal.message}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={localConfirmModal.onConfirm}
          onCancel={() => setLocalConfirmModal(null)}
          type="danger"
        />
      )}
    </div>
  );
};
