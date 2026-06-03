import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { setActiveConversation } from '../store/slices/chatSlice';
import type {
  Group,
  GroupChannel,
  setActiveChannel,
  deleteGroup,
} from '../store/slices/groupsSlice';
import { socketManager } from '../store/socketManager';

import {
  IconHash,
  IconPlus,
  IconPeople,
  IconTrash,
  IconChevronDown,
  IconSettings,
} from './Icons';
import { showToast } from './toast';

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
  const [showChannels, setShowChannels] = useState(true);
  const isOwner = group.ownerId === user?.id;

  const handleSelectChannel = (channel: GroupChannel) => {
    dispatch(setActiveChannel(channel.id));
    dispatch(setActiveConversation(channel.id));
    socketManager.joinConversation(channel.id);
  };

  const handleDeleteGroup = async () => {
    if (
      !window.confirm(
        `Delete "${group.name}" and all its channels? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await dispatch(deleteGroup(group.id)).unwrap();
      showToast.success(`Group "${group.name}" deleted.`);
    } catch {
      showToast.error('Failed to delete group.');
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Group Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1.5px solid var(--border-muted)',
          background: 'var(--bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Header row: rail toggle + group name + action buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Rail toggle — leftmost, same pattern as ChatSidebar */}
          <button
            id="channel-rail-toggle-btn"
            title={
              isRailCollapsed ? 'Show navigation rail' : 'Hide navigation rail'
            }
            onClick={onToggleRail}
            style={{
              background: isRailCollapsed
                ? 'var(--theme-btn-active)'
                : 'transparent',
              color: isRailCollapsed
                ? 'var(--theme-btn-active-text)'
                : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
              marginRight: '4px',
            }}
            onMouseEnter={(e) => {
              if (!isRailCollapsed) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--bg-input)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRailCollapsed) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'transparent';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--text-muted)';
              }
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: 14, height: 14 }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '15px',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {group.name}
            </div>
            {group.description && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {group.description}
              </div>
            )}
          </div>
        </div>
        <div className="fs-12 flex gap-4 items-center justify-between">
          {/* Member count */}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <IconButton
              title="Invite Members"
              onClick={onInviteMembers}
              id="members-btn"
            >
              <IconPeople />
            </IconButton>
            <span>
              {group.members.length} member
              {group.members.length !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
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
          </div>
        </div>
      </div>

      {/* Channel List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
        {/* Section Header */}
        <div
          onClick={() => setShowChannels((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px 4px 6px',
            cursor: 'pointer',
            borderRadius: '6px',
            marginBottom: '2px',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background =
              'var(--bg-input)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background =
              'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                transition: 'transform 0.2s',
                transform: showChannels ? 'rotate(0deg)' : 'rotate(-90deg)',
                color: 'var(--text-muted)',
                display: 'flex',
              }}
            >
              <IconChevronDown />
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
              }}
            >
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
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--text-muted)';
              }}
            >
              <IconPlus size={14} />
            </button>
          )}
        </div>

        {/* Channels */}
        {showChannels && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {group.channels.length === 0 ? (
              <div
                style={{
                  padding: '12px 10px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                No channels yet. Create one!
              </div>
            ) : (
              group.channels.map((channel) => {
                const isActive = channel.id === activeChannelId;
                return (
                  <div
                    key={channel.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      borderRadius: '8px',
                      transition: 'all 0.15s',
                      background: isActive
                        ? 'var(--theme-btn-active)'
                        : 'transparent',
                      paddingRight: '6px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'var(--bg-input)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <button
                      key={channel.id}
                      id={`channel-${channel.id}`}
                      onClick={() => handleSelectChannel(channel)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 8px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        background: 'transparent',
                        color: isActive
                          ? 'var(--theme-btn-active-text)'
                          : 'var(--text-secondary)',
                        fontWeight: isActive ? 600 : 400,
                        fontSize: '14px',
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0 }}
                      >
                        <IconHash />
                      </span>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {channel.name}
                      </span>
                    </button>
                    {isOwner && channel.name !== 'general' && (
                      <button
                        title="Channel Settings"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditChannel(channel);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color =
                            'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color =
                            'var(--text-muted)';
                        }}
                      >
                        <IconSettings />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom user bar */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1.5px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            color: 'white',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
          <span
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background:
                ownStatus === 'online'
                  ? '#22c55e'
                  : ownStatus === 'away'
                    ? '#f59e0b'
                    : '#6b7280',
              border: '2px solid var(--bg-sidebar)',
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </div>
          <div
            style={{
              fontSize: '10.5px',
              color: 'var(--text-muted)',
              textTransform: 'capitalize',
            }}
          >
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
    style={{
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '5px',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      color: danger ? 'var(--danger)' : 'var(--text-muted)',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => {
      const b = e.currentTarget as HTMLButtonElement;
      b.style.background = danger ? 'var(--danger-bg)' : 'var(--bg-input)';
      b.style.color = danger ? 'var(--danger)' : 'var(--text-primary)';
    }}
    onMouseLeave={(e) => {
      const b = e.currentTarget as HTMLButtonElement;
      b.style.background = 'transparent';
      b.style.color = danger ? 'var(--danger)' : 'var(--text-muted)';
    }}
  >
    {children}
  </button>
);
