import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { Group, GroupMember } from '../store/slices/groupsSlice';
import { removeGroupMember } from '../store/slices/groupsSlice';

import { Avatar } from './Avatar';
import { IconCrown, IconPeople, IconTrash, IconPlus } from './Icons';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';
import { hasGroupPermission } from '../utils/permissions';
import { MemberProfilePopover } from './MemberProfilePopover';

interface MemberSidebarProps {
  group: Group;
  onInviteClick?: () => void;
  isOpen: boolean;
}

type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export const MemberSidebar = ({
  group,
  onInviteClick,
  isOpen,
}: MemberSidebarProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { onlineUsers, typingUsers, activeConversationId } = useAppSelector(
    (s) => s.chat,
  );
  const { user: currentUser } = useAppSelector((s) => s.auth);

  // Get active group from redux to keep state in sync
  const activeGroup =
    useAppSelector((s) => s.groups.groups.find((g) => g.id === group.id)) ||
    group;

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

  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    right?: number;
    left?: number;
  } | null>(null);

  const handleMemberClick = (
    e: React.MouseEvent<HTMLDivElement>,
    member: any,
  ) => {
    e.stopPropagation();
    if (selectedMember?.id === member.id) {
      setSelectedMember(null);
      setPopoverPosition(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const popoverWidth = 260; // w-65 is 260px
      const fitsOnLeft = rect.left - 8 - popoverWidth >= 16;
      if (fitsOnLeft) {
        setPopoverPosition({
          top: rect.top + rect.height / 2,
          right: window.innerWidth - rect.left + 8,
        });
      } else {
        setPopoverPosition({
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
        });
      }
      setSelectedMember(member);
    }
  };

  // Group members into online, away, dnd, and offline
  const members = Array.isArray(activeGroup.members) ? activeGroup.members : [];
  const currentUserMember = members.find(
    (mem) => mem.userId === currentUser?.id,
  );
  const currentUserRole = currentUserMember?.role || 'member';
  const isCurrentUserOwner = activeGroup.ownerId === currentUser?.id;
  const canInvite =
    isCurrentUserOwner ||
    currentUserRole === 'admin' ||
    hasGroupPermission(activeGroup, currentUser?.id, 'invite_members');

  const getMemberDetails = (m: GroupMember) => {
    const userDetail = m.user;
    const displayName =
      userDetail?.displayName || userDetail?.email?.split('@')[0] || 'User';
    const email = userDetail?.email || '';
    const username = userDetail?.username || '';
    const targetUserId = userDetail?.id || m.userId;
    const presence =
      targetUserId === currentUser?.id
        ? (currentUser?.status as PresenceStatus) || 'online'
        : (onlineUsers[targetUserId] as PresenceStatus) || 'offline';
    const targetIsPlatformAdmin = userDetail?.role === 'admin';
    const currentUserIsPlatformAdmin = currentUser?.role === 'admin';
    const isOwner = m.role === 'owner' || activeGroup.ownerId === targetUserId;
    const isTyping = activeConversationId
      ? !!typingUsers[activeConversationId]?.[targetUserId]
      : false;
    const canKick =
      targetUserId !== currentUser?.id &&
      (!targetIsPlatformAdmin || currentUserIsPlatformAdmin) &&
      (currentUserIsPlatformAdmin ||
        (!isOwner &&
          (isCurrentUserOwner ||
            (m.role !== 'owner' &&
              m.role !== 'admin' &&
              (currentUserRole === 'admin' ||
                hasGroupPermission(
                  activeGroup,
                  currentUser?.id,
                  'kick_members',
                ))))));

    const memberRoleIds = m.roleIds || [];
    const groupRoles = activeGroup.roles || [];
    const matchingRoles = [...groupRoles]
      .filter((r) => memberRoleIds.includes(r.id))
      .sort((a, b) => {
        const hpA = a.hierarchyPriority ?? a.priority ?? 1000000;
        const hpB = b.hierarchyPriority ?? b.priority ?? 1000000;
        if (hpA !== hpB) {
          return hpA - hpB;
        }
        const cpA = a.colorPriority ?? 0;
        const cpB = b.colorPriority ?? 0;
        if (cpA !== cpB) {
          if (cpA <= 0) {
            return 1;
          }
          if (cpB <= 0) {
            return -1;
          }
          return cpA - cpB;
        }
        return a.createdAt.localeCompare(b.createdAt);
      });

    const colorRoles = [...matchingRoles].sort((a, b) => {
      const cpA = a.colorPriority ?? 0;
      const cpB = b.colorPriority ?? 0;
      if (cpA !== cpB) {
        if (cpA <= 0) {
          return 1;
        }
        if (cpB <= 0) {
          return -1;
        }
        return cpA - cpB;
      }
      return 0;
    });

    // Owner color always wins over any role color
    const color = isOwner ? '#eab308' : colorRoles[0]?.color || 'inherit';

    return {
      id: targetUserId,
      displayName,
      email,
      username,
      avatarUrl: userDetail?.avatarUrl,
      avatarThumbnailUrl: userDetail?.avatarThumbnailUrl,
      presence,
      isOwner,
      isTyping,
      role: m.role,
      roleIds: memberRoleIds,
      matchingRoles,
      color,
      canKick,
      isGhost: m.isGhost,
    };
  };

  const visibleMembers = members.filter((m) => !m.isGhost);
  const membersWithDetails = visibleMembers.map((m) => getMemberDetails(m));

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
            removeGroupMember({ groupId: activeGroup.id, userId: m.id }),
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
    const primaryName = m.username ? m.username : m.displayName;
    const isSelected = selectedMember?.id === m.id;

    return (
      <div
        key={m.id}
        id={`member-row-${m.id}`}
        className={`group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 mb-1 cursor-pointer hover:bg-theme-input hover:translate-x-0.5 fade-in-list ${isSelected ? 'bg-theme-input translate-x-0.5' : ''}`}
        style={m.isGhost ? { opacity: 0.45 } : undefined}
        onClick={(e) => handleMemberClick(e, m)}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Avatar
            letter={m.displayName[0].toUpperCase()}
            url={m.avatarThumbnailUrl || m.avatarUrl}
            status={m.presence}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span
                className={`text-[13px] font-semibold truncate ${m.color === 'inherit' ? (m.presence !== 'offline' ? 'text-theme-primary' : '') : ''}`}
                style={{
                  color:
                    m.color !== 'inherit'
                      ? m.color
                      : m.presence === 'offline'
                        ? '#6b7280'
                        : undefined,
                }}
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
              <div className="text-[10px] text-(--accent-secondary) font-medium animate-pulse">
                typing...
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {m.role !== 'member' && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 text-theme-muted capitalize font-bold">
                    {m.role}
                  </span>
                )}
                {m.matchingRoles &&
                  m.matchingRoles.map((role: any) => (
                    <span
                      key={role.id}
                      style={{
                        backgroundColor: `${role.color}15`,
                        color: role.color,
                        borderColor: `${role.color}35`,
                      }}
                      className="text-[9px] px-1 py-0.2 rounded border font-bold"
                    >
                      {role.name}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
        {m.canKick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleKickMember(m);
            }}
            className="member-kick-btn flex items-center justify-center p-1 rounded-lg border-none cursor-pointer bg-transparent text-(--danger) hover:bg-(--danger-bg) opacity-0 group-hover:opacity-100 transition-opacity duration-150 active-press focus:opacity-100 focus:outline-none"
            title={`Kick ${m.displayName}`}
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
      <div
        className={`glass-panel h-full flex flex-col overflow-hidden select-none transition-all duration-300 ease-in-out
          fixed right-0 top-0 bottom-0 z-50 bg-theme-sidebar shadow-2xl p-3.5
          md:relative md:right-auto md:top-auto md:bottom-auto md:z-auto md:bg-transparent md:shadow-none md:p-0
          ${
            isOpen
              ? 'translate-x-0 opacity-100 w-60 min-w-60 border-[1.5px]'
              : 'translate-x-full opacity-0 pointer-events-none w-0 min-w-0 md:translate-x-0 border-0'
          }`}
      >
        {/* Title */}
        <div className="px-4 py-3.5 border-b-[1.5px] border-theme flex items-center justify-between text-theme-primary text-sm font-bold bg-theme-sidebar rounded-t-2xl">
          <div className="flex items-center gap-1.5">
            <IconPeople />
            <span>Group Members ({visibleMembers.length})</span>
          </div>
          {onInviteClick && canInvite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInviteClick();
              }}
              className="flex items-center justify-center p-1 rounded-lg border-none cursor-pointer bg-transparent text-theme-muted hover:bg-(--theme-btn-hover) hover:text-theme-primary transition-all duration-150 active-press focus:outline-none"
              title="Invite Members"
            >
              <IconPlus size={15} />
            </button>
          )}
        </div>

        {/* Tabs Selector UI - Rounded like other switcher */}
        <div className="px-3 pt-2.5 pb-1.5 bg-[rgba(0,0,0,0.01)]">
          <div className="grid grid-cols-4 gap-0.5 bg-(--theme-btn) rounded-xl p-0.5 border border-glass">
            {tabOptions.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`member-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-0 rounded-[9px] py-1.5 px-0.5 text-[11px] font-semibold cursor-pointer flex flex-col items-center justify-center transition-all duration-150 outline-none active-press ${isActive ? 'bg-(--theme-btn-active) text-(--theme-btn-active-text)' : 'bg-transparent text-theme-muted hover:bg-(--theme-btn-hover)'}`}
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-theme-muted pl-2 mb-2 flex items-center gap-1.5">
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
            <div className="py-6 px-4 text-center text-theme-muted text-xs italic">
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

      {selectedMember && (
        <div
          className="fixed inset-0 z-9998 bg-transparent cursor-default"
          onClick={() => {
            setSelectedMember(null);
            setPopoverPosition(null);
          }}
        />
      )}

      {selectedMember && popoverPosition && (
        <MemberProfilePopover
          selectedMember={selectedMember}
          popoverPosition={popoverPosition}
          onClose={() => {
            setSelectedMember(null);
            setPopoverPosition(null);
          }}
          onUpdate={(updated) => {
            setSelectedMember(updated);
          }}
          groupId={activeGroup.id}
        />
      )}
    </>
  );
};
