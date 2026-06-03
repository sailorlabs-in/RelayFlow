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
      className="inline-block rounded-full shrink-0 border-2 border-[var(--glass-bg)] transition-colors duration-300"
      style={{
        width: size,
        height: size,
        background: PRESENCE_DOT_COLORS[s],
        boxShadow: s !== 'offline' ? `0 0 0 1px ${PRESENCE_DOT_COLORS[s]}33` : 'none',
      }}
      title={s.charAt(0).toUpperCase() + s.slice(1)}
      aria-label={`Status: ${s}`}
    />
  );
};
