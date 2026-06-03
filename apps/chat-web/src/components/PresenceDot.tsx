import type { PresenceStatus} from '@chat-app/shared-constants';
import { PRESENCE_DOT_COLORS } from '@chat-app/shared-constants';
import React from 'react';

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
