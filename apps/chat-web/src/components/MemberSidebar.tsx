import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { Group, GroupMember } from '../store/slices/groupsSlice';
import { removeGroupMember } from '../store/slices/groupsSlice';

import { Avatar } from './Avatar';
import { IconCrown, IconPeople, IconTrash } from './Icons';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';

interface MemberSidebarProps {
  group: Group;
}

type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export const MemberSidebar = ({
  group,
}: MemberSidebarProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { onlineUsers, typingUsers, activeConversationId } = useAppSelector(
    (s) => s.chat,
  );
  const { user: currentUser } = useAppSelector((s) => s.auth);

  const [activeTab, setActiveTab] = useState<PresenceStatus>('online');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const [hoveredMember, setHoveredMember] = useState<any | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    member: any,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPosition({
      top: rect.top + rect.height / 2,
      right: window.innerWidth - rect.left + 8,
    });
    setHoveredMember(member);
  };

  const handleMouseLeave = () => {
    setHoveredMember(null);
  };

  // Group members into online, away, dnd, and offline
  const members = Array.isArray(group.members) ? group.members : [];
  const currentUserMember = members.find(
    (mem) => mem.userId === currentUser?.id,
  );
  const currentUserRole = currentUserMember?.role || 'member';
  const isCurrentUserOwner = group.ownerId === currentUser?.id;

  const getMemberDetails = (m: GroupMember) => {
    const userDetail = m.user;
    const displayName =
      userDetail?.displayName || userDetail?.email?.split('@')[0] || 'User';
    const email = userDetail?.email || '';
    const username = userDetail?.username || '';
    const presence =
      m.userId === currentUser?.id
        ? (currentUser?.status as PresenceStatus) || 'online'
        : (onlineUsers[m.userId] as PresenceStatus) || 'offline';
    const isOwner = group.ownerId === m.userId;
    const isTyping = activeConversationId
      ? !!typingUsers[activeConversationId]?.[m.userId]
      : false;
    const canKick =
      m.userId !== currentUser?.id &&
      !isOwner &&
      (isCurrentUserOwner ||
        (currentUserRole === 'admin' && m.role === 'member'));

    return {
      id: m.userId,
      displayName,
      email,
      username,
      presence,
      isOwner,
      isTyping,
      role: m.role,
      canKick,
    };
  };

  const membersWithDetails = members.map((m) => getMemberDetails(m));

  const onlineMembers = membersWithDetails.filter(
    (m) => m.presence === 'online',
  );
  const awayMembers = membersWithDetails.filter((m) => m.presence === 'away');
  const dndMembers = membersWithDetails.filter((m) => m.presence === 'dnd');
  const offlineMembers = membersWithDetails.filter(
    (m) => m.presence === 'offline',
  );

  const getTabMembers = () => {
    switch (activeTab) {
      case 'online':
        return onlineMembers;
      case 'away':
        return awayMembers;
      case 'dnd':
        return dndMembers;
      case 'offline':
        return offlineMembers;
      default:
        return [];
    }
  };

  const currentTabMembers = getTabMembers();

  const handleKickMember = (m: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kick Member',
      message: `Are you sure you want to kick "${m.displayName}" from the group?`,
      confirmLabel: 'Kick',
      type: 'danger',
      onConfirm: async () => {
        try {
          await dispatch(
            removeGroupMember({ groupId: group.id, userId: m.id }),
          ).unwrap();
          showToast.success(`Kicked "${m.displayName}" from the group.`);
        } catch (err: any) {
          showToast.error(err || 'Failed to kick member.');
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const renderMemberRow = (m: any) => {
    const primaryName = m.username ? `@${m.username}` : m.displayName;

    return (
      <div
        key={m.id}
        id={`member-row-${m.id}`}
        className="group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 mb-1 cursor-default hover:bg-[var(--bg-input)] hover:translate-x-0.5 fade-in-list"
        onMouseEnter={(e) => handleMouseEnter(e, m)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Avatar
            letter={m.displayName[0].toUpperCase()}
            status={m.presence}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span
                className={`text-[13px] font-medium truncate ${m.presence === 'offline' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}
              >
                {primaryName}
              </span>
              {m.isOwner && (
                <span
                  className="text-[#eab308] flex shrink-0"
                  title="Group Owner"
                >
                  <IconCrown />
                </span>
              )}
            </div>
            {m.isTyping ? (
              <div className="text-[10px] text-[var(--accent-secondary)] font-medium">
                typing...
              </div>
            ) : m.role !== 'member' ? (
              <div className="text-[10px] text-[var(--text-muted)] capitalize">
                {m.role}
              </div>
            ) : null}
          </div>
        </div>
        {m.canKick && (
          <button
            onClick={() => handleKickMember(m)}
            className="member-kick-btn flex items-center justify-center p-1 rounded-lg border-none cursor-pointer bg-transparent text-[var(--danger)] hover:bg-[var(--danger-bg)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 active-press focus:opacity-100 focus:outline-none"
            title={`Kick ${m.displayName}`}
            onMouseEnter={(e) => e.stopPropagation()}
          >
            <IconTrash />
          </button>
        )}
      </div>
    );
  };

  const tabOptions: {
    id: PresenceStatus;
    label: string;
    count: number;
    color: string;
  }[] = [
    {
      id: 'online',
      label: 'Online',
      count: onlineMembers.length,
      color: '#10b981',
    },
    { id: 'away', label: 'Away', count: awayMembers.length, color: '#f59e0b' },
    { id: 'dnd', label: 'DND', count: dndMembers.length, color: '#ef4444' },
    {
      id: 'offline',
      label: 'Offline',
      count: offlineMembers.length,
      color: '#6b7280',
    },
  ];

  return (
    <>
      <div className="glass-panel w-[240px] min-w-[240px] h-full flex flex-col overflow-hidden">
        {/* Title */}
        <div className="px-4 py-3.5 border-b-[1.5px] border-[var(--border-muted)] flex items-center gap-1.5 text-[var(--text-primary)] text-sm font-bold bg-[var(--bg-sidebar)] rounded-t-2xl">
          <IconPeople />
          <span>Group Members ({members.length})</span>
        </div>

        {/* Tabs Selector UI - Rounded like other switcher */}
        <div className="px-3 pt-2.5 pb-1.5 bg-[rgba(0,0,0,0.01)]">
          <div className="grid grid-cols-4 gap-0.5 bg-[var(--theme-btn)] rounded-xl p-0.5 border border-[var(--glass-border)]">
            {tabOptions.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`member-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-0 rounded-[9px] py-1.5 px-0.5 text-[11px] font-semibold cursor-pointer flex flex-col items-center justify-center transition-all duration-150 outline-none active-press ${isActive ? 'bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)]' : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)]'}`}
                >
                  <span className="text-[10px] capitalize">{tab.label}</span>
                  <span className="text-[9px] opacity-80 mt-0.5">
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Member Lists Content */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {currentTabMembers.length > 0 ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] pl-2 mb-2 flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{
                    backgroundColor: tabOptions.find((t) => t.id === activeTab)
                      ?.color,
                  }}
                />
                {activeTab === 'dnd' ? 'Do Not Disturb' : activeTab} —{' '}
                {currentTabMembers.length}
              </div>
              {currentTabMembers.map(renderMemberRow)}
            </div>
          ) : (
            <div className="py-6 px-4 text-center text-[var(--text-muted)] text-xs italic">
              No members are {activeTab}
            </div>
          )}
        </div>
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

      {hoveredMember && popoverPosition && (
        <div
          className="fixed z-[9999] w-[260px] bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[16px] shadow-[var(--glass-shadow)] p-4 flex flex-col gap-3 animate-fade-in pointer-events-none text-left"
          style={{
            top: `${popoverPosition.top}px`,
            right: `${popoverPosition.right}px`,
            transform: 'translateY(-50%)',
          }}
        >
          {/* Header with Avatar and Status */}
          <div className="flex items-center gap-3">
            <Avatar
              letter={hoveredMember.displayName[0].toUpperCase()}
              status={hoveredMember.presence}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h3 className="m-0 text-[14px] font-bold text-[var(--text-primary)] truncate">
                {hoveredMember.displayName}
              </h3>
              <div className="text-[10.5px] text-[var(--text-muted)] mt-0.5 capitalize">
                {hoveredMember.role}
              </div>
            </div>
          </div>

          <hr className="m-0 border-none h-[1px] bg-[var(--border-muted)]" />

          {/* Details */}
          <div className="flex flex-col gap-2.5 text-[12px]">
            <div>
              <span className="text-[var(--text-muted)] font-bold block mb-0.5 uppercase tracking-wide text-[9.5px]">
                Username
              </span>
              <span className="text-[var(--text-secondary)] font-medium font-mono">
                {hoveredMember.username ? `@${hoveredMember.username}` : '@-'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-bold block mb-0.5 uppercase tracking-wide text-[9.5px]">
                Email Address
              </span>
              <span className="text-[var(--text-secondary)] font-medium break-all">
                {hoveredMember.email || 'No email shared'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-bold block mb-0.5 uppercase tracking-wide text-[9.5px]">
                Presence Status
              </span>
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5 capitalize">
                <span
                  className="w-2 h-2 rounded-full inline-block animate-pulse"
                  style={{
                    backgroundColor:
                      hoveredMember.presence === 'online'
                        ? '#10b981'
                        : hoveredMember.presence === 'away'
                          ? '#f59e0b'
                          : hoveredMember.presence === 'dnd'
                            ? '#ef4444'
                            : '#6b7280',
                  }}
                />
                {hoveredMember.presence === 'dnd'
                  ? 'Do Not Disturb'
                  : hoveredMember.presence}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
