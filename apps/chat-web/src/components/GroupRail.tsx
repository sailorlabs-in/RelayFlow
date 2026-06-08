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
}

export const GroupRail = ({
  onCreateGroup,
  onShowDMs,
  onSelectGroup,
  isDMMode,
  isCollapsed,
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
    <div className="group-rail w-[68px] min-w-[68px] h-full flex flex-col items-center py-2.5 gap-1.5 bg-[var(--bg-rail)] rounded-[14px] relative overflow-hidden">
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

      {/* Scrollable Groups Container */}
      <div className="flex-1 w-full flex flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden pr-0 mr-0 custom-scrollbar">
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
              {group.avatarUrl ? (
                <img
                  src={group.avatarUrl}
                  alt={group.name}
                  className="w-full h-full object-cover rounded-[inherit]"
                />
              ) : (
                <span
                  className={`text-[17px] font-bold leading-none tracking-[-0.5px] ${isActive ? 'text-white' : 'text-[var(--text-primary)]'}`}
                >
                  {group.iconLetter}
                </span>
              )}
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
        className={`absolute left-[-11px] w-1 rounded-r bg-[var(--accent-primary)] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left
          ${isActive ? 'h-6 top-[10px]' : showTooltip ? 'h-3 top-[16.5px] opacity-70' : 'h-0 top-[23px] opacity-0'}`}
      />

      <button
        id={id}
        onClick={onClick}
        title={tooltip}
        onMouseEnter={() => setTooltip({ text: tooltip, id })}
        onMouseLeave={() => setTooltip(null)}
        className={`w-[46px] h-[46px] flex items-center justify-center shrink-0 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] border-0 cursor-pointer active-press overflow-hidden
          ${isActive ? 'rounded-[14px] shadow-[0_6px_20px_var(--accent-ring)]' : 'rounded-full hover:rounded-[14px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]'} 
          ${
            isCreate
              ? isActive
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-input)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white'
              : isActive
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-[var(--bg-sidebar)] text-[var(--text-primary)] text-xs font-semibold px-2.5 py-1.5 rounded-lg border-[1.5px] border-[var(--glass-border)] whitespace-nowrap pointer-events-none z-[9999] shadow-[var(--glass-shadow)] animate-fade-in">
          {tooltip}
          {/* Arrow */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-[var(--glass-border)]" />
        </div>
      )}
    </div>
  );
};
