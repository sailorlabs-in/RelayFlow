import React from 'react';

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export const PRESENCE_DOT_COLORS: Record<PresenceStatus, string> = {
  online:  '#22c55e', // green
  away:    '#eab308', // amber
  dnd:     '#ef4444', // red
  offline: 'var(--text-muted)', // gray
};

interface PresenceDotProps {
  status: PresenceStatus | string;
  size?: number;
}

export const PresenceDot = ({ status, size = 10 }: PresenceDotProps): React.JSX.Element => {
  const s = (status as PresenceStatus) in PRESENCE_DOT_COLORS ? (status as PresenceStatus) : 'offline';
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: PRESENCE_DOT_COLORS[s],
        border: '2px solid var(--glass-bg)',
        flexShrink: 0,
        boxShadow: s !== 'offline' ? `0 0 0 1px ${PRESENCE_DOT_COLORS[s]}33` : 'none',
        transition: 'background 0.3s ease',
      }}
      title={s.charAt(0).toUpperCase() + s.slice(1)}
      aria-label={`Status: ${s}`}
    />
  );
};
