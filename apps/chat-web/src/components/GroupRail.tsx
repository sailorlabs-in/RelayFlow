import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { setActiveGroup } from '../store/slices/groupsSlice';
import { updateUserProfile } from '../store/slices/authSlice';

import { IconPlus } from './Icons';

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
  const { groups: rawGroups, activeGroupId } = useAppSelector((s) => s.groups);
  const groups = Array.isArray(rawGroups) ? rawGroups : [];

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
                tooltip={group.name}
                onClick={() => handleSelectGroup(group.id)}
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
    </div>
  );
};

// ── Rail Button ──────────────────────────────────────────────────────────────
interface RailButtonProps {
  id: string;
  isActive: boolean;
  isCreate?: boolean;
  tooltip: string;
  onClick: () => void;
  children: React.ReactNode;
  tooltip_state: { text: string; id: string } | null;
  setTooltip: (t: { text: string; id: string } | null) => void;
}

const RailButton = ({
  id,
  isActive,
  isCreate,
  tooltip,
  onClick,
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
          ${isActive ? 'h-6 top-2.5' : showTooltip ? 'h-3 top-[16.5px] opacity-70' : 'h-0 top-5.75 opacity-0'}`}
      />

      <button
        id={id}
        onClick={onClick}
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
