import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { Group, GroupMember } from '../store/slices/groupsSlice';
import {
  removeGroupMember,
  assignMemberRoles,
} from '../store/slices/groupsSlice';
import {
  sendFriendRequest,
  acceptFriendRequest,
  fetchFriends,
  fetchPendingRequests,
} from '../store/slices/chatSlice';

import { Avatar } from './Avatar';
import { IconCrown, IconPeople, IconTrash, IconPlus } from './Icons';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';
import { hasGroupPermission } from '../utils/permissions';

const IconAddFriend = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-3.5 h-3.5"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="16" y1="11" x2="22" y2="11" />
  </svg>
);

interface MemberSidebarProps {
  group: Group;
  onInviteClick?: () => void;
}

type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export const MemberSidebar = ({
  group,
  onInviteClick,
}: MemberSidebarProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const {
    onlineUsers,
    typingUsers,
    activeConversationId,
    friends,
    pendingRequests,
  } = useAppSelector((s) => s.chat);
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
    right: number;
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
      setPopoverPosition({
        top: rect.top + rect.height / 2,
        right: window.innerWidth - rect.left + 8,
      });
      setSelectedMember(member);
    }
  };

  const handleSendFriendRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedMember) {
      return;
    }
    try {
      await dispatch(
        sendFriendRequest(selectedMember.username || selectedMember.email),
      ).unwrap();
      showToast.success(
        `Friend request sent to ${selectedMember.displayName || selectedMember.email}`,
      );
      dispatch(fetchPendingRequests());
    } catch (err: any) {
      showToast.error(err || 'Failed to send friend request.');
    }
  };

  const handleAcceptFriendRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedMember) {
      return;
    }
    try {
      const incomingPending = pendingRequests?.incoming || [];
      const incomingReq = incomingPending.find(
        (req) =>
          req.requesterId === selectedMember.id ||
          req.requester?.id === selectedMember.id,
      );
      if (incomingReq) {
        await dispatch(acceptFriendRequest(incomingReq.id)).unwrap();
        showToast.success(
          `Friend request from ${selectedMember.displayName} accepted!`,
        );
        dispatch(fetchFriends());
        dispatch(fetchPendingRequests());
      }
    } catch (err: any) {
      showToast.error(err || 'Failed to accept friend request.');
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
    const isOwner = activeGroup.ownerId === targetUserId;
    const isTyping = activeConversationId
      ? !!typingUsers[activeConversationId]?.[targetUserId]
      : false;
    const canKick =
      targetUserId !== currentUser?.id &&
      !isOwner &&
      (isCurrentUserOwner ||
        (m.role !== 'owner' &&
          m.role !== 'admin' &&
          (currentUserRole === 'admin' ||
            hasGroupPermission(activeGroup, currentUser?.id, 'kick_members'))));

    const memberRoleIds = m.roleIds || [];
    const groupRoles = activeGroup.roles || [];
    const matchingRoles = groupRoles.filter((r) =>
      memberRoleIds.includes(r.id),
    );
    const color = matchingRoles[0]?.color || (isOwner ? '#eab308' : 'inherit');

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
    const primaryName = m.username ? `@${m.username}` : m.displayName;
    const isSelected = selectedMember?.id === m.id;

    return (
      <div
        key={m.id}
        id={`member-row-${m.id}`}
        className={`group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 mb-1 cursor-pointer hover:bg-theme-input hover:translate-x-0.5 fade-in-list ${isSelected ? 'bg-theme-input translate-x-0.5' : ''}`}
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
                style={{ color: m.color !== 'inherit' ? m.color : undefined }}
                className={`text-[13px] font-semibold truncate ${
                  m.presence === 'offline' && m.color === 'inherit'
                    ? 'text-theme-muted'
                    : ''
                } ${m.color === 'inherit' && m.presence !== 'offline' ? 'text-theme-primary' : ''}`}
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
      <div className="glass-panel h-full flex flex-col overflow-hidden w-60 min-w-60 fixed right-0 top-0 bottom-0 z-50 md:relative bg-theme-sidebar md:bg-transparent border-l border-theme md:border-none shadow-2xl md:shadow-none p-3.5 md:p-0">
        {/* Title */}
        <div className="px-4 py-3.5 border-b-[1.5px] border-theme flex items-center justify-between text-theme-primary text-sm font-bold bg-theme-sidebar rounded-t-2xl">
          <div className="flex items-center gap-1.5">
            <IconPeople />
            <span>Group Members ({members.length})</span>
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
        <div
          className="fixed z-9999 w-65 bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-2xl shadow-(--glass-shadow) p-4 flex flex-col gap-3 animate-fade-in pointer-events-auto text-left"
          style={{
            top: `${popoverPosition.top}px`,
            right: `${popoverPosition.right}px`,
            transform: 'translateY(-50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Avatar and Status */}
          <div className="flex items-center gap-3">
            <Avatar
              letter={selectedMember.displayName[0].toUpperCase()}
              url={
                selectedMember.avatarThumbnailUrl || selectedMember.avatarUrl
              }
              status={selectedMember.presence}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h3
                className="m-0 text-[14px] font-bold text-theme-primary truncate"
                style={{
                  color:
                    selectedMember.color !== 'inherit'
                      ? selectedMember.color
                      : undefined,
                }}
              >
                {selectedMember.displayName}
              </h3>
              <div className="text-[10.5px] text-theme-muted mt-0.5 capitalize">
                {selectedMember.role}
              </div>
            </div>
          </div>

          <hr className="m-0 border-none h-px bg-(--border-muted)" />

          {/* Details */}
          <div className="flex flex-col gap-2.5 text-[12px]">
            <div>
              <span className="text-theme-muted font-bold block mb-0.5 uppercase tracking-wide text-[9.5px]">
                Username
              </span>
              <span className="text-theme-secondary font-medium font-mono">
                {selectedMember.username ? `@${selectedMember.username}` : '@-'}
              </span>
            </div>
            <div>
              <span className="text-theme-muted font-bold block mb-0.5 uppercase tracking-wide text-[9.5px]">
                Email Address
              </span>
              <span className="text-theme-secondary font-medium break-all">
                {selectedMember.email || 'No email shared'}
              </span>
            </div>
            <div>
              <span className="text-theme-muted font-bold block mb-0.5 uppercase tracking-wide text-[9.5px]">
                Presence Status
              </span>
              <span className="text-theme-secondary font-medium flex items-center gap-1.5 capitalize">
                <span
                  className="w-2 h-2 rounded-full inline-block animate-pulse"
                  style={{
                    backgroundColor:
                      selectedMember.presence === 'online'
                        ? '#10b981'
                        : selectedMember.presence === 'away'
                          ? '#f59e0b'
                          : selectedMember.presence === 'dnd'
                            ? '#ef4444'
                            : '#6b7280',
                  }}
                />
                {selectedMember.presence === 'dnd'
                  ? 'Do Not Disturb'
                  : selectedMember.presence}
              </span>
            </div>

            {/* Display Member matching roles */}
            {selectedMember.matchingRoles &&
              selectedMember.matchingRoles.length > 0 && (
                <div>
                  <span className="text-theme-muted font-bold block mb-1 uppercase tracking-wide text-[9.5px]">
                    Roles
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedMember.matchingRoles.map((role: any) => (
                      <span
                        key={role.id}
                        style={{
                          backgroundColor: `${role.color}15`,
                          color: role.color,
                          borderColor: `${role.color}30`,
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-sm border font-bold"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Roles Assignment (For Owner/Admin) */}
          {(currentUserRole === 'owner' ||
            currentUserRole === 'admin' ||
            hasGroupPermission(activeGroup, currentUser?.id, 'manage_roles')) &&
            activeGroup.roles &&
            activeGroup.roles.length > 0 && (
              <div className="flex flex-col gap-1.5 text-[12px] mt-1 border-t border-theme pt-2.5">
                <span className="text-theme-muted font-bold block mb-1 uppercase tracking-wide text-[9.5px]">
                  Assign Roles
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-25 overflow-y-auto pr-1">
                  {activeGroup.roles.map((role) => {
                    const isAssigned = selectedMember.roleIds?.includes(
                      role.id,
                    );
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newRoleIds = isAssigned
                            ? selectedMember.roleIds.filter(
                                (id: string) => id !== role.id,
                              )
                            : [...(selectedMember.roleIds || []), role.id];
                          try {
                            await dispatch(
                              assignMemberRoles({
                                groupId: activeGroup.id,
                                userId: selectedMember.id,
                                roleIds: newRoleIds,
                              }),
                            ).unwrap();

                            // Update the selected member state
                            setSelectedMember({
                              ...selectedMember,
                              roleIds: newRoleIds,
                              matchingRoles: activeGroup.roles.filter((r) =>
                                newRoleIds.includes(r.id),
                              ),
                              color:
                                activeGroup.roles.filter((r) =>
                                  newRoleIds.includes(r.id),
                                )[0]?.color || 'inherit',
                            });
                            showToast.success('Member roles updated!');
                          } catch (err: any) {
                            showToast.error(err || 'Failed to assign role.');
                          }
                        }}
                        style={{
                          borderColor: role.color,
                          backgroundColor: isAssigned
                            ? `${role.color}15`
                            : 'transparent',
                          color: role.color,
                        }}
                        className="px-2 py-1 rounded-md border text-[10.5px] font-bold cursor-pointer hover:bg-black/10 transition-all select-none active-press"
                      >
                        {isAssigned ? '✓ ' : ''}
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Friendship Actions */}
          {selectedMember.id !== currentUser?.id && (
            <div className="mt-1 flex flex-col gap-2 border-t border-theme pt-2.5">
              {friends?.some((f) => f.id === selectedMember.id) ? (
                <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-emerald-500 bg-[rgba(16,185,129,0.08)] border border-emerald-500/20">
                  <span>✓ Friends</span>
                </div>
              ) : (pendingRequests?.outgoing || []).some(
                  (req) =>
                    req.addresseeId === selectedMember.id ||
                    req.addressee?.id === selectedMember.id,
                ) ? (
                <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-amber-500 bg-[rgba(245,158,11,0.08)] border border-amber-500/20">
                  <span>Pending Request</span>
                </div>
              ) : (pendingRequests?.incoming || []).some(
                  (req) =>
                    req.requesterId === selectedMember.id ||
                    req.requester?.id === selectedMember.id,
                ) ? (
                <button
                  type="button"
                  onClick={handleAcceptFriendRequest}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all duration-150 border-none bg-emerald-500 hover:bg-emerald-600 text-white active-press"
                >
                  Accept Request
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendFriendRequest}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all duration-150 border-none bg-(--accent-primary) hover:opacity-95 text-white active-press flex items-center justify-center gap-1.5"
                >
                  <IconAddFriend />
                  <span>Add Friend</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
