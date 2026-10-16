import React from 'react';

interface AdminMetricsCardsProps {
  userCount: number;
  groupCount: number;
  warnedCount: number;
}

export const AdminMetricsCards: React.FC<AdminMetricsCardsProps> = ({
  userCount,
  groupCount,
  warnedCount,
}) => {
  return (
    <div className="grid grid-cols-3 gap-4 my-5 shrink-0">
      <div className="glass-panel bg-theme-sidebar/10 p-4 border border-glass flex items-center justify-between hover:shadow-md transition-all">
        <div>
          <p className="text-[9px] uppercase font-bold text-theme-muted tracking-wider">
            Users
          </p>
          <h3 className="text-xl font-extrabold text-theme-primary mt-0.5">
            {userCount}
          </h3>
        </div>
        <div className="p-2 bg-theme-input rounded-lg border border-glass text-theme-secondary">
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
      </div>
      <div className="glass-panel bg-theme-sidebar/10 p-4 border border-glass flex items-center justify-between hover:shadow-md transition-all">
        <div>
          <p className="text-[9px] uppercase font-bold text-theme-muted tracking-wider">
            Groups
          </p>
          <h3 className="text-xl font-extrabold text-theme-primary mt-0.5">
            {groupCount}
          </h3>
        </div>
        <div className="p-2 bg-theme-input rounded-lg border border-glass text-theme-secondary">
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
      </div>
      <div className="glass-panel bg-theme-sidebar/10 p-4 border border-glass flex items-center justify-between hover:shadow-md transition-all">
        <div>
          <p className="text-[9px] uppercase font-bold text-theme-muted tracking-wider">
            Warned
          </p>
          <h3 className="text-xl font-extrabold text-theme-primary mt-0.5">
            {warnedCount}
          </h3>
        </div>
        <div className="p-2 bg-theme-input rounded-lg border border-glass text-theme-secondary">
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
