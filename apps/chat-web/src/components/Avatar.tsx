import React from 'react';
import { PresenceStatus, PRESENCE_DOT_COLORS } from './PresenceDot';

interface AvatarProps {
  letter: string;
  status?: PresenceStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = ({
  letter,
  status = 'offline',
  size = 'md',
}: AvatarProps): React.JSX.Element => {
  const sizeMap = {
    sm: 'w-[32px] h-[32px] text-[12px]',
    md: 'w-[38px] h-[38px] text-[14px]',
    lg: 'w-[44px] h-[44px] text-[16px]',
  };
  const dotSize = size === 'lg' ? 11 : size === 'md' ? 10 : 8;
  const s = (status as PresenceStatus) in PRESENCE_DOT_COLORS ? (status as PresenceStatus) : 'offline';

  return (
    <div className="relative flex-shrink-0" style={{ display: 'inline-flex' }}>
      <div
        className={`avatar-base ${sizeMap[size]} flex-shrink-0`}
        aria-hidden="true"
      >
        {letter}
      </div>
      <span
        style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: PRESENCE_DOT_COLORS[s],
          border: '2px solid var(--glass-bg)',
          boxShadow: s !== 'offline' ? `0 0 0 1px ${PRESENCE_DOT_COLORS[s]}33` : 'none',
          transition: 'background 0.3s ease',
        }}
        title={status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Offline'}
      />
    </div>
  );
};
