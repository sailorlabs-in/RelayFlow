import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import {
  setActiveGroup,
  updateGroupNotificationPref,
  removeGroupMember,
  deleteGroup,
} from '../store/slices/groupsSlice';
import { updateUserProfile } from '../store/slices/authSlice';

import {
  IconPlus,
  IconBell,
  IconBellOff,
  IconLogout,
  IconTrash,
} from './Icons';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';

interface GroupRailProps {
  onCreateGroup: () => void;
  onShowDMs: () => void;
  onSelectGroup: (groupId: string) => void;
  isDMMode: boolean;
  isCollapsed: boolean;
}

export const GroupRail = ({
  onCreateGroup,
  onShowDMs,
  onSelectGroup,
  isDMMode,
  isCollapsed,
}: GroupRailProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const {
    groups: rawGroups,
    activeGroupId,
    activeChannelId,
  } = useAppSelector((s) => s.groups);
  const groups = Array.isArray(rawGroups) ? rawGroups : [];
  const { conversations, messages, activeConversationId } = useAppSelector(
    (s) => s.chat,
  );

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    groupId: string;
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  const handleGroupContextMenu = (e: React.MouseEvent, groupId: string) => {
    e.preventDefault();
    const menuWidth = 160;
    const menuHeight = 100;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8;
    }

    setContextMenu({ x, y, groupId });
  };

  const handleUpdateGroupNotificationPref = async (
    groupId: string,
    notificationPref: 'all' | 'mention' | 'none',
  ) => {
    if (!user) {
      return;
    }
    try {
      await dispatch(
        updateGroupNotificationPref({
          groupId,
          userId: user.id,
          notificationPref,
        }),
      ).unwrap();
      const prefLabels = {
        all: 'All Messages',
        mention: 'Only Mentions',
        none: 'Server Muted',
      };
      showToast.success(
        `Notification preference updated to: ${prefLabels[notificationPref]}`,
      );
    } catch (err: any) {
      showToast.error(err || 'Failed to update notification setting.');
    }
  };

  const handleLeaveGroupAction = (groupId: string, groupName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Leave Group',
      message: `Are you sure you want to leave the group "${groupName}"? You will lose access to all its channels.`,
      confirmLabel: 'Leave',
      type: 'danger',
      onConfirm: async () => {
        try {
          if (user) {
            await dispatch(
              removeGroupMember({
                groupId,
                userId: user.id,
              }),
            ).unwrap();
            showToast.success(`You have left the group "${groupName}".`);
          }
        } catch {
          showToast.error('Failed to leave group.');
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const handleDeleteGroupAction = (groupId: string, groupName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Group',
      message: `Are you sure you want to delete "${groupName}" and all its channels? This action is permanent and cannot be undone.`,
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          await dispatch(deleteGroup(groupId)).unwrap();
          showToast.success(`Group "${groupName}" deleted.`);
        } catch {
          showToast.error('Failed to delete group.');
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const targetGroup = contextMenu
    ? groups.find((g) => g.id === contextMenu.groupId)
    : null;
  const isTargetOwner = targetGroup?.ownerId === user?.id;
  const targetMember = targetGroup?.members?.find((m) => m.userId === user?.id);
  const isTargetMuted = !!targetMember?.isMuted;
  const targetNotificationPref =
    targetMember?.notificationPref || (isTargetMuted ? 'none' : 'all');

  // Compute if any DM conversation has an unread message
  const dmHasUnread = React.useMemo(() => {
    return conversations.some((convo) => {
      // If we are currently in DM mode and this conversation is active, it's not unread
      if (isDMMode && convo.id === activeConversationId) {
        return false;
      }
      const convoMsgs = messages[convo.id] || [];
      const lastMsg = convoMsgs[convoMsgs.length - 1] ?? convo.lastMessage;
      return lastMsg && lastMsg.senderId !== user?.id && !lastMsg.isRead;
    });
  }, [conversations, messages, isDMMode, activeConversationId, user?.id]);

  const [tooltip, setTooltip] = useState<{ text: string; id: string } | null>(
    null,
  );

  // Reordering local state
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load custom order from user profile OR localStorage fallback
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

  // Sort groups based on groupOrder
  const orderedGroups = React.useMemo(() => {
    if (!groups.length) {
      return [];
    }
    if (!groupOrder.length) {
      return groups;
    }

    const orderMap = new Map<string, number>();
    groupOrder.forEach((id, idx) => orderMap.set(id, idx));

    return [...groups].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
      return indexA - indexB;
    });
  }, [groups, groupOrder]);

  const handleSelectGroup = (groupId: string) => {
    dispatch(setActiveGroup(groupId));
    onSelectGroup(groupId);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = Array.from(orderedGroups);
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const newOrderIds = reordered.map((g) => g.id);
    const orderStr = JSON.stringify(newOrderIds);
    setGroupOrder(newOrderIds);
    if (user?.id) {
      localStorage.setItem(`relayflow_group_order_${user.id}`, orderStr);
      dispatch(updateUserProfile({ groupOrder: orderStr }));
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Completely hidden — parent renders toggle in sidebar header
  if (isCollapsed) {
    return null as unknown as React.JSX.Element;
  }

  return (
    <div className="group-rail w-17 min-w-17 h-full flex flex-col items-center py-2.5 gap-1.5 bg-(--bg-rail) rounded-[14px] relative overflow-hidden">
      {/* DMs Button */}
      <RailButton
        id="rail-dm-btn"
        isActive={isDMMode}
        hasUnread={dmHasUnread}
        tooltip="Direct Messages"
        onClick={onShowDMs}
        tooltip_state={tooltip}
        setTooltip={setTooltip}
      >
        <img
          src="/logo.png"
          alt="Direct Messages"
          className="w-full h-full object-cover rounded-[inherit]"
        />
      </RailButton>

      {/* Divider */}
      <div className="w-8 h-0.5 rounded-[1px] bg-(--border-muted) my-0.5 shrink-0" />

      {/* Scrollable Groups Container */}
      <div className="flex-1 w-full flex flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden pr-0 mr-0 custom-scrollbar select-none">
        {/* Group Buttons */}
        {orderedGroups.map((group, index) => {
          const isActive = group.id === activeGroupId && !isDMMode;
          const isDragOver = dragOverIndex === index;
          const isDragged = draggedIndex === index;

          const groupHasUnread = group.channels?.some((channel) => {
            if (
              group.id === activeGroupId &&
              channel.id === activeChannelId &&
              !isDMMode
            ) {
              return false;
            }
            const channelMsgs = messages[channel.id] || [];
            const lastMsg = channelMsgs[channelMsgs.length - 1];
            return lastMsg && lastMsg.senderId !== user?.id && !lastMsg.isRead;
          });

          return (
            <div
              key={group.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`w-full flex justify-center transition-all duration-150 cursor-grab active:cursor-grabbing
                ${isDragOver ? 'border-t-2 border-(--accent-primary) pt-1.5' : ''}
                ${isDragged ? 'opacity-40 scale-95' : ''}`}
            >
              <RailButton
                id={`rail-group-${group.id}`}
                isActive={isActive}
                hasUnread={groupHasUnread}
                tooltip={group.name}
                onClick={() => handleSelectGroup(group.id)}
                onContextMenu={(e) => handleGroupContextMenu(e, group.id)}
                tooltip_state={tooltip}
                setTooltip={setTooltip}
              >
                {group.avatarThumbnailUrl || group.avatarUrl ? (
                  <img
                    src={group.avatarThumbnailUrl || group.avatarUrl}
                    alt={group.name}
                    className="w-full h-full object-cover rounded-[inherit]"
                  />
                ) : (
                  <span
                    className={`text-[17px] font-bold leading-none tracking-[-0.5px] ${isActive ? 'text-white' : 'text-theme-primary'}`}
                  >
                    {group.iconLetter}
                  </span>
                )}
              </RailButton>
            </div>
          );
        })}

        {/* Add Group Button */}
        <RailButton
          id="rail-create-group-btn"
          isActive={false}
          tooltip="Create a Group"
          onClick={onCreateGroup}
          tooltip_state={tooltip}
          setTooltip={setTooltip}
          isCreate
        >
          <IconPlus size={20} />
        </RailButton>
      </div>

      {contextMenu && targetGroup && (
        <div
          className="fixed z-9999 bg-theme-sidebar border-[1.5px] border-glass backdrop-blur-[20px] rounded-xl shadow-(--glass-shadow) py-1.5 min-w-[170px] animate-fade-in"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-wider text-theme-muted border-b border-theme/10 mb-1">
            Server Notifications
          </div>
          <button
            onClick={() => {
              handleUpdateGroupNotificationPref(targetGroup.id, 'all');
              setContextMenu(null);
            }}
            className={`w-full text-left bg-transparent border-0 py-2 px-3 text-xs font-semibold hover:bg-theme-input cursor-pointer transition-colors duration-150 flex items-center justify-between
              ${targetNotificationPref === 'all' ? 'text-(--accent-primary)' : 'text-theme-primary'}`}
          >
            <div className="flex items-center gap-2">
              <IconBell />
              <span>All Messages</span>
            </div>
            {targetNotificationPref === 'all' && (
              <span className="text-xs">✓</span>
            )}
          </button>
          <button
            onClick={() => {
              handleUpdateGroupNotificationPref(targetGroup.id, 'mention');
              setContextMenu(null);
            }}
            className={`w-full text-left bg-transparent border-0 py-2 px-3 text-xs font-semibold hover:bg-theme-input cursor-pointer transition-colors duration-150 flex items-center justify-between
              ${targetNotificationPref === 'mention' ? 'text-(--accent-primary)' : 'text-theme-primary'}`}
          >
            <div className="flex items-center gap-2">
              <IconBellOff />
              <span>Only Mentions</span>
            </div>
            {targetNotificationPref === 'mention' && (
              <span className="text-xs">✓</span>
            )}
          </button>
          <button
            onClick={() => {
              handleUpdateGroupNotificationPref(targetGroup.id, 'none');
              setContextMenu(null);
            }}
            className={`w-full text-left bg-transparent border-0 py-2 px-3 text-xs font-semibold hover:bg-theme-input cursor-pointer transition-colors duration-150 flex items-center justify-between
              ${targetNotificationPref === 'none' ? 'text-(--accent-primary)' : 'text-theme-primary'}`}
          >
            <div className="flex items-center gap-2">
              <IconBellOff />
              <span>Mute Server</span>
            </div>
            {targetNotificationPref === 'none' && (
              <span className="text-xs">✓</span>
            )}
          </button>

          <div className="h-px bg-theme/10 my-1.5" />

          {isTargetOwner ? (
            <button
              onClick={() => {
                handleDeleteGroupAction(targetGroup.id, targetGroup.name);
                setContextMenu(null);
              }}
              className="w-full text-left bg-transparent border-0 py-2 px-3 text-xs font-semibold text-(--danger) hover:bg-(--danger-bg) cursor-pointer transition-colors duration-150 flex items-center gap-2"
            >
              <IconTrash />
              <span>Delete Group</span>
            </button>
          ) : (
            <button
              onClick={() => {
                handleLeaveGroupAction(targetGroup.id, targetGroup.name);
                setContextMenu(null);
              }}
              className="w-full text-left bg-transparent border-0 py-2 px-3 text-xs font-semibold text-(--danger) hover:bg-(--danger-bg) cursor-pointer transition-colors duration-150 flex items-center gap-2"
            >
              <IconLogout />
              <span>Leave Group</span>
            </button>
          )}
        </div>
      )}

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

// ── Rail Button ──────────────────────────────────────────────────────────────
interface RailButtonProps {
  id: string;
  isActive: boolean;
  isCreate?: boolean;
  hasUnread?: boolean;
  tooltip: string;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  tooltip_state: { text: string; id: string } | null;
  setTooltip: (t: { text: string; id: string } | null) => void;
}

const RailButton = ({
  id,
  isActive,
  isCreate,
  hasUnread,
  tooltip,
  onClick,
  onContextMenu,
  children,
  tooltip_state,
  setTooltip,
}: RailButtonProps): React.JSX.Element => {
  const showTooltip = tooltip_state?.id === id;

  return (
    <div className="relative shrink-0 flex items-center">
      {/* Discord-style left indicator pill */}
      <span
        className={`absolute -left-2.75 w-1 rounded-r bg-(--accent-primary) transition-all duration-200 ease-in-out origin-left
          ${isActive ? 'h-6 top-2.5' : hasUnread ? 'h-2 top-[19px] opacity-100' : showTooltip ? 'h-3 top-[16.5px] opacity-70' : 'h-0 top-5.75 opacity-0'}`}
      />

      <button
        id={id}
        onClick={onClick}
        onContextMenu={onContextMenu}
        title={tooltip}
        onMouseEnter={() => setTooltip({ text: tooltip, id })}
        onMouseLeave={() => setTooltip(null)}
        className={`w-11.5 h-11.5 flex items-center justify-center shrink-0 transition-all duration-200 ease-in-out border-0 cursor-pointer active-press overflow-hidden
          ${isActive ? 'rounded-[14px] shadow-[0_6px_20px_var(--accent-ring)]' : 'rounded-full hover:rounded-[14px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]'} 
          ${
            isCreate
              ? isActive
                ? 'bg-(--accent-primary) text-white'
                : 'bg-theme-input text-(--accent-primary) hover:bg-(--accent-primary) hover:text-white'
              : isActive
                ? 'bg-(--accent-primary) text-white'
                : 'bg-theme-sidebar text-theme-muted hover:text-theme-primary'
          } 
          ${showTooltip && !isActive ? 'scale-105' : 'scale-100'}`}
      >
        {isCreate ? (
          <span className="transition-colors duration-150 text-inherit">
            {children}
          </span>
        ) : (
          children
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-theme-sidebar text-theme-primary text-xs font-semibold px-2.5 py-1.5 rounded-lg border-[1.5px] border-glass whitespace-nowrap pointer-events-none z-9999 shadow-(--glass-shadow) animate-fade-in">
          {tooltip}
          {/* Arrow */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-(--glass-border)" />
        </div>
      )}
    </div>
  );
};
