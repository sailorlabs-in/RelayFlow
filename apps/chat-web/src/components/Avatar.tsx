import type { PresenceStatus} from '@chat-app/shared-constants';
import { PRESENCE_DOT_COLORS } from '@chat-app/shared-constants';
import React from 'react';

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
    <div className="relative shrink-0 inline-flex">
      <div
        className={`avatar-base ${sizeMap[size]} shrink-0`}
        aria-hidden="true"
      >
        {letter}
      </div>
      <span
        className="absolute rounded-full border-2 border-[var(--glass-bg)] transition-colors duration-300"
        style={{
          bottom: -1,
          right: -1,
          width: dotSize,
          height: dotSize,
          background: PRESENCE_DOT_COLORS[s],
          boxShadow: s !== 'offline' ? `0 0 0 1px ${PRESENCE_DOT_COLORS[s]}33` : 'none',
        }}
        title={status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Offline'}
      />
    </div>
  );
};
