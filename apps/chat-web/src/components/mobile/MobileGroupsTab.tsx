import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { Avatar } from '../Avatar';
import {
  IconServer,
  IconPlus,
  IconPeople,
  IconHash,
  IconChevronDown,
  IconSettings as IconSettingsSmall,
  IconTrash,
} from '../Icons';
import {
  setActiveGroup,
  setActiveChannel,
  localSetSelfVoiceChannel,
  deleteChannel,
  deleteSection,
  reorderSections,
  reorderChannels,
} from '../../store/slices/groupsSlice';
import { setActiveConversation } from '../../store/slices/chatSlice';
import { socketManager } from '../../store/socketManager';
import { showToast } from '../toast';
import { hasGroupPermission } from '../../utils/permissions';

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

interface MobileGroupsTabProps {
  setIsCreateGroupOpen: (open: boolean) => void;
  setIsInviteMembersOpen: (open: boolean) => void;
  setIsGroupSettingsOpen: (open: boolean) => void;
  setIsCreateSectionOpen: (open: boolean) => void;
  setIsCreateChannelOpen: (open: boolean) => void;
  setCreateChannelSectionId: (sectionId: string | undefined) => void;
  setSectionToEdit: (section: any | null) => void;
  onEditChannel: (channel: any) => void;
  setLocalConfirmModal: (
    modal: { title: string; message: string; onConfirm: () => void } | null,
  ) => void;
}

export const MobileGroupsTab = ({
  setIsCreateGroupOpen,
  setIsInviteMembersOpen,
  setIsGroupSettingsOpen,
  setIsCreateSectionOpen,
  setIsCreateChannelOpen,
  setCreateChannelSectionId,
  setSectionToEdit,
  onEditChannel,
  setLocalConfirmModal,
}: MobileGroupsTabProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const {
    groups: rawGroups,
    activeGroupId,
    activeChannelId,
    activeVoiceChannelId,
    voiceStates,
  } = useAppSelector((s) => s.groups);
  const rawGroupsArray = Array.isArray(rawGroups) ? rawGroups : [];

  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  // Drag and drop local states
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'category' | 'channel' | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(
    null,
  );
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(
    null,
  );
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setSelectedGroupId(activeGroupId);
  }, [activeGroupId]);

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

  const groups = useMemo(() => {
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

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Drag hander for categories/channels
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

  if (!user) {
    return <React.Fragment />;
  }

  return (
    <div className="flex h-full px-3 py-3 gap-2 overflow-hidden">
      {/* ── Left rail: Groups list (Bordery Glass Card) ── */}
      <div
        className="glass-panel border border-glass rounded-[24px] shadow-md flex flex-col gap-2.5 overflow-y-auto p-2 shrink-0 h-full scrollbar-none"
        style={{ width: '76px' }}
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
                        color: isSelected ? '#fff' : 'var(--text-primary)',
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
          title="Create Group"
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
          <span className="text-[9px] font-bold text-theme-muted">New</span>
        </button>
      </div>

      {/* ── Right pane: Channels for selected group (Bordery Glass Card) ── */}
      <div className="glass-panel border border-glass rounded-[24px] shadow-md flex-1 overflow-y-auto py-3.5 px-3 min-w-0 h-full flex flex-col bg-theme-sidebar/10">
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
                {activeGroup.avatarThumbnailUrl || activeGroup.avatarUrl ? (
                  <img
                    src={
                      activeGroup.avatarThumbnailUrl || activeGroup.avatarUrl
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
            {activeGroup.channels.filter((c) => !c.sectionId).length > 0 && (
              <div
                data-drag-type="category"
                data-drag-id="uncategorized"
                className={`flex flex-col gap-0.5 transition-all duration-200
                  ${
                    dragOverSectionId === 'uncategorized' &&
                    dragType === 'channel'
                      ? 'ring-2 ring-(--accent-primary)/50 bg-theme-input/20 border-(--accent-primary)/30 rounded-xl'
                      : ''
                  }
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
                            onClick={() => handleSelectChannel(channel)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98]
                              ${isChanActive ? 'text-theme-primary font-bold' : 'text-theme-muted hover:text-theme-primary'}
                              ${
                                draggedId === channel.id &&
                                dragType === 'channel'
                                  ? 'opacity-40 scale-[0.97] border-dashed border-theme-muted'
                                  : ''
                              }
                              ${
                                dragOverChannelId === channel.id &&
                                dragType === 'channel'
                                  ? 'border-t-2 border-t-(--accent-primary)'
                                  : ''
                              }
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
                                  handleDragTouchStart(e, 'channel', channel.id)
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
                      ${
                        draggedId === section.id && dragType === 'category'
                          ? 'opacity-40 scale-[0.97] border-dashed border-theme-muted'
                          : ''
                      }
                      ${
                        dragOverSectionId === section.id &&
                        dragType === 'category'
                          ? 'border-t-2 border-t-(--accent-primary)'
                          : ''
                      }
                      ${
                        dragOverSectionId === section.id &&
                        dragType === 'channel'
                          ? 'ring-2 ring-(--accent-primary)/50 bg-theme-input/20 border-(--accent-primary)/30 rounded-xl'
                          : ''
                      }
                    `}
                  >
                    {/* Section header */}
                    <div
                      onClick={() => toggleSection(section.id)}
                      className="flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded-lg hover:bg-theme-input/30 transition-all"
                    >
                      {canManage && (
                        <div
                          onTouchStart={(e) =>
                            handleDragTouchStart(e, 'category', section.id)
                          }
                          className="p-1 -ml-1 text-theme-muted cursor-grab active:cursor-grabbing"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconGrip />
                        </div>
                      )}
                      <span
                        className={`text-(--accent-primary) transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : ''
                        }`}
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
                              setSectionToEdit(section);
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
                            const isChanActive = channel.id === activeChannelId;
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
                                  onClick={() => handleSelectChannel(channel)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98]
                                    ${isChanActive ? 'text-theme-primary font-bold' : 'text-theme-muted hover:text-theme-primary'}
                                    ${
                                      draggedId === channel.id &&
                                      dragType === 'channel'
                                        ? 'opacity-40 scale-[0.97] border-dashed border-theme-muted'
                                        : ''
                                    }
                                    ${
                                      dragOverChannelId === channel.id &&
                                      dragType === 'channel'
                                        ? 'border-t-2 border-t-(--accent-primary)'
                                        : ''
                                    }
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
  );
};
