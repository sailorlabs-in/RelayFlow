import React from 'react';

interface WelcomeHubProps {
  timeStr: string;
  greeting: string;
  user: any;
  onNewMessage: () => void;
  onOpenFriends: () => void;
}

export const WelcomeHub: React.FC<WelcomeHubProps> = ({
  timeStr,
  greeting,
  user,
  onNewMessage,
  onOpenFriends,
}) => {
  const currentDate = new Date().toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 bg-theme-chat rounded-2xl overflow-y-auto animate-fade-in relative selection:bg-(--accent-primary)/30">
      {/* Decorative Glowing Orbs in Background */}
      <div className="absolute top-12 right-12 w-72 h-72 bg-(--bg-glow-1) rounded-full blur-3xl pointer-events-none opacity-35 animate-pulse" />
      <div className="absolute bottom-12 left-12 w-72 h-72 bg-(--bg-glow-2) rounded-full blur-3xl pointer-events-none opacity-35 animate-pulse" />

      {/* Top Widget: Live Clock & Date */}
      <div className="self-end glass-panel px-4 py-2 flex items-center gap-3 text-sm font-semibold shrink-0 mb-6 border-glass bg-theme-sidebar/30 backdrop-blur-md shadow-xs">
        <span className="text-theme-secondary font-mono tracking-wider font-bold">
          {timeStr}
        </span>
        <div className="w-1 h-3 rounded bg-theme-muted opacity-60" />
        <span className="text-theme-muted font-medium">{currentDate}</span>
      </div>

      {/* Hero Welcome Banner */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-6 max-w-2xl mx-auto shrink-0 relative z-10">
        <div className="w-20 h-20 rounded-2xl overflow-hidden animate-float border border-glass bg-theme-sidebar/80 shadow-xl p-2.5 flex items-center justify-center backdrop-blur-md mb-2">
          <img
            src="/logo.png"
            alt="RelayFlow Logo"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--accent-primary)/10 text-(--accent-primary) border border-(--accent-primary)/20 text-[11.5px] font-bold tracking-wide uppercase mb-3">
          <span className="w-2 h-2 rounded-full bg-(--accent-primary) animate-ping" />
          Workspace Hub
        </div>

        <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tight text-theme-primary leading-tight">
          {greeting},{' '}
          <span className="gradient-text font-black">
            {user?.displayName || `@${user?.username || 'User'}`}
          </span>
        </h1>

        <p className="text-[14.5px] mt-3.5 text-theme-secondary leading-relaxed max-w-md opacity-85">
          Welcome to your RelayFlow Workspace. Chat with team members, connect
          over voice rooms, and stay organized.
        </p>
      </div>

      {/* Grid of Interactive Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full mb-6 shrink-0 relative z-10">
        {/* Card 1: New Message */}
        <div
          onClick={onNewMessage}
          className="glass-panel p-4.5 border-glass bg-theme-sidebar/25 hover:bg-theme-sidebar/50 hover:border-(--accent-primary)/60 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex items-start gap-4 active-press rounded-2xl"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) group-hover:bg-(--accent-primary) group-hover:text-white transition-all duration-300 shadow-sm shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-[14.5px] text-theme-primary mb-1 group-hover:text-(--accent-primary) transition-colors">
              New Message
            </h4>
            <p className="text-[12.5px] text-theme-muted leading-snug">
              Start a direct messaging thread with any colleague.
            </p>
          </div>
        </div>

        {/* Card 2: Friends Dashboard */}
        <div
          onClick={onOpenFriends}
          className="glass-panel p-4.5 border-glass bg-theme-sidebar/25 hover:bg-theme-sidebar/50 hover:border-(--accent-primary)/60 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex items-start gap-4 active-press rounded-2xl"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) group-hover:bg-(--accent-primary) group-hover:text-white transition-all duration-300 shadow-sm shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-[14.5px] text-theme-primary mb-1 group-hover:text-(--accent-primary) transition-colors">
              Friends Dashboard
            </h4>
            <p className="text-[12.5px] text-theme-muted leading-snug">
              See who is online, send requests, and add connections.
            </p>
          </div>
        </div>

        {/* Card 3: Create a Group */}
        <div
          onClick={() => {
            document.getElementById('rail-create-group-btn')?.click();
          }}
          className="glass-panel p-4.5 border-glass bg-theme-sidebar/25 hover:bg-theme-sidebar/50 hover:border-(--accent-primary)/60 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex items-start gap-4 active-press rounded-2xl"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) group-hover:bg-(--accent-primary) group-hover:text-white transition-all duration-300 shadow-sm shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-[14.5px] text-theme-primary mb-1 group-hover:text-(--accent-primary) transition-colors">
              Create a Group
            </h4>
            <p className="text-[12.5px] text-theme-muted leading-snug">
              Set up a new space for team collaboration and discussion.
            </p>
          </div>
        </div>

        {/* Card 4: Theme & Profile */}
        <div
          onClick={() => {
            const btn =
              document.getElementById('profile-settings-btn') ||
              document.getElementById('channel-sidebar-settings-btn');
            if (btn) {
              btn.click();
            }
          }}
          className="glass-panel p-4.5 border-glass bg-theme-sidebar/25 hover:bg-theme-sidebar/50 hover:border-(--accent-primary)/60 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex items-start gap-4 active-press rounded-2xl"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) group-hover:bg-(--accent-primary) group-hover:text-white transition-all duration-300 shadow-sm shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5"
            >
              <path d="M12 22C17.52 22 22 17.52 22 12S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-[14.5px] text-theme-primary mb-1 group-hover:text-(--accent-primary) transition-colors">
              Theme & Profile
            </h4>
            <p className="text-[12.5px] text-theme-muted leading-snug">
              Change color skins, set statuses, and adjust configurations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
