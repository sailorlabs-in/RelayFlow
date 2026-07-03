import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { Avatar } from './Avatar';
import { ChatArea } from './ChatArea';
import { FriendsDashboard } from './FriendsDashboard';
import { formatMessageTimestamp } from '../utils/date';
import { PRESENCE_STATUS_DETAILS } from '@chat-app/shared-constants';
import {
  IconChat,
  IconPeople,
  IconServer,
  IconPlus,
  IconHash,
  IconChevronDown,
  IconSettings as IconSettingsSmall,
  IconLogout,
  IconTrash,
} from './Icons';
import {
  setActiveConversation,
  socketUpdateUserStatus,
  fetchUserProfile,
  deleteConversation,
  toggleMuteConversation,
  startOutgoingCall,
} from '../store/slices/chatSlice';
import {
  setActiveGroup,
  setActiveChannel,
  localSetSelfVoiceChannel,
  removeGroupMember,
  deleteGroup,
  updateGroupNotificationPref,
  deleteChannel,
  deleteSection,
  reorderSections,
  reorderChannels,
} from '../store/slices/groupsSlice';
import { socketManager } from '../store/socketManager';
import {
  updateUserStatusOptimistic,
  updateUserProfile,
} from '../store/slices/authSlice';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';
import { ProfileSettingsContent } from '../app/profile/page';
import { hasGroupPermission } from '../utils/permissions';

const IconUser = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconPalette = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.01445 19.1559 5.06822 19.3868 4.99513 19.5962C4.78696 20.1941 4.95473 20.8624 5.43625 21.2828C5.91777 21.7032 6.6027 21.7779 7.15949 21.4746C7.37583 21.3567 7.63665 21.3789 7.83143 21.531C9.06646 21.8349 10.514 22 12 22Z" />
    <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
    <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
    <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
  </svg>
);

const IconActivity = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconBell = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconChevronRight = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-4 h-4 opacity-50"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconGrip = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-4 h-4 opacity-40 hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0"
  >
    <circle cx="9" cy="5" r="1.5" fill="currentColor" />
    <circle cx="15" cy="5" r="1.5" fill="currentColor" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" />
    <circle cx="15" cy="12" r="1.5" fill="currentColor" />
    <circle cx="9" cy="19" r="1.5" fill="currentColor" />
    <circle cx="15" cy="19" r="1.5" fill="currentColor" />
  </svg>
);

