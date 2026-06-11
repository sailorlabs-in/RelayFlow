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
  const { activeChannelId } = useAppSelector((s) => s.groups);
  const { user } = useAppSelector((s) => s.auth);
  const { messages } = useAppSelector((s) => s.chat);

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
  const canManage = isOwner || isAdmin;

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
    socketManager.joinConversation(channel.id);
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

    return (
      <div
        key={channel.id}
        draggable={canManage}
        onDragStart={(e) => handleChannelDragStart(e, channel.id)}
        onDragOver={handleChannelDragOver}
        onDragEnter={(e) => handleChannelDragEnter(e, channel.id)}
        onDragLeave={handleChannelDragLeave}
        onDrop={(e) => handleChannelDropOnChannel(e, channel)}
        className={`group/channel relative flex items-center justify-between w-full rounded-lg transition-all duration-150 pr-1.5 fade-in-list ${
          isActive
            ? 'bg-[var(--theme-btn-active)]'
            : 'bg-transparent hover:bg-[var(--bg-input)]'
        } ${isOver ? 'border-t-2 border-[var(--accent-primary)]' : ''}`}
      >
        <span
          className={`absolute left-0 w-[3px] rounded-r bg-[var(--accent-primary)] transition-all duration-200
          ${isActive ? 'h-5 top-[7.5px]' : 'h-0 top-[17.5px] opacity-0'}`}
        />
        <button
          id={`channel-${channel.id}`}
          onClick={() => handleSelectChannel(channel)}
          className={`flex-1 flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border-none cursor-pointer text-left transition-all duration-150 bg-transparent text-sm min-w-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] active-press ${
            isActive
              ? 'text-[var(--theme-btn-active-text)] font-semibold'
              : 'text-[var(--text-secondary)] font-normal'
          }`}
        >
          <span
            className={`flex-shrink-0 transition-opacity duration-150 ${
              isActive
                ? 'opacity-100'
                : 'opacity-60 group-hover/channel:opacity-80'
            }`}
          >
            {channel.layout === 'bubble' ? (
              <span className="w-[15px] h-[15px] flex items-center justify-center text-[var(--text-secondary)]">
                <IconMessageDm />
              </span>
            ) : (
              <IconHash />
            )}
          </span>
          <span className="truncate">{channel.name}</span>
          {hasUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse shrink-0 ml-1.5" />
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
              className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 rounded hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] flex items-center transition-all duration-150 opacity-0 group-hover/channel:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] spin-hover active-press"
            >
              <IconSettings />
            </button>
            <button
              title="Delete Channel"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteChannel(channel);
              }}
              className="bg-transparent border-none cursor-pointer text-[var(--danger)] p-1 rounded hover:bg-[var(--danger-bg)] flex items-center transition-all duration-150 opacity-0 group-hover/channel:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] active-press"
            >
              <IconTrash />
            </button>
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
    <div className="glass-panel w-60 min-w-60 h-full flex flex-col overflow-hidden select-none transition-all duration-300 ease-in-out">
      {/* Group Header */}
      <div className="px-4 py-3.5 border-b-[1.5px] border-theme bg-theme-sidebar flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <button
            id="channel-rail-toggle-btn"
            title={
              isRailCollapsed ? 'Show navigation rail' : 'Hide navigation rail'
            }
            onClick={onToggleRail}
            className={`p-1 rounded-md flex items-center justify-center cursor-pointer transition-all duration-150 flex-shrink-0 mr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] active-press
              ${
                isRailCollapsed
                  ? 'bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)]'
                  : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]'
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
            <div className="font-bold text-[15px] text-[var(--text-primary)] truncate">
              {group.name}
            </div>
            {group.description && (
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                {group.description}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs flex gap-3 items-center justify-between mt-1">
          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <IconButton
              title="Invite Members"
              onClick={onInviteMembers}
              id="members-btn"
            >
              <IconPeople />
            </IconButton>
            <span className="font-medium">
              {group.members.length} member
              {group.members.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex gap-1.5 flex-shrink-0 items-center">
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
            {isOwner && (
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Uncategorized
              </span>
            </div>
            <div className="flex flex-col gap-[2px] mt-0.5">
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
                  ? 'bg-[rgba(114,137,218,0.08)] border-2 border-dashed border-[var(--accent-primary)]'
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
                className="flex items-center justify-between py-1 px-2 cursor-pointer rounded-md select-none transition-all duration-150 hover:bg-[var(--bg-input)]"
              >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span
                    className={`flex transition-transform duration-200 text-[var(--text-muted)] ${
                      !isCollapsed ? 'rotate-0' : '-rotate-90'
                    }`}
                  >
                    <IconChevronDown />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">
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
                        className="bg-transparent border-none cursor-pointer p-0.5 rounded flex items-center text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)] focus:outline-none"
                      >
                        <IconPlus size={13} />
                      </button>
                      <button
                        title="Category Settings"
                        onClick={() => onEditSection(section)}
                        className="bg-transparent border-none cursor-pointer p-0.5 rounded flex items-center text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)] focus:outline-none"
                      >
                        <IconSettings />
                      </button>
                      <button
                        title="Delete Category"
                        onClick={() => handleDeleteSection(section)}
                        className="bg-transparent border-none cursor-pointer p-0.5 rounded flex items-center text-[var(--danger)] transition-colors duration-150 hover:bg-[var(--danger-bg)] focus:outline-none"
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
                  className="flex flex-col gap-[2px] mt-0.5 pl-2 min-h-[10px]"
                  onDragOver={handleChannelDragOver}
                  onDrop={(e) =>
                    handleChannelDropOnSectionHeader(e, section.id)
                  }
                >
                  {sectionChannels.length === 0 ? (
                    <div className="py-2 px-2 text-[11px] text-[var(--text-muted)] italic">
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
            <p className="text-xs text-[var(--text-muted)] mb-3">
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
          <div className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">
            {user?.username
              ? `@${user.username}`
              : user?.displayName || user?.email?.split('@')[0] || 'User'}
          </div>
          <div className="text-[10.5px] text-[var(--text-muted)] capitalize">
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
    className={`p-1.5 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 border-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] active-press
      ${
        danger
          ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]'
      } ${id.includes('settings') ? 'spin-hover' : ''}`}
  >
    {children}
  </button>
);
