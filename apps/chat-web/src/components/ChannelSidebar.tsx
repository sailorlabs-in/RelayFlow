import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { setActiveConversation } from '../store/slices/chatSlice';
import type {
  Group,
  GroupChannel,
  GroupSection,
} from '../store/slices/groupsSlice';
import {
  setActiveChannel,
  deleteGroup,
  deleteChannel,
  removeGroupMember,
  deleteSection,
  reorderSections,
  reorderChannels,
  localSetSelfVoiceChannel,
} from '../store/slices/groupsSlice';
import { socketManager } from '../store/socketManager';

import {
  IconHash,
  IconPlus,
  IconPeople,
  IconTrash,
  IconChevronDown,
  IconSettings,
  IconLogout,
  IconMessageDm,
} from './Icons';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';
import { Avatar } from './Avatar';
import { hasGroupPermission } from '../utils/permissions';

interface ChannelSidebarProps {
  group: Group;
  onCreateChannel: (sectionId?: string) => void;
  onCreateSection: () => void;
  onEditSection: (section: GroupSection) => void;
  onEditChannel: (channel: GroupChannel) => void;
  onEditGroup: () => void;
  onInviteMembers: () => void;
  ownStatus: string;
  setIsProfileOpen: (open: boolean) => void;
  isRailCollapsed: boolean;
  onToggleRail: () => void;
}