const findDragTarget = (
  element: HTMLElement | null,
): { type: string; id: string } | null => {
  let curr = element;
  while (curr) {
    const type = curr.getAttribute('data-drag-type');
    const id = curr.getAttribute('data-drag-id');
    if (type && id) {
      return { type, id };
    }
    curr = curr.parentElement;
  }
  return null;
};

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
  _setIsProfileOpen,
  setIsComposeOpen,
  setIsCreateGroupOpen,
  setIsCreateChannelOpen,
  setCreateChannelSectionId,
  setIsCreateSectionOpen,
  setSectionToEdit: _setSectionToEdit,
  setIsGroupSettingsOpen,
  setIsInviteMembersOpen,
  isMembersListOpen,
  setIsMembersListOpen,
  onEditChannel,
}: MobileDashboardProps): React.JSX.Element => {
  const dispatch = useAppDispatch();

  const { user } = useAppSelector((s) => s.auth);
  const {
    conversations,
    activeConversationId,
    messages,
    typingUsers,
    onlineUsers,
    userProfiles,
    convoRecipients,
    mutedConversationIds,
  } = useAppSelector((s) => s.chat);

  const {
    groups: rawGroups,
    activeGroupId,
    activeChannelId,
    activeVoiceChannelId,
    voiceStates,
  } = useAppSelector((s) => s.groups);
  const rawGroupsArray = Array.isArray(rawGroups) ? rawGroups : [];

  const [groupOrder, setGroupOrder] = useState<string[]>([]);

  useEffect(() => {
    if (user?.groupOrder) {
      try {
        setGroupOrder(JSON.parse(user.groupOrder));
      } catch (e) {
        console.error('Failed to parse group order from user profile:', e);
      }
    } else if (user?.id) {
      const stored = localStorage.getItem(`relayflow_group_order_${user.id}`);
      if (stored) {
        try {
          setGroupOrder(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse group order from localStorage:', e);
        }
      }
    }
  }, [user?.id, user?.groupOrder]);

  const groups = React.useMemo(() => {
    if (!rawGroupsArray.length) {
      return rawGroupsArray;
    }
    if (!groupOrder || !groupOrder.length) {
      return rawGroupsArray;
    }
    return [...rawGroupsArray].sort((a, b) => {
      const indexA = groupOrder.indexOf(a.id);
      const indexB = groupOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) {
        return 0;
      }
      if (indexA === -1) {
        return 1;
      }
      if (indexB === -1) {
        return -1;
      }
      return indexA - indexB;
    });
  }, [rawGroupsArray, groupOrder]);

  // Tab State: 'chats' | 'groups' | 'friends' | 'profile'
  const [activeTab, setActiveTab] = useState<
    'chats' | 'groups' | 'friends' | 'profile'
  >('chats');

  // Mobile Group Sub-Navigation
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Mobile Settings Navigation
  const [profileSubPage, setProfileSubPage] = useState<
    'root' | 'account' | 'theme' | 'status' | 'notifications'
  >('root');

  // Collapsed sections for channel view
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

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

  // Fetch profiles for DMs if missing
  useEffect(() => {
    Object.values(convoRecipients).forEach((recipientId) => {
      if (
        recipientId &&
        user &&
        recipientId !== user.id &&
        !userProfiles[recipientId]
      ) {
        dispatch(fetchUserProfile(recipientId));
      }
    });
  }, [convoRecipients, userProfiles, user, dispatch]);

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

  // Sync selectedGroupId with activeGroupId from Redux
  useEffect(() => {
    setSelectedGroupId(activeGroupId);
  }, [activeGroupId]);

  // Helper to format recipient details
  const getConversationDetails = (convo: any) => {
    if (convo.name) {
      return { name: convo.name, letter: convo.name[0].toUpperCase() };
    }

    let recipientId = convoRecipients[convo.id];
    if (!recipientId) {
      const roomMsgs = messages[convo.id] || [];
      const recipientMsg = roomMsgs.find((m) => m.senderId !== user?.id);
      if (recipientMsg) {
        recipientId = recipientMsg.senderId;
      }
    }

    if (recipientId && userProfiles[recipientId]) {
      const r = userProfiles[recipientId];
      return {
        name: r.username ? r.username : r.displayName || r.email.split('@')[0],
        letter: (r.username || r.displayName || r.email)[0].toUpperCase(),
        email: r.email,
        id: r.id,
        avatarUrl: r.avatarUrl,
        avatarThumbnailUrl: r.avatarThumbnailUrl,
      };
    }

    return {
      name: 'Direct Message',
      letter: 'D',
      email: '',
      id: null,
      avatarUrl: undefined,
      avatarThumbnailUrl: undefined,
    };
  };

  const handleUpdateStatus = async (statusId: string) => {
    if (!user) {
      return;
    }
    try {
      dispatch(updateUserStatusOptimistic(statusId));
      dispatch(
        socketUpdateUserStatus({
          userId: user.id,
          status: statusId,
          autoStatus: 'online',
        }),
      );
      socketManager.updateStatus(statusId);
      await dispatch(updateUserProfile({ status: statusId })).unwrap();
      showToast.success(`Status updated to ${statusId}`);
    } catch (err) {
      console.error('Failed to save status:', err);
      showToast.error('Failed to save status changes.');
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Find active group details
  const activeGroup = useMemo(() => {
    if (selectedGroupId) {
      return groups.find((g) => g.id === selectedGroupId) || null;
    }
    if (activeChannelId) {
      return (
        groups.find((g) => g.channels.some((c) => c.id === activeChannelId)) ||
        null
      );
    }
    if (activeGroupId) {
      return groups.find((g) => g.id === activeGroupId) || null;
    }
    return null;
  }, [groups, selectedGroupId, activeChannelId, activeGroupId]);

  const canManage = useMemo(() => {
    if (!activeGroup || !user) {
      return false;
    }
    const isOwner = activeGroup.ownerId === user.id;
    const isAdmin =
      activeGroup.members?.find((m) => m.userId === user.id)?.role === 'admin';
    return (
      isOwner ||
      isAdmin ||
      hasGroupPermission(activeGroup, user.id, 'manage_channels')
    );
  }, [activeGroup, user]);

  const canDisconnect = useMemo(() => {
    if (!activeGroup || !user) {
      return false;
    }
    const isOwner = activeGroup.ownerId === user.id;
    const isAdmin =
      activeGroup.members?.find((m) => m.userId === user.id)?.role === 'admin';
    return (
      isOwner ||
      isAdmin ||
      hasGroupPermission(activeGroup, user.id, 'manage_roles') ||
      hasGroupPermission(activeGroup, user.id, 'manage_group')
    );
  }, [activeGroup, user]);

  const handleDisconnectParticipant = (targetUserId: string) => {
    if (!activeGroup) {
      return;
    }
    socketManager.disconnectParticipant(activeGroup.id, targetUserId);
  };

  const handleSelectChannel = (channel: any) => {
    if (!activeGroup) {
      return;
    }
    dispatch(setActiveGroup(activeGroup.id));
    dispatch(setActiveChannel(channel.id));
    dispatch(setActiveConversation(channel.id));
    if (channel.layout === 'voice') {
      if (activeVoiceChannelId !== channel.id) {
        dispatch(localSetSelfVoiceChannel(channel.id));
        socketManager.joinVoice(activeGroup.id, channel.id);
      }
    } else {
      socketManager.joinConversation(channel.id);
    }
  };

  const handleDeleteChannel = (channel: any) => {
    if (!activeGroup) {
      return;
    }
    setLocalConfirmModal({
      title: 'Delete Channel',
      message: `Are you sure you want to delete channel #${channel.name}? This will permanently erase all message history in this channel.`,
      onConfirm: async () => {
        try {
          await dispatch(
            deleteChannel({ groupId: activeGroup.id, channelId: channel.id }),
          ).unwrap();
          showToast.success(`Channel #${channel.name} deleted.`);
          if (activeChannelId === channel.id) {
            dispatch(setActiveChannel(null));
            dispatch(setActiveConversation(null));
          }
        } catch (err: any) {
          showToast.error(err || 'Failed to delete channel.');
        } finally {
          setLocalConfirmModal(null);
        }
      },
    });
  };

  const handleDeleteSection = (section: any) => {
    if (!activeGroup) {
      return;
    }
    setLocalConfirmModal({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${section.name}"? Channels inside this category will remain, but the category itself will be deleted.`,
      onConfirm: async () => {
        try {
          await dispatch(
            deleteSection({ groupId: activeGroup.id, sectionId: section.id }),
          ).unwrap();
          showToast.success(`Category "${section.name}" deleted.`);
        } catch (err: any) {
          showToast.error(err || 'Failed to delete category.');
        } finally {
          setLocalConfirmModal(null);
        }
      },
    });
  };

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'category' | 'channel' | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(
    null,
  );
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(
    null,
  );
  const isDraggingRef = useRef(false);

  const handleDragTouchStart = (
    e: React.TouchEvent,
    type: 'category' | 'channel',
    id: string,
  ) => {
    if (e.touches.length !== 1) {
      return;
    }
    setDraggedId(id);
    setDragType(type);
    setDragOverSectionId(null);
    setDragOverChannelId(null);
    isDraggingRef.current = false;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  useEffect(() => {
    if (!draggedId || !dragType) {
      return;
    }

    const handleMove = (e: TouchEvent) => {
      isDraggingRef.current = true;
      if (e.cancelable) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      const element = document.elementFromPoint(
        touch.clientX,
        touch.clientY,
      ) as HTMLElement;
      const target = findDragTarget(element);

      if (!target) {
        setDragOverSectionId(null);
        setDragOverChannelId(null);
        return;
      }

      if (dragType === 'category') {
        if (target.type === 'category' && target.id !== draggedId) {
          setDragOverSectionId(target.id);
        } else {
          setDragOverSectionId(null);
        }
      } else if (dragType === 'channel') {
        if (target.type === 'channel' && target.id !== draggedId) {
          setDragOverChannelId(target.id);
          setDragOverSectionId(null);
        } else if (target.type === 'category') {
          setDragOverSectionId(target.id);
          setDragOverChannelId(null);
        } else {
          setDragOverSectionId(null);
          setDragOverChannelId(null);
        }
      }
    };

    const handleEnd = async (_e: TouchEvent) => {
      if (!activeGroup) {
        cleanup();
        return;
      }

      if (
        dragType === 'category' &&
        dragOverSectionId &&
        draggedId !== dragOverSectionId
      ) {
        const currentSections = activeGroup.sections
          ? [...activeGroup.sections].sort((a, b) => a.position - b.position)
          : [];
        const sectionIds = currentSections.map((s) => s.id);
        const fromIdx = sectionIds.indexOf(draggedId);
        const toIdx = sectionIds.indexOf(dragOverSectionId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const newSectionIds = [...sectionIds];
          newSectionIds.splice(fromIdx, 1);
          newSectionIds.splice(toIdx, 0, draggedId);
          try {
            await dispatch(
              reorderSections({
                groupId: activeGroup.id,
                sectionIds: newSectionIds,
              }),
            ).unwrap();
            showToast.success('Category position updated.');
          } catch {
            showToast.error('Failed to reorder categories.');
          }
        }
      } else if (dragType === 'channel') {
        const dragChannel = activeGroup.channels.find(
          (c) => c.id === draggedId,
        );
        if (dragChannel) {
          if (dragOverChannelId && draggedId !== dragOverChannelId) {
            const targetChannel = activeGroup.channels.find(
              (c) => c.id === dragOverChannelId,
            );
            if (targetChannel) {
              const targetSectionId = targetChannel.sectionId || null;
              const sectionChannels = activeGroup.channels
                .filter(
                  (c) =>
                    (c.sectionId || null) === targetSectionId &&
                    c.id !== draggedId,
                )
                .sort((a, b) => a.position - b.position);

              const targetIdx = sectionChannels.findIndex(
                (c) => c.id === targetChannel.id,
              );
              const reordered = [...sectionChannels];
              if (targetIdx !== -1) {
                reordered.splice(targetIdx, 0, dragChannel);
              } else {
                reordered.push(dragChannel);
              }

              const channelOrders = reordered.map((c, idx) => ({
                channelId: c.id,
                sectionId: targetSectionId,
                position: idx,
              }));

              try {
                await dispatch(
                  reorderChannels({ groupId: activeGroup.id, channelOrders }),
                ).unwrap();
                showToast.success('Channel position updated.');
              } catch {
                showToast.error('Failed to move channel.');
              }
            }
          } else if (dragOverSectionId) {
            const targetSectionId =
              dragOverSectionId === 'uncategorized' ? null : dragOverSectionId;
            if ((dragChannel.sectionId || null) !== targetSectionId) {
              const sectionChannels = activeGroup.channels
                .filter((c) => (c.sectionId || null) === targetSectionId)
                .sort((a, b) => a.position - b.position);

              const reordered = [...sectionChannels, dragChannel];
              const channelOrders = reordered.map((c, idx) => ({
                channelId: c.id,
                sectionId: targetSectionId,
                position: idx,
              }));

              try {
                await dispatch(
                  reorderChannels({ groupId: activeGroup.id, channelOrders }),
                ).unwrap();
                showToast.success('Channel moved to category.');
              } catch {
                showToast.error('Failed to move channel.');
              }
            }
          }
        }
      }

      setTimeout(() => {
        isDraggingRef.current = false;
      }, 50);
      cleanup();
    };

    const cleanup = () => {
      setDraggedId(null);
      setDragType(null);
      setDragOverSectionId(null);
      setDragOverChannelId(null);
    };

    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd, { passive: false });
    window.addEventListener('touchcancel', handleEnd, { passive: false });

    return () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [
    draggedId,
    dragType,
    dragOverSectionId,
    dragOverChannelId,
    activeGroup,
    dispatch,
  ]);

  // Show DM chat only in chats tab; verify the ID actually belongs to a
  // DM conversation (not a stale channel ID that slipped through).
  const showDMChat =
    activeTab === 'chats' &&
    !!activeConversationId &&
    activeConversationId !== 'friends' &&
    conversations.some((c) => c.id === activeConversationId);
  const showChannelChat = activeTab === 'groups' && !!activeChannelId;
  const showChatArea = showDMChat || showChannelChat;

  if (showChatArea) {
    const effectiveActiveConversationId = showChannelChat
      ? activeChannelId || activeConversationId
      : activeConversationId;
    const isChannelModeEffective = showChannelChat;

    const handleMobileBack = () => {
      dispatch(setActiveConversation(null));
      dispatch(setActiveChannel(null));
    };

    // Resolve header info for DM or channel
    let headerName = '';
    let headerLetter = '';
    let headerAvatarUrl: string | undefined;
    let headerSubtitle: React.ReactNode = null;
    let otherUserId = '';

    if (isChannelModeEffective && activeGroup) {
      const chan = activeGroup.channels.find((c) => c.id === activeChannelId);
      headerName = chan?.name || '';
      headerSubtitle = (
        <span className="text-[10px] text-theme-muted">{activeGroup.name}</span>
      );
    } else if (!isChannelModeEffective && activeConversationId) {
      const convo = conversations.find((c) => c.id === activeConversationId);
      if (convo) {
        const det = getConversationDetails(convo);
        headerName = det.name;
        headerLetter = det.letter;
        headerAvatarUrl = det.avatarThumbnailUrl || det.avatarUrl;
        otherUserId = det.id || '';
        const recipStatus = det.id
          ? onlineUsers[det.id] || 'offline'
          : 'offline';
        const presenceInfo = PRESENCE_STATUS_DETAILS.find(
          (p) => p.id === recipStatus,
        );
        headerSubtitle = (
          <span
            className="text-[10px] font-medium"
            style={{ color: presenceInfo?.color || 'var(--text-muted)' }}
          >
            {presenceInfo?.name || 'Offline'}
          </span>
        );
      }
    }

    const handleStartCall = () => {
      if (!activeConversationId || !otherUserId) {
        return;
      }
      dispatch(
        startOutgoingCall({
          conversationId: activeConversationId,
          targetUserId: otherUserId,
          callerName:
            user?.displayName ||
            user?.username ||
            user?.email?.split('@')[0] ||
            'User',
        }),
      );
      socketManager.startDmCall(otherUserId, activeConversationId);
    };

    const handleDeleteConversation = () => {
      if (!activeConversationId) {
        return;
      }
      setLocalConfirmModal({
        title: 'Delete Chat',
        message:
          'Are you sure you want to delete this conversation and all messages for both participants?',
        onConfirm: async () => {
          try {
            await dispatch(deleteConversation(activeConversationId)).unwrap();
            showToast.success('Conversation deleted.');
            handleMobileBack();
          } catch {
            showToast.error('Failed to delete conversation.');
          } finally {
            setLocalConfirmModal(null);
          }
        },
      });
    };

    return (
      <div className="flex flex-col h-screen w-screen bg-theme-primary overflow-hidden">
        {/* Mobile Chat Header Bar */}
        <header className="glass-panel mx-3 mt-3 px-3 py-2.5 flex items-center gap-2.5 shrink-0 rounded-2xl border border-glass shadow-lg z-10">
          <button
            onClick={handleMobileBack}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-theme-muted hover:bg-theme-input active-press shrink-0"
            title="Back"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          {/* Avatar + Name */}
          {isChannelModeEffective ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-(--accent-primary)/15 text-(--accent-primary) shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <line x1="4" y1="9" x2="20" y2="9" />
                  <line x1="4" y1="15" x2="20" y2="15" />
                  <line x1="10" y1="3" x2="8" y2="21" />
                  <line x1="16" y1="3" x2="14" y2="21" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold truncate text-theme-primary">
                  {headerName}
                </div>
                {headerSubtitle}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Avatar letter={headerLetter} url={headerAvatarUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold truncate text-theme-primary">
                  {headerName}
                </div>
                {headerSubtitle}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {isChannelModeEffective ? (
            <button
              onClick={() => setIsMembersListOpen(!isMembersListOpen)}
              className={`w-8 h-8 flex items-center justify-center rounded-xl active-press shrink-0 ${
                isMembersListOpen
                  ? 'text-(--accent-primary) bg-(--accent-primary)/10'
                  : 'text-theme-muted hover:bg-theme-input'
              }`}
              title="Toggle Members"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4.5 h-4.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleStartCall}
                className="w-8 h-8 flex items-center justify-center rounded-xl active-press text-theme-muted hover:bg-theme-input"
                title="Start Call"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-4.5 h-4.5"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>

              <button
                onClick={handleDeleteConversation}
                className="w-8 h-8 flex items-center justify-center rounded-xl active-press text-red-500 hover:bg-red-500/10"
                title="Delete Thread"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4.5 h-4.5"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          )}
        </header>

        {/* Chat Area fills remaining space */}
        <div className="flex-1 min-h-0 mx-3 mb-3 mt-2 rounded-2xl overflow-hidden">
          <ChatArea
            activeConversationId={effectiveActiveConversationId}
            setIsComposeOpen={setIsComposeOpen}
            isChannelMode={isChannelModeEffective}
            activeChannelName={
              isChannelModeEffective && activeGroup
                ? activeGroup.channels.find((c) => c.id === activeChannelId)
                    ?.name || null
                : null
            }
            isMembersListOpen={isMembersListOpen}
            onToggleMembersList={() => setIsMembersListOpen(!isMembersListOpen)}
            onMenuClick={handleMobileBack}
            isMobileView={true}
          />
        </div>
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
  }

  if (!user) {
    return <div className="h-screen w-screen bg-theme-primary" />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-theme-primary overflow-hidden text-theme-primary select-none">
      {/* ── TOP APP HEADER ── */}
      <header className="glass-panel mx-3 mt-3 px-4 py-3 flex items-center justify-between shrink-0 rounded-2xl border border-glass shadow-lg">
        {activeTab === 'profile' && profileSubPage !== 'root' ? (
          // Header details for settings view
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setProfileSubPage('root')}
              className="flex items-center justify-center p-1.5 rounded-lg text-theme-muted hover:bg-theme-input active-press mr-1"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-5 h-5"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="text-[15px] font-bold truncate">
                {profileSubPage === 'account' && 'Account Settings'}
                {profileSubPage === 'theme' && 'Appearance & Themes'}
                {profileSubPage === 'status' && 'Status & Visibility'}
                {profileSubPage === 'notifications' &&
                  'Notifications & Devices'}
              </div>
            </div>
          </div>
        ) : (
          // Default tab header
          <>
            <div className="flex items-center gap-2">
              <div className="text-[18px] font-black tracking-tight bg-gradient-to-r from-(--accent-primary) to-(--accent-secondary) bg-clip-text text-transparent">
                {activeTab === 'chats' && 'Messages'}
                {activeTab === 'groups' && 'Groups'}
                {activeTab === 'friends' && 'Friends'}
                {activeTab === 'profile' && 'My Profile'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Context Action Button */}
              {activeTab === 'chats' && (
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-(--theme-btn-hover) hover:bg-(--theme-btn-active) text-(--accent-primary) active-press border border-glass"
                  title="New DM"
                >
                  <IconPlus />
                </button>
              )}
              {activeTab === 'groups' && (
                <button
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-(--theme-btn-hover) hover:bg-(--theme-btn-active) text-(--accent-primary) active-press border border-glass"
                  title="Create Server"
                >
                  <IconPlus />
                </button>
              )}
            </div>
          </>
        )}
      </header>

      {/* ── CORE VIEW CONTENT CONTAINER ── */}
      <main className="flex-1 overflow-hidden min-h-0 relative">
        {/* TAB 1: CHATS LIST */}
        {activeTab === 'chats' && (
          <div className="flex flex-col gap-2 h-full pb-1 overflow-y-auto px-3 py-3">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-theme-muted">
                <IconChat />
                <p className="mt-4 text-[13px]">
                  No conversations yet. Start a new DM!
                </p>
              </div>
            ) : (
              conversations.map((convo) => {
                const details = getConversationDetails(convo);
                const recipientStatus = details.id
                  ? onlineUsers[details.id] || 'offline'
                  : 'offline';
                const convoMsgs = messages[convo.id] || [];
                const lastMsg =
                  convoMsgs[convoMsgs.length - 1] ?? convo.lastMessage;
                const isTyping = typingUsers[convo.id]
                  ? Object.entries(typingUsers[convo.id]).some(
                      ([uid, t]) => uid !== user.id && t,
                    )
                  : false;
                const hasUnread =
                  lastMsg && lastMsg.senderId !== user.id && !lastMsg.isRead;

                return (
                  <div
                    key={convo.id}
                    onClick={() => {
                      // Clear any group/channel state before opening DM
                      dispatch(setActiveChannel(null));
                      dispatch(setActiveGroup(null));
                      dispatch(setActiveConversation(convo.id));
                    }}
                    onTouchStart={(e) => handleTouchStart('chat', convo.id, e)}
                    onTouchEnd={handleTouchEnd}
                    className="glass-panel relative flex items-center gap-3 p-3 rounded-[20px] cursor-pointer border border-glass hover:bg-theme-input transition-all duration-200 shadow-sm active:scale-[0.98]"
                  >
                    <Avatar
                      letter={details.letter}
                      url={details.avatarThumbnailUrl || details.avatarUrl}
                      status={recipientStatus}
                      size="md"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span
                          className={`font-bold text-[14px] truncate ${hasUnread ? 'text-theme-primary font-extrabold' : 'text-theme-primary'}`}
                        >
                          {details.name}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {hasUnread && (
                            <span className="w-2.5 h-2.5 rounded-full bg-(--accent-primary) animate-pulse" />
                          )}
                          {lastMsg && (
                            <span className="text-[10px] text-theme-muted">
                              {formatMessageTimestamp(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {isTyping ? (
                        <div className="text-[11.5px] font-semibold text-(--accent-secondary) flex items-center gap-1">
                          <span>typing</span>
                          <span
                            className="typing-dot"
                            style={{ animationDelay: '0s' }}
                          />
                          <span
                            className="typing-dot"
                            style={{ animationDelay: '0.15s' }}
                          />
                        </div>
                      ) : (
                        <p
                          className={`text-[12px] truncate ${hasUnread ? 'text-theme-primary font-semibold' : 'text-theme-muted'}`}
                        >
                          {lastMsg
                            ? lastMsg.content || 'Attachment'
                            : 'No messages yet'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: GROUPS – Discord-style two-pane layout */}
        {activeTab === 'groups' && (
          <div className="flex h-full">
            {/* ── Left rail: Groups list ── */}
            <div
              className="flex flex-col gap-1.5 overflow-y-auto py-3 px-2 shrink-0"
              style={{
                width: '76px',
                borderRight: '1px solid var(--border-glass)',
              }}
            >
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 gap-2 text-center text-theme-muted">
                  <IconServer />
                </div>
              ) : (
                groups.map((g) => {
                  const isSelected = selectedGroupId === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        setSelectedGroupId(g.id);
                        dispatch(setActiveGroup(g.id));
                      }}
                      className={`relative flex flex-col items-center gap-1 p-1.5 rounded-2xl transition-all duration-200 active:scale-95 w-full border-none cursor-pointer
                        ${isSelected ? 'bg-(--accent-primary)/15 ' : 'bg-transparent hover:bg-theme-input/60'}
                      `}
                      style={{ outline: 'none' }}
                      title={g.name}
                    >
                      {isSelected && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-(--accent-primary)"
                          style={{ left: '-8px' }}
                        />
                      )}
                      <div
                        className={`w-11 h-11 rounded-[14px] overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-all duration-200
                          ${isSelected ? 'rounded-xl shadow-md' : 'rounded-[14px]'}
                        `}
                        style={{
                          background: isSelected
                            ? 'var(--accent-primary)'
                            : 'var(--glass-bg)',
                          border: isSelected
                            ? '2px solid var(--accent-primary)'
                            : '1.5px solid var(--border-glass)',
                        }}
                      >
                        {g.avatarThumbnailUrl || g.avatarUrl ? (
                          <img
                            src={g.avatarThumbnailUrl || g.avatarUrl}
                            alt={g.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span
                            className="text-[15px] font-black"
                            style={{
                              color: isSelected
                                ? '#fff'
                                : 'var(--text-primary)',
                            }}
                          >
                            {(g.iconLetter || g.name[0]).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[9px] font-bold truncate w-full text-center leading-tight"
                        style={{
                          color: isSelected
                            ? 'var(--accent-primary)'
                            : 'var(--text-muted)',
                          maxWidth: '60px',
                        }}
                      >
                        {g.name}
                      </span>
                    </button>
                  );
                })
              )}

              {/* Create Group button at bottom */}
              <button
                onClick={() => setIsCreateGroupOpen(true)}
                className="flex flex-col items-center gap-1 p-1.5 rounded-2xl hover:bg-theme-input/60 active:scale-95 transition-all duration-200 w-full border-none cursor-pointer mt-1"
                style={{ outline: 'none' }}
                title="Create Server"
              >
                <div
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1.5px dashed var(--border-glass)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <IconPlus />
                </div>
                <span className="text-[9px] font-bold text-theme-muted">
                  New
                </span>
              </button>
            </div>

            {/* ── Right pane: Channels for selected group ── */}
            <div className="flex-1 overflow-y-auto py-3 px-2 min-w-0">
              {!selectedGroupId ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-theme-muted gap-3 px-4">
                  <IconServer />
                  <p className="text-[12px] font-medium">
                    Select a server from the left to see its channels.
                  </p>
                </div>
              ) : !activeGroup ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-theme-muted gap-3 px-4">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-(--accent-primary)" />
                </div>
              ) : (
                <div className="flex flex-col gap-3 animate-fade-in pb-4">
                  {/* Group Header */}
                  <div
                    className="flex items-center gap-2.5 px-1 pb-1"
                    style={{ borderBottom: '1px solid var(--border-glass)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                      style={{
                        background: 'var(--accent-primary)',
                        border: '2px solid var(--accent-primary)',
                      }}
                    >
                      {activeGroup.avatarThumbnailUrl ||
                      activeGroup.avatarUrl ? (
                        <img
                          src={
                            activeGroup.avatarThumbnailUrl ||
                            activeGroup.avatarUrl
                          }
                          alt={activeGroup.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[13px] font-black text-white">
                          {(
                            activeGroup.iconLetter || activeGroup.name[0]
                          ).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-extrabold text-theme-primary truncate leading-tight">
                        {activeGroup.name}
                      </h3>
                      <p className="text-[10px] text-theme-muted leading-none mt-0.5">
                        {activeGroup.members?.length || 0} members
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setIsInviteMembersOpen(true)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-theme-muted hover:bg-theme-input hover:text-theme-primary active-press border-none cursor-pointer"
                        title="Invite Members"
                      >
                        <IconPeople />
                      </button>
                      <button
                        onClick={() => setIsGroupSettingsOpen(true)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-theme-muted hover:bg-theme-input hover:text-theme-primary active-press border-none cursor-pointer"
                        title="Group Settings"
                      >
                        <IconSettingsSmall />
                      </button>
                    </div>
                  </div>

                  {/* Quick actions for managers */}
                  {canManage && (
                    <div className="flex gap-2 px-1">
                      <button
                        onClick={() => setIsCreateSectionOpen(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-theme-muted hover:text-theme-primary hover:bg-theme-input/40 cursor-pointer transition-all border border-glass bg-transparent text-[11px] font-semibold"
                        title="Add Category"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="w-3.5 h-3.5"
                        >
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          <line x1="12" y1="11" x2="12" y2="17" />
                          <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                        <span>Add Category</span>
                      </button>
                    </div>
                  )}

                  {/* Uncategorized channels */}
                  {activeGroup.channels.filter((c) => !c.sectionId).length >
                    0 && (
                    <div
                      data-drag-type="category"
                      data-drag-id="uncategorized"
                      className={`flex flex-col gap-0.5 transition-all duration-200
                        ${dragOverSectionId === 'uncategorized' && dragType === 'channel' ? 'ring-2 ring-(--accent-primary)/50 bg-theme-input/20 border-(--accent-primary)/30 rounded-xl' : ''}
                      `}
                    >
                      <div className="px-2 py-1 text-[10px] font-extrabold tracking-wider uppercase text-theme-muted">
                        Channels
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {activeGroup.channels
                          .filter((c) => !c.sectionId)
                          .sort((a, b) => a.position - b.position)
                          .map((channel) => {
                            const isChanActive = channel.id === activeChannelId;
                            const isVoice = channel.layout === 'voice';
                            const channelVoiceStates = Object.values(
                              voiceStates || {},
                            ).filter((vs) => vs.channelId === channel.id);
                            return (
                              <div
                                key={channel.id}
                                className="flex flex-col w-full"
                                data-drag-type="channel"
                                data-drag-id={channel.id}
                              >
                                <div
                                  onClick={() => {
                                    handleSelectChannel(channel);
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98]
                                    ${
                                      isChanActive
                                        ? 'text-theme-primary font-bold'
                                        : 'text-theme-muted hover:text-theme-primary'
                                    }
                                    ${draggedId === channel.id && dragType === 'channel' ? 'opacity-40 scale-[0.97] border-dashed border-theme-muted' : ''}
                                    ${dragOverChannelId === channel.id && dragType === 'channel' ? 'border-t-2 border-t-(--accent-primary)' : ''}
                                  `}
                                  style={{
                                    background: isChanActive
                                      ? 'var(--theme-btn-active)'
                                      : 'transparent',
                                  }}
                                >
                                  {canManage && (
                                    <div
                                      onTouchStart={(e) =>
                                        handleDragTouchStart(
                                          e,
                                          'channel',
                                          channel.id,
                                        )
                                      }
                                      className="p-1 -ml-1 text-theme-muted cursor-grab active:cursor-grabbing"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <IconGrip />
                                    </div>
                                  )}
                                  {isVoice ? (
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      className="w-4 h-4 shrink-0"
                                      style={{ color: 'var(--accent-primary)' }}
                                    >
                                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    </svg>
                                  ) : (
                                    <span
                                      style={{
                                        color: 'var(--accent-primary)',
                                        opacity: 0.85,
                                      }}
                                    >
                                      <IconHash />
                                    </span>
                                  )}
                                  <span className="text-[13px] font-semibold truncate flex-1">
                                    {channel.name}
                                  </span>
                                  {isVoice && channelVoiceStates.length > 0 && (
                                    <span className="text-[10px] font-bold text-theme-muted shrink-0 mr-1.5">
                                      {channelVoiceStates.length}
                                    </span>
                                  )}
                                  {canManage && (
                                    <div className="flex gap-1 items-center shrink-0">
                                      <button
                                        title="Channel Settings"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditChannel(channel);
                                        }}
                                        className="bg-transparent border-none cursor-pointer text-theme-muted p-1 rounded hover:text-theme-primary hover:bg-theme-input flex items-center transition-all duration-150 active-press shrink-0"
                                      >
                                        <IconSettingsSmall />
                                      </button>
                                      <button
                                        title="Delete Channel"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteChannel(channel);
                                        }}
                                        className="bg-transparent border-none cursor-pointer text-(--danger) p-1 rounded hover:bg-(--danger-bg) flex items-center transition-all duration-150 active-press shrink-0"
                                      >
                                        <IconTrash />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {/* Voice participants */}
                                {isVoice && channelVoiceStates.length > 0 && (
                                  <div className="pl-8 pr-2 py-1 flex flex-col gap-1.5">
                                    {channelVoiceStates.map((vs) => {
                                      const member = activeGroup.members.find(
                                        (m) => m.userId === vs.userId,
                                      );
                                      const profile = member?.user;
                                      if (!profile) {
                                        return null;
                                      }
                                      return (
                                        <div
                                          key={vs.userId}
                                          className="flex items-center justify-between py-0.5"
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <Avatar
                                              letter={(profile.username ||
                                                profile.displayName ||
                                                profile.email ||
                                                'U')[0].toUpperCase()}
                                              url={
                                                profile.avatarThumbnailUrl ||
                                                profile.avatarUrl
                                              }
                                              size="xs"
                                            />
                                            <span className="text-[11px] text-theme-muted truncate">
                                              {profile.username ||
                                                profile.displayName ||
                                                profile.email.split('@')[0]}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {canDisconnect &&
                                              vs.userId !== user?.id && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDisconnectParticipant(
                                                      vs.userId,
                                                    );
                                                  }}
                                                  className="text-(--danger) p-0.5 rounded hover:bg-red-500/10 border-none cursor-pointer bg-transparent flex items-center"
                                                  title="Disconnect"
                                                >
                                                  <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    className="w-3 h-3"
                                                  >
                                                    <line
                                                      x1="18"
                                                      y1="6"
                                                      x2="6"
                                                      y2="18"
                                                    />
                                                    <line
                                                      x1="6"
                                                      y1="6"
                                                      x2="18"
                                                      y2="18"
                                                    />
                                                  </svg>
                                                </button>
                                              )}
                                            {vs.isMuted && (
                                              <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="var(--danger)"
                                                strokeWidth="2.2"
                                                className="w-3 h-3 opacity-80"
                                              >
                                                <line
                                                  x1="1"
                                                  y1="1"
                                                  x2="23"
                                                  y2="23"
                                                  stroke="currentColor"
                                                  strokeWidth="2.5"
                                                />
                                                <path
                                                  d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"
                                                  stroke="currentColor"
                                                  strokeWidth="2.5"
                                                />
                                                <path
                                                  d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"
                                                  stroke="currentColor"
                                                  strokeWidth="2.5"
                                                />
                                              </svg>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Categorized sections */}
                  {[...activeGroup.sections]
                    .sort((a, b) => a.position - b.position)
                    .map((section) => {
                      const sectionChannels = activeGroup.channels
                        .filter((c) => c.sectionId === section.id)
                        .sort((a, b) => a.position - b.position);
                      const isCollapsed = collapsedSections[section.id];
                      return (
                        <div
                          key={section.id}
                          data-drag-type="category"
                          data-drag-id={section.id}
                          className={`flex flex-col gap-0.5 transition-all duration-200
                            ${draggedId === section.id && dragType === 'category' ? 'opacity-40 scale-[0.97] border-dashed border-theme-muted' : ''}
                            ${dragOverSectionId === section.id && dragType === 'category' ? 'border-t-2 border-t-(--accent-primary)' : ''}
                            ${dragOverSectionId === section.id && dragType === 'channel' ? 'ring-2 ring-(--accent-primary)/50 bg-theme-input/20 border-(--accent-primary)/30 rounded-xl' : ''}
                          `}
                        >
                          {/* Section header */}
                          <div
                            onClick={() => {
                              toggleSection(section.id);
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded-lg hover:bg-theme-input/30 transition-all"
                          >
                            {canManage && (
                              <div
                                onTouchStart={(e) =>
                                  handleDragTouchStart(
                                    e,
                                    'category',
                                    section.id,
                                  )
                                }
                                className="p-1 -ml-1 text-theme-muted cursor-grab active:cursor-grabbing"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconGrip />
                              </div>
                            )}
                            <span
                              className={`text-(--accent-primary) transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                            >
                              <IconChevronDown />
                            </span>
                            <span className="text-[10px] font-extrabold tracking-wider uppercase text-theme-muted flex-1 truncate">
                              {section.name}
                            </span>
                            {canManage && (
                              <div className="flex gap-1 items-center shrink-0 mr-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    _setSectionToEdit(section);
                                    setIsCreateSectionOpen(true);
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded text-theme-muted hover:text-theme-primary border-none bg-transparent cursor-pointer"
                                  title="Category Settings"
                                >
                                  <IconSettingsSmall />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSection(section);
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded text-(--danger) hover:text-red-500 border-none bg-transparent cursor-pointer"
                                  title="Delete Category"
                                >
                                  <IconTrash />
                                </button>
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCreateChannelSectionId(section.id);
                                setIsCreateChannelOpen(true);
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded text-theme-muted hover:text-theme-primary border-none bg-transparent cursor-pointer"
                            >
                              <IconPlus />
                            </button>
                          </div>

                          {/* Section channels */}
                          {!isCollapsed && (
                            <div className="flex flex-col gap-0.5">
                              {sectionChannels.length === 0 ? (
                                <div className="text-[11px] text-theme-muted italic px-4 py-1">
                                  No channels yet.
                                </div>
                              ) : (
                                sectionChannels.map((channel) => {
                                  const isChanActive =
                                    channel.id === activeChannelId;
                                  const isVoice = channel.layout === 'voice';
                                  const channelVoiceStates = Object.values(
                                    voiceStates || {},
                                  ).filter((vs) => vs.channelId === channel.id);
                                  return (
                                    <div
                                      key={channel.id}
                                      className="flex flex-col"
                                      data-drag-type="channel"
                                      data-drag-id={channel.id}
                                    >
                                      <div
                                        onClick={() => {
                                          handleSelectChannel(channel);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98]
                                          ${isChanActive ? 'text-theme-primary font-bold' : 'text-theme-muted hover:text-theme-primary'}
                                          ${draggedId === channel.id && dragType === 'channel' ? 'opacity-40 scale-[0.97] border-dashed border-theme-muted' : ''}
                                          ${dragOverChannelId === channel.id && dragType === 'channel' ? 'border-t-2 border-t-(--accent-primary)' : ''}
                                        `}
                                        style={{
                                          background: isChanActive
                                            ? 'var(--theme-btn-active)'
                                            : 'transparent',
                                        }}
                                      >
                                        {canManage && (
                                          <div
                                            onTouchStart={(e) =>
                                              handleDragTouchStart(
                                                e,
                                                'channel',
                                                channel.id,
                                              )
                                            }
                                            className="p-1 -ml-1 text-theme-muted cursor-grab active:cursor-grabbing"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <IconGrip />
                                          </div>
                                        )}
                                        {isVoice ? (
                                          <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.2"
                                            className="w-4 h-4 shrink-0"
                                            style={{
                                              color: 'var(--accent-primary)',
                                            }}
                                          >
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                          </svg>
                                        ) : (
                                          <span
                                            style={{
                                              color: 'var(--accent-primary)',
                                              opacity: 0.85,
                                            }}
                                          >
                                            <IconHash />
                                          </span>
                                        )}
                                        <span className="text-[13px] font-semibold truncate flex-1">
                                          {channel.name}
                                        </span>
                                        {isVoice &&
                                          channelVoiceStates.length > 0 && (
                                            <span className="text-[10px] font-bold text-theme-muted shrink-0 mr-1.5">
                                              {channelVoiceStates.length}
                                            </span>
                                          )}
                                        {canManage && (
                                          <div className="flex gap-1 items-center shrink-0">
                                            <button
                                              title="Channel Settings"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEditChannel(channel);
                                              }}
                                              className="bg-transparent border-none cursor-pointer text-theme-muted p-1 rounded hover:text-theme-primary hover:bg-theme-input flex items-center transition-all duration-150 active-press shrink-0"
                                            >
                                              <IconSettingsSmall />
                                            </button>
                                            <button
                                              title="Delete Channel"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteChannel(channel);
                                              }}
                                              className="bg-transparent border-none cursor-pointer text-(--danger) p-1 rounded hover:bg-(--danger-bg) flex items-center transition-all duration-150 active-press shrink-0"
                                            >
                                              <IconTrash />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {isVoice &&
                                        channelVoiceStates.length > 0 && (
                                          <div className="pl-8 pr-2 py-1 flex flex-col gap-1.5">
                                            {channelVoiceStates.map((vs) => {
                                              const member =
                                                activeGroup.members.find(
                                                  (m) => m.userId === vs.userId,
                                                );
                                              const profile = member?.user;
                                              if (!profile) {
                                                return null;
                                              }
                                              return (
                                                <div
                                                  key={vs.userId}
                                                  className="flex items-center justify-between py-0.5"
                                                >
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    <Avatar
                                                      letter={(profile.username ||
                                                        profile.displayName ||
                                                        profile.email ||
                                                        'U')[0].toUpperCase()}
                                                      url={
                                                        profile.avatarThumbnailUrl ||
                                                        profile.avatarUrl
                                                      }
                                                      size="xs"
                                                    />
                                                    <span className="text-[11px] text-theme-muted truncate">
                                                      {profile.username ||
                                                        profile.displayName ||
                                                        profile.email.split(
                                                          '@',
                                                        )[0]}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {canDisconnect &&
                                                      vs.userId !==
                                                        user?.id && (
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDisconnectParticipant(
                                                              vs.userId,
                                                            );
                                                          }}
                                                          className="text-(--danger) p-0.5 rounded hover:bg-red-500/10 border-none cursor-pointer bg-transparent flex items-center"
                                                        >
                                                          <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2.5"
                                                            className="w-3 h-3"
                                                          >
                                                            <line
                                                              x1="18"
                                                              y1="6"
                                                              x2="6"
                                                              y2="18"
                                                            />
                                                            <line
                                                              x1="6"
                                                              y1="6"
                                                              x2="18"
                                                              y2="18"
                                                            />
                                                          </svg>
                                                        </button>
                                                      )}
                                                    {vs.isMuted && (
                                                      <svg
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="var(--danger)"
                                                        strokeWidth="2.2"
                                                        className="w-3 h-3 opacity-80"
                                                      >
                                                        <line
                                                          x1="1"
                                                          y1="1"
                                                          x2="23"
                                                          y2="23"
                                                          stroke="currentColor"
                                                          strokeWidth="2.5"
                                                        />
                                                        <path
                                                          d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"
                                                          stroke="currentColor"
                                                          strokeWidth="2.5"
                                                        />
                                                        <path
                                                          d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"
                                                          stroke="currentColor"
                                                          strokeWidth="2.5"
                                                        />
                                                      </svg>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
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
          <div
            className={`flex flex-col gap-4 h-full pb-14 animate-fade-in px-3 py-3
              ${profileSubPage === 'root' ? 'overflow-y-auto' : 'overflow-hidden'}
            `}
          >
            {profileSubPage === 'root' ? (
              <>
                {/* User Profile Card */}
                <div className="glass-panel p-5 border border-glass rounded-[28px] flex flex-col items-center text-center shadow-md">
                  <Avatar
                    letter={(user.username ||
                      user.displayName ||
                      user.email)[0].toUpperCase()}
                    url={user.avatarThumbnailUrl || user.avatarUrl}
                    status={ownStatus}
                    size="lg"
                  />
                  <h2 className="font-bold text-[17px] mt-3 leading-snug">
                    {user.displayName || 'Active User'}
                  </h2>
                  <p className="text-[12px] text-theme-muted mt-0.5">
                    {user.username ? `@${user.username}` : user.email}
                  </p>
                </div>

                {/* Settings Navigation Menu List */}
                <div className="glass-panel p-2.5 border border-glass rounded-[24px] flex flex-col gap-1 shadow-md">
                  {[
                    {
                      id: 'account',
                      label: 'Account Settings',
                      desc: 'Profile photo, username, password, 2FA',
                      icon: <IconUser />,
                    },
                    {
                      id: 'theme',
                      label: 'Appearance & Themes',
                      desc: 'Theme colors, dark/light mode, custom editor',
                      icon: <IconPalette />,
                    },
                    {
                      id: 'status',
                      label: 'Status & Visibility',
                      desc: 'Custom status, presence visibility rules',
                      icon: <IconActivity />,
                    },
                    {
                      id: 'notifications',
                      label: 'Notifications & Devices',
                      desc: 'Alerts, push settings, device sessions',
                      icon: <IconBell />,
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setProfileSubPage(item.id as any)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-theme-input text-left active-press transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-(--theme-btn-hover) text-(--accent-primary) shrink-0 border border-glass">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[13.5px] font-bold text-theme-primary leading-tight">
                            {item.label}
                          </h4>
                          <p className="text-[10px] text-theme-muted truncate mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <IconChevronRight />
                    </button>
                  ))}
                </div>

                {/* User Status Options */}
                <div className="glass-panel p-4 border border-glass rounded-[24px] flex flex-col gap-3 shadow-md">
                  <h3 className="font-bold text-[11px] text-theme-muted tracking-wide uppercase px-1">
                    Quick Presence Status
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESENCE_STATUS_DETAILS.map((status) => {
                      const isCurrent = ownStatus === status.id;
                      return (
                        <button
                          key={status.id}
                          onClick={() => handleUpdateStatus(status.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all active-press ${isCurrent ? 'bg-(--theme-btn-active) border-(--accent-primary)/40 text-theme-primary font-bold' : 'bg-transparent border-glass hover:bg-theme-input text-theme-muted'}`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="text-[12.5px] truncate">
                            {status.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logout Panel */}
                <div className="glass-panel p-4 border border-glass rounded-[24px] flex flex-col gap-2 shadow-md">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-(--danger-bg) hover:bg-(--danger-bg)/80 text-(--danger) border border-(--danger-border) rounded-2xl text-[13.5px] font-bold active-press"
                  >
                    <IconLogout />
                    <span>Sign Out Account</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="glass-panel p-4 border border-glass rounded-[28px] flex flex-col shadow-md h-full min-h-[calc(100vh-200px)] overflow-hidden animate-fade-in">
                <ProfileSettingsContent
                  isModal={false}
                  isMobileView={true}
                  activeTab={profileSubPage}
                  onSignOut={handleLogout}
                  onClose={() => setProfileSubPage('root')}
                  onSaveSuccess={() => setProfileSubPage('root')}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── VOICE PILL OVERLAY (Floating on Mobile) ── */}
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
          const isSelfMuted = voiceStates[user.id]?.isMuted || false;
          return (
            <div className="mx-3 mb-2 p-2.5 bg-indigo-950/80 backdrop-blur-md border border-indigo-500/20 rounded-xl flex items-center justify-between shadow-lg shrink-0 z-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-tight truncate text-indigo-200">
                    Connected to voice
                  </p>
                  <p className="text-[9px] text-indigo-300 leading-none truncate">
                    {voiceGroup.name} / #{voiceChannel.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    socketManager.updateVoiceState(
                      !isSelfMuted,
                      voiceStates[user.id]?.isDeafened || false,
                    );
                  }}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg ${isSelfMuted ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-300'} active-press`}
                >
                  {isSelfMuted ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-4 h-4"
                    >
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-4 h-4"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (activeVoiceChannelId === activeChannelId) {
                      dispatch(setActiveChannel(null));
                      dispatch(setActiveConversation(null));
                    }
                    dispatch(localSetSelfVoiceChannel(null));
                    socketManager.leaveVoice();
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 active-press"
                  title="Disconnect"
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
            </div>
          );
        }
        return null;
      })()}

      <footer className="glass-panel mx-3 mb-4 border border-glass shadow-lg flex items-center justify-around py-1.5 px-1.5 rounded-4xl shrink-0 z-40 pb-safe">
        {/* Chats Tab */}
        <button
          onClick={() => {
            setActiveTab('chats');
            setSelectedGroupId(null);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${activeTab === 'chats' ? 'bg-(--theme-btn-active) border border-glass shadow-sm text-(--accent-primary)' : 'text-theme-muted hover:text-theme-primary'}`}
        >
          <div className="relative w-8 h-8 flex items-center justify-center mobile-nav-icon-container">
            <IconChat />
            {conversations.some((c) => {
              const lastMsg = c.lastMessage;
              return lastMsg && lastMsg.senderId !== user.id && !lastMsg.isRead;
            }) && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-(--accent-primary) animate-pulse" />
            )}
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Chats</span>
        </button>

        {/* Groups Tab */}
        <button
          onClick={() => {
            setActiveTab('groups');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${activeTab === 'groups' ? 'bg-(--theme-btn-active) border border-glass shadow-sm text-(--accent-primary)' : 'text-theme-muted hover:text-theme-primary'}`}
        >
          <div className="w-8 h-8 flex items-center justify-center mobile-nav-icon-container">
            <IconServer />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Groups</span>
        </button>

        {/* Friends Tab */}
        <button
          onClick={() => {
            setActiveTab('friends');
            setSelectedGroupId(null);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${activeTab === 'friends' ? 'bg-(--theme-btn-active) border border-glass shadow-sm text-(--accent-primary)' : 'text-theme-muted hover:text-theme-primary'}`}
        >
          <div className="w-8 h-8 flex items-center justify-center mobile-nav-icon-container">
            <IconPeople />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Friends</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => {
            setActiveTab('profile');
            setSelectedGroupId(null);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${activeTab === 'profile' ? 'bg-(--theme-btn-active) border border-glass shadow-sm text-(--accent-primary)' : 'text-theme-muted hover:text-theme-primary'}`}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border border-glass flex items-center justify-center bg-theme-input shrink-0 mobile-nav-profile-container">
            <Avatar
              letter={(user.username ||
                user.displayName ||
                user.email)[0].toUpperCase()}
              url={user.avatarThumbnailUrl || user.avatarUrl}
              status={ownStatus}
              size="xs"
            />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Profile</span>
        </button>
      </footer>

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
              // Chat Option Menu
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
              // Group Option Menu
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
