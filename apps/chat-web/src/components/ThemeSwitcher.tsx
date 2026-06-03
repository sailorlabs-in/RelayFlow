import React from 'react';

import { IconSun, IconMoon, IconMonitor } from './Icons';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeSwitcherProps {
  theme: Theme;
  onChange: (t: Theme) => void;
}

export const ThemeSwitcher = ({ theme, onChange }: ThemeSwitcherProps): React.JSX.Element => {
  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light',  icon: <IconSun />,     label: 'Light mode' },
    { value: 'dark',   icon: <IconMoon />,    label: 'Dark mode' },
    { value: 'system', icon: <IconMonitor />, label: 'System mode' },
  ];

  return (
    <div className="theme-switcher" role="group" aria-label="Theme selector">
      {options.map(({ value, icon, label }) => (
        <button
          key={value}
          id={`theme-btn-${value}`}
          title={label}
          aria-pressed={theme === value}
          onClick={() => onChange(value)}
          className={`theme-btn${theme === value ? ' theme-btn-active' : ''}`}
          style={theme === value ? {
            background: 'var(--theme-btn-active)',
            color: 'var(--theme-btn-active-text)',
          } : {}}
          onMouseEnter={(e) => {
            if (theme !== value) {(e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-btn-hover)';}
          }}
          onMouseLeave={(e) => {
            if (theme !== value) {(e.currentTarget as HTMLButtonElement).style.background = 'transparent';}
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};