export const ChannelSidebar = ({
  group,
  onCreateChannel,
  onCreateSection,
  onEditSection,
  onEditChannel,
  onEditGroup,
  onInviteMembers,
  ownStatus,
  setIsProfileOpen,
  isRailCollapsed,
  onToggleRail,
}: ChannelSidebarProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { activeChannelId, activeVoiceChannelId, voiceStates } = useAppSelector(
    (s) => s.groups,
  );
  const { user } = useAppSelector((s) => s.auth);
  const { messages } = useAppSelector((s) => s.chat);

  const selfVoiceState = user ? voiceStates[user.id] : null;
  const isSelfMuted = selfVoiceState?.isMuted || false;
  const isSelfDeafened = selfVoiceState?.isDeafened || false;

  const handleToggleMute = () => {
    if (!user) {
      return;
    }
    const isMuted = !isSelfMuted;
    const isDeafened = isSelfDeafened;
    socketManager.updateVoiceState(isMuted, isDeafened);
  };

  const handleToggleDeafen = () => {
    if (!user) {
      return;
    }
    const isDeafened = !isSelfDeafened;
    const isMuted = isDeafened ? true : isSelfMuted;
    socketManager.updateVoiceState(isMuted, isDeafened);
  };

  const handleDisconnectVoice = () => {
    if (activeVoiceChannelId === activeChannelId) {
      dispatch(setActiveChannel(null));
      dispatch(setActiveConversation(null));
    }
    dispatch(localSetSelfVoiceChannel(null));
    socketManager.leaveVoice();
  };

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(
    null,
  );
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(
    null,
  );

  const isOwner = group.ownerId === user?.id;
  const isAdmin =
    group.members.find((m) => m.userId === user?.id)?.role === 'admin';
  const canManage =
    isOwner ||
    isAdmin ||
    hasGroupPermission(group, user?.id, 'manage_channels');

  const canInvite =
    isOwner || isAdmin || hasGroupPermission(group, user?.id, 'invite_members');

  const canDisconnect =
    isOwner ||
    isAdmin ||
    hasGroupPermission(group, user?.id, 'manage_roles') ||
    hasGroupPermission(group, user?.id, 'manage_group');

  const handleDisconnectParticipant = (targetUserId: string) => {
    socketManager.disconnectParticipant(group.id, targetUserId);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const handleSelectChannel = (channel: GroupChannel) => {
    dispatch(setActiveChannel(channel.id));
    dispatch(setActiveConversation(channel.id));
    if (channel.layout === 'voice') {
      if (activeVoiceChannelId !== channel.id) {
        dispatch(localSetSelfVoiceChannel(channel.id));
        socketManager.joinVoice(group.id, channel.id);
      }
    } else {
      socketManager.joinConversation(channel.id);
    }
  };

  const handleDeleteGroup = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Group',
      message: `Are you sure you want to delete "${group.name}" and all its channels? This action is permanent and cannot be undone.`,
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          await dispatch(deleteGroup(group.id)).unwrap();
          showToast.success(`Group "${group.name}" deleted.`);
        } catch {
          showToast.error('Failed to delete group.');
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const handleLeaveGroup = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Leave Group',
      message: `Are you sure you want to leave the group "${group.name}"? You will lose access to all its channels.`,
      confirmLabel: 'Leave',
      type: 'danger',
      onConfirm: async () => {
        try {
          if (user) {
            await dispatch(
              removeGroupMember({
                groupId: group.id,
                userId: user.id,
              }),
            ).unwrap();
            showToast.success(`You have left the group "${group.name}".`);
          }
        } catch {
          showToast.error('Failed to leave group.');
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const handleDeleteChannel = (channel: GroupChannel) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Channel',
      message: `Are you sure you want to delete channel #${channel.name}? This will permanently erase all message history in this channel.`,
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          await dispatch(
            deleteChannel({
              groupId: group.id,
              channelId: channel.id,
            }),
          ).unwrap();
          showToast.success(`Channel #${channel.name} deleted.`);
        } catch (err: any) {
          showToast.error(err || 'Failed to delete channel.');
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const handleDeleteSection = (section: GroupSection) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${section.name}"? Channels inside will become uncategorized.`,
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          await dispatch(
            deleteSection({ groupId: group.id, sectionId: section.id }),
          ).unwrap();
          showToast.success(`Category "${section.name}" deleted.`);
        } catch (err: any) {
          showToast.error(err || 'Failed to delete category.');
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  // ── Drag and Drop Section Handlers ──────────────────────────────────────────
  const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
    e.dataTransfer.setData('text/section-id', sectionId);
    setDraggedSectionId(sectionId);
  };

  const handleSectionDragOver = (e: React.DragEvent, sectionId: string) => {
    if (draggedSectionId && draggedSectionId !== sectionId) {
      e.preventDefault();
    }
  };

  const handleSectionDragEnter = (e: React.DragEvent, sectionId: string) => {
    if (draggedSectionId && draggedSectionId !== sectionId) {
      setDragOverSectionId(sectionId);
    }
  };

  const handleSectionDragLeave = () => {
    setDragOverSectionId(null);
  };

  const handleSectionDrop = async (
    e: React.DragEvent,
    targetSectionId: string,
  ) => {
    e.preventDefault();
    setDragOverSectionId(null);
    const sectionId =
      e.dataTransfer.getData('text/section-id') || draggedSectionId;
    if (sectionId && sectionId !== targetSectionId) {
      const currentSections = group.sections
        ? [...group.sections].sort((a, b) => a.position - b.position)
        : [];
      const sectionIds = currentSections.map((s) => s.id);
      const fromIdx = sectionIds.indexOf(sectionId);
      const toIdx = sectionIds.indexOf(targetSectionId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const newSectionIds = [...sectionIds];
        newSectionIds.splice(fromIdx, 1);
        newSectionIds.splice(toIdx, 0, sectionId);

        try {
          await dispatch(
            reorderSections({ groupId: group.id, sectionIds: newSectionIds }),
          ).unwrap();
          showToast.success('Category position updated.');
        } catch {
          showToast.error('Failed to reorder categories.');
        }
      }
    }
    setDraggedSectionId(null);
  };

  // ── Drag and Drop Channel Handlers ──────────────────────────────────────────
  const handleChannelDragStart = (e: React.DragEvent, channelId: string) => {
    e.dataTransfer.setData('text/channel-id', channelId);
    setDraggedChannelId(channelId);
  };

  const handleChannelDragOver = (e: React.DragEvent) => {
    if (draggedChannelId) {
      e.preventDefault();
    }
  };

  const handleChannelDragEnter = (e: React.DragEvent, channelId: string) => {
    if (draggedChannelId && draggedChannelId !== channelId) {
      setDragOverChannelId(channelId);
    }
  };

  const handleChannelDragLeave = () => {
    setDragOverChannelId(null);
  };

  const handleChannelDropOnChannel = async (
    e: React.DragEvent,
    targetChannel: GroupChannel,
  ) => {
    e.preventDefault();
    setDragOverChannelId(null);
    const channelId =
      e.dataTransfer.getData('text/channel-id') || draggedChannelId;
    if (channelId && channelId !== targetChannel.id) {
      const targetSectionId = targetChannel.sectionId || null;

      const sectionChannels = group.channels
        .filter(
          (c) =>
            (c.sectionId || null) === targetSectionId && c.id !== channelId,
        )
        .sort((a, b) => a.position - b.position);

      const targetIdx = sectionChannels.findIndex(
        (c) => c.id === targetChannel.id,
      );
      const reordered = [...sectionChannels];

      const dragChannel = group.channels.find((c) => c.id === channelId);
      if (dragChannel) {
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
            reorderChannels({ groupId: group.id, channelOrders }),
          ).unwrap();
        } catch {
          showToast.error('Failed to move channel.');
        }
      }
    }
    setDraggedChannelId(null);
  };

  const handleChannelDropOnSectionHeader = async (
    e: React.DragEvent,
    targetSectionId: string | null,
  ) => {
    e.preventDefault();
    const channelId =
      e.dataTransfer.getData('text/channel-id') || draggedChannelId;
    if (channelId) {
      const dragChannel = group.channels.find((c) => c.id === channelId);
      if (dragChannel && (dragChannel.sectionId || null) !== targetSectionId) {
        const sectionChannels = group.channels
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
            reorderChannels({ groupId: group.id, channelOrders }),
          ).unwrap();
        } catch {
          showToast.error('Failed to move channel.');
        }
      }
    }
    setDraggedChannelId(null);
  };

  // ── Render Channel Row Component ───────────────────────────────────────────
  const renderChannelRow = (channel: GroupChannel) => {
    const isActive = channel.id === activeChannelId;
    const channelMsgs = messages[channel.id] || [];
    const lastMsg = channelMsgs[channelMsgs.length - 1];
    const hasUnread =
      lastMsg && lastMsg.senderId !== user?.id && !lastMsg.isRead;
    const isOver = dragOverChannelId === channel.id;

    // Get voice states for users currently in this voice channel
    const channelVoiceStates = Object.values(voiceStates || {}).filter(
      (vs) => vs.channelId === channel.id,
    );

    return (
      <div key={channel.id} className="flex flex-col w-full">
        <div
          draggable={canManage}
          onDragStart={(e) => handleChannelDragStart(e, channel.id)}
          onDragOver={handleChannelDragOver}
          onDragEnter={(e) => handleChannelDragEnter(e, channel.id)}
          onDragLeave={handleChannelDragLeave}
          onDrop={(e) => handleChannelDropOnChannel(e, channel)}
          className={`group/channel relative flex items-center justify-between w-full rounded-lg transition-all duration-150 pr-1.5 fade-in-list ${
            isActive
              ? 'bg-(--theme-btn-active)'
              : 'bg-transparent hover:bg-theme-input'
          } ${isOver ? 'border-t-2 border-(--accent-primary)' : ''}`}
        >
          <span
            className={`absolute left-0 w-0.75 rounded-r bg-(--accent-primary) transition-all duration-200
            ${isActive ? 'h-5 top-[7.5px]' : 'h-0 top-[17.5px] opacity-0'}`}
          />
          <button
            id={`channel-${channel.id}`}
            onClick={() => handleSelectChannel(channel)}
            className={`flex-1 flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border-none cursor-pointer text-left transition-all duration-150 bg-transparent text-sm min-w-0 outline-none focus-visible:ring-1 focus-visible:ring-(--accent-primary) active-press ${
              isActive
                ? 'text-(--theme-btn-active-text) font-semibold'
                : 'text-theme-secondary font-normal'
            }`}
          >
            <span
              className={`shrink-0 transition-opacity duration-150 ${
                isActive
                  ? 'opacity-100'
                  : 'opacity-60 group-hover/channel:opacity-80'
              }`}
            >
              {channel.layout === 'bubble' ? (
                <span className="w-3.75 h-3.75 flex items-center justify-center text-theme-secondary">
                  <IconMessageDm />
                </span>
              ) : channel.layout === 'voice' ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="w-3.5 h-3.5"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <IconHash />
              )}
            </span>
            <span className="truncate">{channel.name}</span>
            {hasUnread && channel.layout !== 'voice' && (
              <span className="w-1.5 h-1.5 rounded-full bg-(--accent-primary) animate-pulse shrink-0 ml-1.5" />
            )}
          </button>

          {canManage && (
            <div className="flex gap-1 items-center">
              <button
                title="Channel Settings"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditChannel(channel);
                }}
                className="bg-transparent border-none cursor-pointer text-theme-muted p-1 rounded hover:text-theme-primary hover:bg-theme-input flex items-center transition-all duration-150 opacity-0 group-hover/channel:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-primary) spin-hover active-press"
              >
                <IconSettings />
              </button>
              <button
                title="Delete Channel"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChannel(channel);
                }}
                className="bg-transparent border-none cursor-pointer text-(--danger) p-1 rounded hover:bg-(--danger-bg) flex items-center transition-all duration-150 opacity-0 group-hover/channel:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-primary) active-press"
              >
                <IconTrash />
              </button>
            </div>
          )}
        </div>

        {/* Connected voice participants nested list */}
        {channel.layout === 'voice' && channelVoiceStates.length > 0 && (
          <div className="pl-6 pr-2.5 py-1 flex flex-col gap-2 mt-0.5 border-l border-[rgba(255,255,255,0.06)] ml-4">
            {channelVoiceStates.map((vs) => {
              const member = group.members.find((m) => m.userId === vs.userId);
              const profile = member?.user;
              if (!profile) {
                return null;
              }

              return (
                <div
                  key={vs.userId}
                  className="flex items-center justify-between py-0.5 animate-fade-in"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      letter={(profile.username ||
                        profile.displayName ||
                        profile.email ||
                        'U')[0].toUpperCase()}
                      url={profile.avatarThumbnailUrl || profile.avatarUrl}
                      size="xs"
                    />
                    <span className="text-[12px] text-theme-secondary truncate">
                      {profile.username
                        ? `@${profile.username}`
                        : profile.displayName || profile.email.split('@')[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canDisconnect && vs.userId !== user?.id && (
                      <button
                        title="Disconnect from voice channel"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisconnectParticipant(vs.userId);
                        }}
                        className="bg-transparent border-none cursor-pointer text-(--danger) hover:text-red-500 p-0.5 rounded flex items-center transition-colors focus:outline-none"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="w-3 h-3"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                    {vs.isMuted && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--danger)"
                        strokeWidth="2"
                        className="w-3.25 h-3.25 opacity-80"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
                        <line
                          x1="1"
                          y1="1"
                          x2="23"
                          y2="23"
                          stroke="var(--danger)"
                          strokeWidth="2.5"
                        />
                      </svg>
                    )}
                    {vs.isDeafened && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--danger)"
                        strokeWidth="2"
                        className="w-3.25 h-3.25 opacity-80"
                      >
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
                        <line
                          x1="1"
                          y1="1"
                          x2="23"
                          y2="23"
                          stroke="var(--danger)"
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
  };

  const sections = group.sections
    ? [...group.sections].sort((a, b) => a.position - b.position)
    : [];
  const uncategorizedChannels = group.channels
    ? group.channels.filter(
        (c) => !c.sectionId || !sections.some((s) => s.id === c.sectionId),
      )
    : [];

  return (
    <div className="glass-panel w-60 min-w-45 max-w-[calc(100vw-130px)] md:w-60 md:min-w-60 h-full flex flex-col overflow-hidden select-none transition-all duration-300 ease-in-out">
      {/* Group Header */}
      <div className="px-4 py-3.5 border-b-[1.5px] border-theme bg-theme-sidebar flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <button
            id="channel-rail-toggle-btn"
            title={
              isRailCollapsed ? 'Show navigation rail' : 'Hide navigation rail'
            }
            onClick={onToggleRail}
            className={`p-1 rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 mr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) active-press
              ${
                isRailCollapsed
                  ? 'bg-(--theme-btn-active) text-(--theme-btn-active-text)'
                  : 'bg-transparent text-theme-muted hover:bg-theme-input hover:text-theme-primary'
              }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-3.5 h-3.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>

          <div className="flex-1 min-w-0 pr-2">
            <div className="font-bold text-[15px] text-theme-primary truncate">
              {group.name}
            </div>
            {group.description && (
              <div className="text-[11px] text-theme-muted mt-0.5 truncate">
                {group.description}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs flex gap-3 items-center justify-between mt-1">
          <div className="text-[11px] text-theme-muted flex items-center gap-1.5">
            {canInvite && (
              <IconButton
                title="Invite Members"
                onClick={onInviteMembers}
                id="members-btn"
              >
                <IconPeople />
              </IconButton>
            )}
            <span className="font-medium">
              {group.members.length} member
              {group.members.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex gap-1.5 shrink-0 items-center">
            {canManage && (
              <IconButton
                title="Create Category"
                onClick={onCreateSection}
                id="create-category-btn"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </IconButton>
            )}
            {(isOwner ||
              isAdmin ||
              hasGroupPermission(group, user?.id, 'manage_group') ||
              hasGroupPermission(group, user?.id, 'manage_roles')) && (
              <IconButton
                title="Group Settings"
                onClick={onEditGroup}
                id="group-settings-btn"
              >
                <IconSettings />
              </IconButton>
            )}
            {isOwner && (
              <IconButton
                title="Delete Group"
                onClick={handleDeleteGroup}
                id="delete-group-btn"
                danger
              >
                <IconTrash />
              </IconButton>
            )}
            {!isOwner && (
              <IconButton
                title="Leave Group"
                onClick={handleLeaveGroup}
                id="leave-group-btn"
                danger
              >
                <IconLogout />
              </IconButton>
            )}
          </div>
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3.5 custom-scrollbar">
        {/* Uncategorized Section */}
        {uncategorizedChannels.length > 0 && (
          <div
            className="flex flex-col gap-1"
            onDragOver={handleChannelDragOver}
            onDrop={(e) => handleChannelDropOnSectionHeader(e, null)}
          >
            <div className="flex items-center justify-between py-1 px-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-theme-muted">
                Uncategorized
              </span>
            </div>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {uncategorizedChannels.map((channel) =>
                renderChannelRow(channel),
              )}
            </div>
          </div>
        )}

        {/* Accordion Categories */}
        {sections.map((section) => {
          const isCollapsed = collapsedSections[section.id];
          const sectionChannels = group.channels
            ? group.channels
                .filter((c) => c.sectionId === section.id)
                .sort((a, b) => a.position - b.position)
            : [];
          const isOver = dragOverSectionId === section.id;

          return (
            <div
              key={section.id}
              className={`flex flex-col gap-1 transition-all duration-150 rounded-lg p-1 ${
                isOver
                  ? 'bg-[rgba(114,137,218,0.08)] border-2 border-dashed border-(--accent-primary)'
                  : ''
              }`}
              onDragOver={(e) => handleSectionDragOver(e, section.id)}
              onDragEnter={(e) => handleSectionDragEnter(e, section.id)}
              onDragLeave={handleSectionDragLeave}
              onDrop={(e) => handleSectionDrop(e, section.id)}
            >
              {/* Category Header */}
              <div
                draggable={canManage}
                onDragStart={(e) => handleSectionDragStart(e, section.id)}
                onClick={() =>
                  setCollapsedSections((prev) => ({
                    ...prev,
                    [section.id]: !prev[section.id],
                  }))
                }
                className="flex items-center justify-between py-1 px-2 cursor-pointer rounded-md select-none transition-all duration-150 hover:bg-theme-input"
              >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span
                    className={`flex transition-transform duration-200 text-theme-muted ${
                      !isCollapsed ? 'rotate-0' : '-rotate-90'
                    }`}
                  >
                    <IconChevronDown />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-theme-muted truncate">
                    {section.name}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canManage && (
                    <>
                      <button
                        title="Create Channel"
                        onClick={() => onCreateChannel(section.id)}
                        className="bg-transparent border-none cursor-pointer p-0.5 rounded flex items-center text-theme-muted transition-colors duration-150 hover:text-theme-primary focus:outline-none"
                      >
                        <IconPlus size={13} />
                      </button>
                      <button
                        title="Category Settings"
                        onClick={() => onEditSection(section)}
                        className="bg-transparent border-none cursor-pointer p-0.5 rounded flex items-center text-theme-muted transition-colors duration-150 hover:text-theme-primary focus:outline-none"
                      >
                        <IconSettings />
                      </button>
                      <button
                        title="Delete Category"
                        onClick={() => handleDeleteSection(section)}
                        className="bg-transparent border-none cursor-pointer p-0.5 rounded flex items-center text-(--danger) transition-colors duration-150 hover:bg-(--danger-bg) focus:outline-none"
                      >
                        <IconTrash />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Collapsible Channels */}
              {!isCollapsed && (
                <div
                  className="flex flex-col gap-0.5 mt-0.5 pl-2 min-h-2.5"
                  onDragOver={handleChannelDragOver}
                  onDrop={(e) =>
                    handleChannelDropOnSectionHeader(e, section.id)
                  }
                >
                  {sectionChannels.length === 0 ? (
                    <div className="py-2 px-2 text-[11px] text-theme-muted italic">
                      No channels inside.
                    </div>
                  ) : (
                    sectionChannels.map((channel) => renderChannelRow(channel))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state when no categories or uncategorized channels exist */}
        {sections.length === 0 && uncategorizedChannels.length === 0 && (
          <div className="py-8 px-4 text-center">
            <p className="text-xs text-theme-muted mb-3">
              This group is empty. Create a category to get started.
            </p>
            {canManage && (
              <button
                onClick={onCreateSection}
                className="btn-send w-full py-2.5 rounded-lg text-xs font-semibold text-white border-none cursor-pointer active-press"
              >
                Create Category
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Voice Status Bar */}
      {activeVoiceChannelId && (
        <div className="mx-2 mb-2 p-2.5 rounded-xl border border-glass bg-(--theme-btn-active) backdrop-blur-md flex flex-col gap-2 shadow-md animate-fade-in text-(--theme-btn-active-text)">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9.5px] font-bold text-green-500 uppercase tracking-wider">
                  Voice Connected
                </span>
                <span className="text-xs truncate font-semibold">
                  {group.channels.find((c) => c.id === activeVoiceChannelId)
                    ?.name || 'Voice Channel'}
                </span>
              </div>
            </div>

            <button
              title="Disconnect Call"
              onClick={handleDisconnectVoice}
              className="p-1.5 rounded-lg border-none bg-(--danger) text-white hover:bg-red-600 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-3.5 h-3.5"
              >
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-5.33-5.34A19.79 19.79 0 0 1 2 3.18 2 2 0 0 1 4 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8 8.91c1.07 1.27 2.2 2.4 3.47 3.47z" />
                <line
                  x1="1"
                  y1="1"
                  x2="23"
                  y2="23"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] pt-2 mt-1">
            <button
              onClick={handleToggleMute}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg border-none text-[11px] font-semibold cursor-pointer transition-all active:scale-95
                ${
                  isSelfMuted
                    ? 'bg-(--danger-bg) text-(--danger)'
                    : 'bg-transparent text-(--theme-btn-active-text) hover:bg-[rgba(255,255,255,0.05)] opacity-80 hover:opacity-100'
                }`}
            >
              {isSelfMuted ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
                    <line
                      x1="1"
                      y1="1"
                      x2="23"
                      y2="23"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    />
                  </svg>
                  Unmute
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
                  </svg>
                  Mute
                </>
              )}
            </button>

            <button
              onClick={handleToggleDeafen}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg border-none text-[11px] font-semibold cursor-pointer transition-all active:scale-95
                ${
                  isSelfDeafened
                    ? 'bg-(--danger-bg) text-(--danger)'
                    : 'bg-transparent text-(--theme-btn-active-text) hover:bg-[rgba(255,255,255,0.05)] opacity-80 hover:opacity-100'
                }`}
            >
              {isSelfDeafened ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
                    <line
                      x1="1"
                      y1="1"
                      x2="23"
                      y2="23"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    />
                  </svg>
                  Undeafen
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
                  </svg>
                  Deafen
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom User Bar */}
      <div className="p-3 border-t-[1.5px] border-theme flex items-center gap-2 bg-[rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.015)] shadow-inner">
        <Avatar
          letter={(user?.username ||
            user?.displayName ||
            user?.email ||
            'U')[0].toUpperCase()}
          url={user?.avatarThumbnailUrl || user?.avatarUrl}
          status={ownStatus}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-theme-primary truncate">
            {user?.username
              ? `@${user.username}`
              : user?.displayName || user?.email?.split('@')[0] || 'User'}
          </div>
          <div className="text-[10.5px] text-theme-muted capitalize">
            {ownStatus}
          </div>
        </div>
        <IconButton
          title="Settings"
          onClick={() => setIsProfileOpen(true)}
          id="channel-sidebar-settings-btn"
        >
          <IconSettings />
        </IconButton>
      </div>

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
    </div>
  );
};

interface IconButtonProps {
  title: string;
  onClick: () => void;
  id: string;
  children: React.ReactNode;
  danger?: boolean;
}

const IconButton = ({
  title,
  onClick,
  id,
  children,
  danger,
}: IconButtonProps) => (
  <button
    id={id}
    title={title}
    onClick={onClick}
    className={`p-1.5 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 border-none outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) active-press
      ${
        danger
          ? 'text-(--danger) hover:bg-(--danger-bg)'
          : 'text-theme-muted hover:bg-theme-input hover:text-theme-primary'
      } ${id.includes('settings') ? 'spin-hover' : ''}`}
  >
    {children}
  </button>
);
