import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { setActiveConversation } from '../store/slices/chatSlice';
import type { Group, GroupChannel } from '../store/slices/groupsSlice';
import {
  setActiveChannel,
  deleteGroup,
  deleteChannel,
  removeGroupMember,
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
} from './Icons';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';

interface ChannelSidebarProps {
  group: Group;
  onCreateChannel: () => void;
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
  const [showChannels, setShowChannels] = useState(true);
  const isOwner = group.ownerId === user?.id;
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

  return (
    <div className="glass-panel w-60 min-w-60 h-full flex flex-col overflow-hidden select-none transition-all duration-300 ease-in-out">
      {/* Group Header */}
      <div className="px-4 py-3.5 border-b-[1.5px] border-theme bg-theme-sidebar flex flex-col gap-2.5 shadow-sm">
        {/* Header row: rail toggle + group name + action buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Rail toggle — leftmost, same pattern as ChatSidebar */}
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
          {/* Member count */}
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
          {/* Action buttons */}
          <div className="flex gap-1.5 flex-shrink-0 items-center">
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {/* Section Header */}
        <div
          onClick={() => setShowChannels((v) => !v)}
          className="flex items-center justify-between py-1 px-2 cursor-pointer rounded-md select-none transition-all duration-150 hover:bg-[var(--bg-input)]"
        >
          <div className="flex items-center gap-1">
            <span
              className={`flex transition-transform duration-200 text-[var(--text-muted)] ${
                showChannels ? 'rotate-0' : '-rotate-90'
              }`}
            >
              <IconChevronDown />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Text Channels
            </span>
          </div>
          {isOwner && (
            <button
              id="create-channel-btn"
              title="Create channel"
              onClick={(e) => {
                e.stopPropagation();
                onCreateChannel();
              }}
              className="bg-transparent border-none cursor-pointer p-0.5 rounded flex items-center text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] active-press"
            >
              <IconPlus size={14} />
            </button>
          )}
        </div>

        {/* Channels */}
        {showChannels && (
          <div className="flex flex-col gap-[2px] mt-1">
            {group.channels.length === 0 ? (
              <div className="py-3 px-2 text-xs text-[var(--text-muted)] text-center">
                No channels yet. Create one!
              </div>
            ) : (
              group.channels.map((channel) => {
                const isActive = channel.id === activeChannelId;
                const channelMsgs = messages[channel.id] || [];
                const lastMsg = channelMsgs[channelMsgs.length - 1];
                const hasUnread =
                  lastMsg && lastMsg.senderId !== user?.id && !lastMsg.isRead;
                return (
                  <div
                    key={channel.id}
                    className={`group/channel relative flex items-center justify-between w-full rounded-lg transition-all duration-150 pr-1.5 fade-in-list ${
                      isActive
                        ? 'bg-[var(--theme-btn-active)]'
                        : 'bg-transparent hover:bg-[var(--bg-input)]'
                    }`}
                  >
                    {/* Left active glow bar */}
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
                        <IconHash />
                      </span>
                      <span
                        className={`truncate ${hasUnread ? 'font-bold text-[var(--text-primary)]' : ''}`}
                      >
                        {channel.name}
                      </span>
                      {hasUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse shrink-0 ml-1.5" />
                      )}
                    </button>

                    {isOwner && channel.name !== 'general' && (
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
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom user bar */}
      <div className="p-3 border-t-[1.5px] border-theme flex items-center gap-2 bg-[rgba(0,0,0,0.05)] dark:bg-[rgba(255,255,255,0.015)] shadow-inner">
        <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0 relative shadow-sm">
          {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
          <span
            className={`absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full border-2 border-[var(--bg-sidebar)] ${
              ownStatus === 'online'
                ? 'bg-emerald-500'
                : ownStatus === 'away'
                  ? 'bg-amber-500'
                  : 'bg-slate-500'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
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

// ── Icon Button ───────────────────────────────────────────────────────────────
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
