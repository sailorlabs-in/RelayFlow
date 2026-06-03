import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { setActiveGroup } from '../store/slices/groupsSlice';

import { IconMessageDm, IconPlus } from './Icons';

interface GroupRailProps {
  onCreateGroup: () => void;
  onShowDMs: () => void;
  onSelectGroup: (groupId: string) => void;
  isDMMode: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const GroupRail = ({
  onCreateGroup,
  onShowDMs,
  onSelectGroup,
  isDMMode,
  isCollapsed,
  onToggle,
}: GroupRailProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { groups: rawGroups, activeGroupId } = useAppSelector((s) => s.groups);
  const groups = Array.isArray(rawGroups) ? rawGroups : [];
  const [tooltip, setTooltip] = useState<{ text: string; id: string } | null>(
    null,
  );

  const handleSelectGroup = (groupId: string) => {
    dispatch(setActiveGroup(groupId));
    onSelectGroup(groupId);
  };

  // Completely hidden — parent renders toggle in sidebar header
  if (isCollapsed) {
    return null as unknown as React.JSX.Element;
  }

  return (
    <div
      className="group-rail w-[68px] min-w-[68px] h-full flex flex-col items-center py-2.5 gap-1.5 overflow-y-auto overflow-x-hidden bg-[var(--bg-rail)] rounded-[14px] relative"
    >
      {/* DMs Button */}
      <RailButton
        id="rail-dm-btn"
        isActive={isDMMode}
        tooltip="Direct Messages"
        onClick={onShowDMs}
        tooltip_state={tooltip}
        setTooltip={setTooltip}
      >
        <IconMessageDm />
      </RailButton>

      {/* Divider */}
      <div className="w-8 h-[2px] rounded-[1px] bg-[var(--border-muted)] my-0.5 shrink-0" />

      {/* Group Buttons */}
      {groups.map((group) => {
        const isActive = group.id === activeGroupId && !isDMMode;
        return (
          <RailButton
            key={group.id}
            id={`rail-group-${group.id}`}
            isActive={isActive}
            tooltip={group.name}
            onClick={() => handleSelectGroup(group.id)}
            tooltip_state={tooltip}
            setTooltip={setTooltip}
          >
            <span
              className={`text-[17px] font-bold leading-none tracking-[-0.5px] ${isActive ? 'text-white' : 'text-[var(--text-primary)]'}`}
            >
              {group.iconLetter}
            </span>
          </RailButton>
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

      {/* Collapse button — pinned at the bottom, same icon as sidebar toggle */}
      <div className="flex-1" />
      <button
        id="rail-collapse-btn"
        title="Hide navigation rail"
        onClick={onToggle}
        className="w-9 h-9 rounded-lg border-0 bg-transparent text-[var(--text-muted)] cursor-pointer flex items-center justify-center transition-all duration-150 shrink-0 mb-1.5 hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px]">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>
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
    <div className="relative shrink-0">
      <button
        id={id}
        onClick={onClick}
        title={tooltip}
        onMouseEnter={() => setTooltip({ text: tooltip, id })}
        onMouseLeave={() => setTooltip(null)}
        className={`w-[46px] h-[46px] flex items-center justify-center shrink-0 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] border-0 cursor-pointer 
          ${isActive ? 'rounded-[14px] shadow-[0_4px_16px_var(--accent-ring)] outline-[2.5px] outline-solid outline-[var(--accent-primary)] outline-offset-2' : 'rounded-full hover:rounded-[14px]'} 
          ${isCreate 
            ? (isActive ? 'bg-[var(--accent-primary)] text-[var(--accent-primary)]' : 'bg-[var(--bg-input)] text-[var(--accent-primary)]') 
            : (isActive ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] hover:text-[var(--text-primary)]')} 
          ${showTooltip && !isActive ? 'scale-108' : 'scale-100'}`}
      >
        {isCreate ? (
          <span
            className={`transition-colors duration-150 ${showTooltip ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}
          >
            {children}
          </span>
        ) : (
          children
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-[var(--bg-sidebar)] text-[var(--text-primary)] text-xs font-semibold px-2.5 py-1.5 rounded-lg border-[1.5px] border-[var(--glass-border)] whitespace-nowrap pointer-events-none z-[9999] shadow-[var(--glass-shadow)]"
        >
          {tooltip}
          {/* Arrow */}
          <span
            className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-[var(--glass-border)]"
          />
        </div>
      )}
    </div>
  );
};
