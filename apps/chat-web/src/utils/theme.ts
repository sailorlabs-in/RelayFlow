export interface ThemeColorSet {
  accentPrimary: string;
  accentSecondary: string;
  bgPrimary: string;
  bgSidebar: string;
  textPrimary: string;
  textMuted: string;
}

export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(rgbStr: string): string {
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) {
    return '#38bdf8';
  }
  const r = parseInt(match[0], 10);
  const g = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = ((num >> 8) & 0x00ff) - amt,
    B = (num & 0x0000ff) - amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

export function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = ((num >> 8) & 0x00ff) + amt,
    B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

export function invertForLight(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }
  const r = 255 - rgb.r,
    g = 255 - rgb.g,
    b = 255 - rgb.b;
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function deriveLightFromDark(dark: ThemeColorSet): ThemeColorSet {
  return {
    accentPrimary: darkenColor(dark.accentPrimary, 20),
    accentSecondary: dark.accentPrimary,
    bgPrimary: lightenColor(invertForLight(dark.bgPrimary), 10),
    bgSidebar: lightenColor(invertForLight(dark.bgSidebar), 5),
    textPrimary: '#1e1e1e',
    textMuted: '#6b7280',
  };
}

export function applyCustomColors(colors: ThemeColorSet, isDark: boolean) {
  if (typeof window === 'undefined') {
    return;
  }
  const rgbAccent = hexToRgb(colors.accentPrimary) || { r: 56, g: 189, b: 248 };
  const rgbAccentSec = hexToRgb(colors.accentSecondary) || {
    r: 125,
    g: 211,
    b: 252,
  };
  const rgbSidebar = hexToRgb(colors.bgSidebar) || { r: 22, g: 35, b: 62 };

  const style = document.documentElement.style;
  style.setProperty('--accent-primary', colors.accentPrimary);
  style.setProperty(
    '--accent-primary-hover',
    isDark
      ? lightenColor(colors.accentPrimary, 10)
      : darkenColor(colors.accentPrimary, 10),
  );
  style.setProperty('--accent-secondary', colors.accentSecondary);

  // Backgrounds & Sidebar
  style.setProperty('--bg-primary', colors.bgPrimary);
  style.setProperty('--bg-chat', colors.bgPrimary);
  style.setProperty(
    '--bg-sidebar',
    `rgba(${rgbSidebar.r}, ${rgbSidebar.g}, ${rgbSidebar.b}, 0.88)`,
  );
  style.setProperty(
    '--dropdown-bg',
    isDark ? lightenColor(colors.bgSidebar, 6) : '#ffffff',
  );

  // Text Colors
  style.setProperty('--text-primary', colors.textPrimary);
  style.setProperty(
    '--text-secondary',
    isDark
      ? lightenColor(colors.accentPrimary, 10)
      : darkenColor(colors.accentPrimary, 10),
  );
  style.setProperty('--text-muted', colors.textMuted);
  style.setProperty('--online-border', isDark ? colors.bgPrimary : '#ffffff');

  // Glass properties
  style.setProperty(
    '--glass-bg',
    `rgba(${rgbSidebar.r}, ${rgbSidebar.g}, ${rgbSidebar.b}, ${isDark ? 0.55 : 0.76})`,
  );
  style.setProperty(
    '--glass-border',
    isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)',
  );
  style.setProperty(
    '--glass-shadow',
    isDark
      ? '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
      : `0 8px 32px 0 rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, 0.08)`,
  );
  style.setProperty(
    '--border-muted',
    isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.07)',
  );

  // Inputs
  style.setProperty(
    '--bg-input',
    isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
  );
  style.setProperty(
    '--bg-input-focus',
    isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)',
  );

  // Message Bubbles (Premium derived shades)
  style.setProperty(
    '--msg-in-bg',
    isDark ? lightenColor(colors.bgPrimary, 6) : '#ffffff',
  );
  style.setProperty(
    '--msg-in-border',
    isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.06)',
  );

  // Scrollbars (Themed accent scrollbars)
  style.setProperty(
    '--scrollbar-thumb',
    `rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, ${isDark ? 0.15 : 0.2})`,
  );
  style.setProperty(
    '--scrollbar-thumb-hover',
    `rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, ${isDark ? 0.3 : 0.45})`,
  );

  // Danger states
  style.setProperty('--danger', isDark ? '#ef4444' : '#dc2626');
  style.setProperty(
    '--danger-bg',
    isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(220, 38, 38, 0.08)',
  );
  style.setProperty(
    '--danger-border',
    isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(220, 38, 38, 0.2)',
  );

  // Theme action buttons & glows
  style.setProperty(
    '--theme-btn',
    `rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, 0.06)`,
  );
  style.setProperty(
    '--theme-btn-hover',
    `rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, 0.12)`,
  );
  style.setProperty(
    '--theme-btn-active',
    `rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, 0.22)`,
  );
  style.setProperty('--theme-btn-active-text', colors.accentSecondary);
  style.setProperty(
    '--bg-glow-1',
    `rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, 0.05)`,
  );
  style.setProperty(
    '--bg-glow-2',
    `rgba(${rgbAccentSec.r}, ${rgbAccentSec.g}, ${rgbAccentSec.b}, 0.05)`,
  );
  style.setProperty(
    '--accent-ring',
    `rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, 0.18)`,
  );
  style.setProperty(
    '--avatar-ring',
    `rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, 0.28)`,
  );
  style.setProperty(
    '--btn-shadow',
    `0 4px 14px rgba(${rgbAccent.r}, ${rgbAccent.g}, ${rgbAccent.b}, 0.22)`,
  );
}

export function clearCustomColors() {
  if (typeof window === 'undefined') {
    return;
  }
  const variablesToClear = [
    '--accent-primary',
    '--accent-primary-hover',
    '--accent-secondary',
    '--bg-primary',
    '--bg-chat',
    '--bg-sidebar',
    '--dropdown-bg',
    '--text-primary',
    '--text-secondary',
    '--text-muted',
    '--online-border',
    '--glass-bg',
    '--glass-border',
    '--glass-shadow',
    '--border-muted',
    '--bg-input',
    '--bg-input-focus',
    '--msg-in-bg',
    '--msg-in-border',
    '--scrollbar-thumb',
    '--scrollbar-thumb-hover',
    '--danger',
    '--danger-bg',
    '--danger-border',
    '--theme-btn',
    '--theme-btn-hover',
    '--theme-btn-active',
    '--theme-btn-active-text',
    '--bg-glow-1',
    '--bg-glow-2',
    '--accent-ring',
    '--avatar-ring',
    '--btn-shadow',
  ];
  const style = document.documentElement.style;
  variablesToClear.forEach((v) => {
    style.removeProperty(v);
  });
}
