import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setActiveGroup } from '../store/slices/groupsSlice';
import { IconMessageDm, IconPlus, IconServer } from './Icons';

interface GroupRailProps {
  onCreateGroup: () => void;
  onShowDMs: () => void;
  onSelectGroup: (groupId: string) => void;
  isDMMode: boolean;
}

export const GroupRail = ({
  onCreateGroup,
  onShowDMs,
  onSelectGroup,
  isDMMode,
}: GroupRailProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { groups: rawGroups, activeGroupId } = useAppSelector((s) => s.groups);
  const groups = Array.isArray(rawGroups) ? rawGroups : [];
  const [tooltip, setTooltip] = useState<{ text: string; id: string } | null>(null);

  const handleSelectGroup = (groupId: string) => {
    dispatch(setActiveGroup(groupId));
    onSelectGroup(groupId);
  };

  return (
    <div
      className="group-rail"
      style={{
        width: '68px',
        minWidth: '68px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '10px',
        paddingBottom: '10px',
        gap: '6px',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--bg-rail)',
        borderRadius: '14px',
        position: 'relative',
      }}
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
      <div style={{
        width: '32px',
        height: '2px',
        borderRadius: '1px',
        background: 'var(--border-muted)',
        margin: '2px 0',
        flexShrink: 0,
      }} />

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
            <span style={{
              fontSize: '17px',
              fontWeight: 700,
              color: isActive ? 'white' : 'var(--text-primary)',
              lineHeight: 1,
              letterSpacing: '-0.5px',
            }}>
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
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        id={id}
        onClick={onClick}
        title={tooltip}
        onMouseEnter={() => setTooltip({ text: tooltip, id })}
        onMouseLeave={() => setTooltip(null)}
        style={{
          width: '46px',
          height: '46px',
          borderRadius: isActive ? '14px' : '50%',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          background: isCreate
            ? (isActive ? 'var(--accent-primary)' : 'var(--bg-input)')
            : (isActive ? 'var(--accent-primary)' : 'var(--bg-sidebar)'),
          color: isCreate
            ? 'var(--accent-primary)'
            : (isActive ? 'white' : 'var(--text-muted)'),
          boxShadow: isActive ? '0 4px 16px var(--accent-ring)' : 'none',
          outline: isActive ? '2.5px solid var(--accent-primary)' : 'none',
          outlineOffset: '2px',
          transform: showTooltip && !isActive ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        {isCreate ? (
          <span style={{ color: showTooltip ? 'var(--accent-primary)' : 'var(--text-muted)', transition: 'color 0.15s' }}>
            {children}
          </span>
        ) : (
          children
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            left: 'calc(100% + 12px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--bg-sidebar)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 600,
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1.5px solid var(--glass-border)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {tooltip}
          {/* Arrow */}
          <span style={{
            position: 'absolute',
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '5px solid var(--glass-border)',
          }} />
        </div>
      )}
    </div>
  );
};
