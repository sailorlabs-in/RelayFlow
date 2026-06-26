import React, { useState, useLayoutEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { Avatar } from './Avatar';
import {
  sendFriendRequest,
  acceptFriendRequest,
  fetchFriends,
  fetchPendingRequests,
} from '../store/slices/chatSlice';
import { assignMemberRoles } from '../store/slices/groupsSlice';
import { showToast } from './toast';
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

interface MemberProfilePopoverProps {
  selectedMember: {
    id: string;
    displayName: string;
    username?: string;
    email?: string;
    avatarUrl?: string | null;
    avatarThumbnailUrl?: string | null;
    presence: 'online' | 'away' | 'dnd' | 'offline';
    role: string;
    roleIds?: string[];
    matchingRoles?: { id: string; name: string; color: string }[];
    color: string;
  };
  popoverPosition: {
    top: number;
    right?: number;
    left?: number;
  };
  onClose?: () => void;
  onUpdate?: (updatedMember: any) => void;
  groupId?: string;
}

export const MemberProfilePopover = ({
  selectedMember,
  popoverPosition,
  onClose: _onClose,
  onUpdate,
  groupId,
}: MemberProfilePopoverProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [adjustedTop, setAdjustedTop] = useState<number>(popoverPosition.top);
  const [isPositioned, setIsPositioned] = useState<boolean>(false);

  useLayoutEffect(() => {
    if (popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      const height = rect.height;
      const viewportHeight = window.innerHeight;

      let finalTop = popoverPosition.top - height / 2;

      if (finalTop < 16) {
        finalTop = 16;
      } else if (finalTop + height > viewportHeight - 16) {
        finalTop = viewportHeight - height - 16;
      }

      setAdjustedTop(finalTop);
      setIsPositioned(true);
    }
  }, [popoverPosition.top]);
  const { user: currentUser } = useAppSelector((s) => s.auth);
  const { friends, pendingRequests } = useAppSelector((s) => s.chat);
  const activeGroup = useAppSelector((s) =>
    groupId ? s.groups.groups.find((g) => g.id === groupId) : null,
  );

  const currentUserMember = activeGroup?.members?.find(
    (mem) => mem.userId === currentUser?.id,
  );
  const currentUserRole = currentUserMember?.role || 'member';

  const isOwner =
    currentUserRole === 'owner' ||
    activeGroup?.ownerId === currentUser?.id ||
    currentUser?.role === 'admin';

  const currentUserHighestPriority = isOwner
    ? 0
    : currentUserMember?.role === 'admin'
      ? 1
      : currentUserMember?.roleIds && currentUserMember.roleIds.length > 0
        ? Math.min(
            ...(currentUserMember.roleIds || []).map((id) => {
              const r = activeGroup?.roles?.find((role) => role.id === id);
              return Math.max(r?.hierarchyPriority ?? r?.priority ?? 1, 1);
            }),
          )
        : 1000000;

  const handleSendFriendRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dispatch(
        sendFriendRequest(
          selectedMember.username || selectedMember.email || '',
        ),
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

  return (
    <div
      ref={popoverRef}
      className="fixed z-9999 w-65 bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-2xl shadow-(--glass-shadow) p-4 flex flex-col gap-3 animate-fade-in pointer-events-auto text-left"
      style={{
        top: `${adjustedTop}px`,
        right:
          popoverPosition.right !== undefined
            ? `${popoverPosition.right}px`
            : undefined,
        left:
          popoverPosition.left !== undefined
            ? `${popoverPosition.left}px`
            : undefined,
        visibility: isPositioned ? 'visible' : 'hidden',
        opacity: isPositioned ? 1 : 0,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Avatar and Status */}
      <div className="flex items-center gap-3">
        <Avatar
          letter={selectedMember.displayName?.[0]?.toUpperCase() || 'U'}
          url={
            selectedMember.avatarThumbnailUrl ||
            selectedMember.avatarUrl ||
            undefined
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
          {activeGroup && selectedMember.role?.toLowerCase() === 'owner' && (
            <div className="text-[10.5px] text-theme-muted mt-0.5 capitalize">
              {selectedMember.role}
            </div>
          )}
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
        {activeGroup &&
          selectedMember.matchingRoles &&
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
      {activeGroup &&
        (currentUserRole === 'owner' ||
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
                const isAssigned = selectedMember.roleIds?.includes(role.id);
                const rolePriority = Math.max(
                  role.hierarchyPriority ?? role.priority ?? 1,
                  1,
                );
                const canInteractWithRole =
                  isOwner || currentUserHighestPriority < rolePriority;
                const isDisabled = !canInteractWithRole;

                return (
                  <button
                    key={role.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isDisabled) {
                        return;
                      }
                      const newRoleIds = isAssigned
                        ? (selectedMember.roleIds || []).filter(
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

                        const updatedMatchingRoles =
                          activeGroup.roles?.filter((r) =>
                            newRoleIds.includes(r.id),
                          ) || [];
                        const isThisOwner =
                          activeGroup.ownerId === selectedMember.id;

                        const colorSortedRoles = [...updatedMatchingRoles].sort(
                          (a, b) => {
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
                          },
                        );

                        const updated = {
                          ...selectedMember,
                          roleIds: newRoleIds,
                          matchingRoles: updatedMatchingRoles,
                          color: isThisOwner
                            ? '#eab308'
                            : colorSortedRoles[0]?.color || 'inherit',
                        };

                        if (onUpdate) {
                          onUpdate(updated);
                        }
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
                      opacity: isDisabled ? 0.5 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                    }}
                    className={`px-2 py-1 rounded-md border text-[10.5px] font-bold transition-all select-none ${isDisabled ? '' : 'hover:bg-black/10 active-press'}`}
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
  );
};
