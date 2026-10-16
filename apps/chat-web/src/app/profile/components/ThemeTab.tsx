import React, { useState } from 'react';
import { useAppDispatch } from '../../../store';
import {
  setThemeMode as setReduxThemeMode,
  setThemeSchema as setReduxThemeSchema,
  setTimeFormat as setReduxTimeFormat,
  setLocalCustomThemes,
} from '../../../store/slices/authSlice';
import {
  deriveLightFromDark,
  applyCustomColors,
  clearCustomColors,
} from '../../../utils/theme';
import type { ThemeColorSet } from '../../../utils/theme';
import { IconCheck, IconPencil, IconTrash } from './ProfileIcons';
import type { SchemaOption } from './types';

interface ThemeTabProps {
  themeMode: string;
  setThemeMode: (val: string) => void;
  themeSchema: string;
  setThemeSchema: (val: string) => void;
  timeFormat: '12h' | '24h';
  setTimeFormatState: (val: '12h' | '24h') => void;
  customThemes: any[];
  setCustomThemes: React.Dispatch<React.SetStateAction<any[]>>;
  schemaOptions: SchemaOption[];
  onShowConfirm: (options: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  }) => void;
}

export const ThemeTab: React.FC<ThemeTabProps> = ({
  themeMode,
  setThemeMode,
  themeSchema,
  setThemeSchema,
  timeFormat,
  setTimeFormatState,
  customThemes,
  setCustomThemes,
  schemaOptions,
  onShowConfirm,
}) => {
  const dispatch = useAppDispatch();

  // Custom Theme Form state
  const [showThemeForm, setShowThemeForm] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [customThemeName, setCustomThemeName] = useState('');
  const [customColorTab, setCustomColorTab] = useState<'dark' | 'light'>(
    'dark',
  );
  const [customSyncMode, setCustomSyncMode] = useState(true);

  // Dark Mode Custom Colors
  const [customDarkAccentPrimary, setCustomDarkAccentPrimary] =
    useState('#38bdf8');
  const [customDarkAccentSecondary, setCustomDarkAccentSecondary] =
    useState('#7dd3fc');
  const [customDarkBgPrimary, setCustomDarkBgPrimary] = useState('#0d1829');
  const [customDarkBgSidebar, setCustomDarkBgSidebar] = useState('#16233e');
  const [customDarkTextPrimary, setCustomDarkTextPrimary] = useState('#f8fafc');
  const [customDarkTextMuted, setCustomDarkTextMuted] = useState('#64748b');

  // Light Mode Custom Colors
  const [customLightAccentPrimary, setCustomLightAccentPrimary] =
    useState('#0284c7');
  const [customLightAccentSecondary, setCustomLightAccentSecondary] =
    useState('#38bdf8');
  const [customLightBgPrimary, setCustomLightBgPrimary] = useState('#f8fbff');
  const [customLightBgSidebar, setCustomLightBgSidebar] = useState('#eef4fa');
  const [customLightTextPrimary, setCustomLightTextPrimary] =
    useState('#0f172a');
  const [customLightTextMuted, setCustomLightTextMuted] = useState('#64748b');

  const applyThemePreview = (schemaId: string, currentCustomThemes: any[]) => {
    const activeCustom = currentCustomThemes.find((t) => t.id === schemaId);
    if (activeCustom) {
      const currentMode =
        document.documentElement.getAttribute('data-theme') || 'dark';
      const resolvedMode = currentMode === 'light' ? 'light' : 'dark';

      if (activeCustom.darkColors) {
        const colors =
          resolvedMode === 'dark'
            ? activeCustom.darkColors
            : activeCustom.lightColors;
        applyCustomColors(colors, resolvedMode === 'dark');
      } else if (activeCustom.colors) {
        if (resolvedMode === 'light') {
          const derived = deriveLightFromDark(activeCustom.colors);
          applyCustomColors(derived, false);
        } else {
          applyCustomColors(activeCustom.colors, true);
        }
      }
    } else {
      clearCustomColors();
    }
  };

  const applyThemePreviewForTab = (tab: 'dark' | 'light') => {
    const isDark = tab === 'dark';
    const colors: ThemeColorSet = isDark
      ? {
          accentPrimary: customDarkAccentPrimary,
          accentSecondary: customDarkAccentSecondary,
          bgPrimary: customDarkBgPrimary,
          bgSidebar: customDarkBgSidebar,
          textPrimary: customDarkTextPrimary,
          textMuted: customDarkTextMuted,
        }
      : {
          accentPrimary: customLightAccentPrimary,
          accentSecondary: customLightAccentSecondary,
          bgPrimary: customLightBgPrimary,
          bgSidebar: customLightBgSidebar,
          textPrimary: customLightTextPrimary,
          textMuted: customLightTextMuted,
        };
    applyCustomColors(colors, isDark);
  };

  const updateLivePreviewColor = (colorKey: string, val: string) => {
    const isDark = customColorTab === 'dark';
    const colors: ThemeColorSet = {
      accentPrimary:
        colorKey === 'accentPrimary'
          ? val
          : isDark
            ? customDarkAccentPrimary
            : customLightAccentPrimary,
      accentSecondary:
        colorKey === 'accentSecondary'
          ? val
          : isDark
            ? customDarkAccentSecondary
            : customLightAccentSecondary,
      bgPrimary:
        colorKey === 'bgPrimary'
          ? val
          : isDark
            ? customDarkBgPrimary
            : customLightBgPrimary,
      bgSidebar:
        colorKey === 'bgSidebar'
          ? val
          : isDark
            ? customDarkBgSidebar
            : customLightBgSidebar,
      textPrimary:
        colorKey === 'textPrimary'
          ? val
          : isDark
            ? customDarkTextPrimary
            : customLightTextPrimary,
      textMuted:
        colorKey === 'textMuted'
          ? val
          : isDark
            ? customDarkTextMuted
            : customLightTextMuted,
    };
    applyCustomColors(colors, isDark);
  };

  const prefillColorsFromActiveTheme = () => {
    if (typeof window === 'undefined') {
      return;
    }
    const style = window.getComputedStyle(document.documentElement);
    const getVal = (v: string, fallback: string) => {
      const val = style.getPropertyValue(v).trim();
      if (!val) {
        return fallback;
      }
      if (val.startsWith('#')) {
        return val;
      }
      if (val.startsWith('rgb')) {
        const m = val.match(/\d+/g);
        if (m && m.length >= 3) {
          const r = parseInt(m[0], 10).toString(16).padStart(2, '0');
          const g = parseInt(m[1], 10).toString(16).padStart(2, '0');
          const b = parseInt(m[2], 10).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        }
      }
      return fallback;
    };

    const darkAcc = getVal('--accent-primary', '#38bdf8');
    const darkAccSec = getVal('--accent-secondary', '#7dd3fc');
    const darkBg = getVal('--bg-primary', '#0d1829');
    const darkSidebar = getVal('--dropdown-bg', '#16233e');
    const darkText = getVal('--text-primary', '#f8fafc');
    const darkMuted = getVal('--text-muted', '#64748b');

    setCustomDarkAccentPrimary(darkAcc);
    setCustomDarkAccentSecondary(darkAccSec);
    setCustomDarkBgPrimary(darkBg);
    setCustomDarkBgSidebar(darkSidebar);
    setCustomDarkTextPrimary(darkText);
    setCustomDarkTextMuted(darkMuted);

    const derived = deriveLightFromDark({
      accentPrimary: darkAcc,
      accentSecondary: darkAccSec,
      bgPrimary: darkBg,
      bgSidebar: darkSidebar,
      textPrimary: darkText,
      textMuted: darkMuted,
    });
    setCustomLightAccentPrimary(derived.accentPrimary);
    setCustomLightAccentSecondary(derived.accentSecondary);
    setCustomLightBgPrimary(derived.bgPrimary);
    setCustomLightBgSidebar(derived.bgSidebar);
    setCustomLightTextPrimary(derived.textPrimary);
    setCustomLightTextMuted(derived.textMuted);
  };

  const handleSaveCustomTheme = () => {
    if (!customThemeName.trim()) {
      return;
    }

    const themeId = editingThemeId || `custom_${Date.now()}`;

    const darkColors: ThemeColorSet = {
      accentPrimary: customDarkAccentPrimary,
      accentSecondary: customDarkAccentSecondary,
      bgPrimary: customDarkBgPrimary,
      bgSidebar: customDarkBgSidebar,
      textPrimary: customDarkTextPrimary,
      textMuted: customDarkTextMuted,
    };

    const lightColors: ThemeColorSet = customSyncMode
      ? deriveLightFromDark(darkColors)
      : {
          accentPrimary: customLightAccentPrimary,
          accentSecondary: customLightAccentSecondary,
          bgPrimary: customLightBgPrimary,
          bgSidebar: customLightBgSidebar,
          textPrimary: customLightTextPrimary,
          textMuted: customLightTextMuted,
        };

    const newTheme = {
      id: themeId,
      name: customThemeName.trim(),
      syncMode: customSyncMode,
      darkColors,
      lightColors,
    };

    let updatedThemes: any[];
    if (editingThemeId) {
      updatedThemes = customThemes.map((t) =>
        t.id === editingThemeId ? newTheme : t,
      );
    } else {
      updatedThemes = [...customThemes, newTheme];
    }

    setCustomThemes(updatedThemes);
    dispatch(setLocalCustomThemes(updatedThemes));

    setThemeSchema(themeId);
    dispatch(setReduxThemeSchema(themeId));
    applyThemePreview(themeId, updatedThemes);

    setShowThemeForm(false);
    setEditingThemeId(null);
    setCustomThemeName('');
  };

  const handleCancelCustomTheme = () => {
    setShowThemeForm(false);
    setEditingThemeId(null);
    setCustomThemeName('');
    applyThemePreview(themeSchema, customThemes);
  };

  const handleDeleteCustomTheme = (themeId: string, themeName: string) => {
    onShowConfirm({
      isOpen: true,
      title: 'Delete Custom Theme',
      message: `Are you sure you want to delete the "${themeName}" theme?`,
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: () => {
        const updatedThemes = customThemes.filter((t) => t.id !== themeId);
        setCustomThemes(updatedThemes);
        dispatch(setLocalCustomThemes(updatedThemes));

        if (themeSchema === themeId) {
          setThemeSchema('arctic_glass');
          dispatch(setReduxThemeSchema('arctic_glass'));
          clearCustomColors();
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div>
        <h2
          className="text-[17px] font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Appearance & Theme settings
        </h2>
        <p
          className="text-[12px] mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Personalize your user interface colors and mode schemes.
        </p>
      </div>

      {/* Section 1: Main Theme (Group 1) */}
      <div className="flex flex-col gap-2.5">
        <label
          className="text-[11.5px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Group 1: Main Theme Mode
        </label>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: 'light',
              name: 'Light Mode',
              desc: 'Sunny background, clear text',
            },
            {
              id: 'dark',
              name: 'Dark Mode',
              desc: 'Deep background, vibrant details',
            },
            {
              id: 'system',
              name: 'System Sync',
              desc: 'Follows your operating system',
            },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setThemeMode(mode.id);
                dispatch(setReduxThemeMode(mode.id));
              }}
              className={`flex flex-col items-start p-4 rounded-xl cursor-pointer text-left transition-all duration-200 border ${
                themeMode === mode.id
                  ? 'border-[var(--accent-primary)] bg-[var(--theme-btn-active)]'
                  : 'border-[var(--glass-border)] bg-[var(--theme-btn)]'
              }`}
              onMouseEnter={(e) => {
                if (themeMode !== mode.id) {
                  e.currentTarget.style.background = 'var(--theme-btn-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (themeMode !== mode.id) {
                  e.currentTarget.style.background = 'var(--theme-btn)';
                }
              }}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className="font-bold text-[13px]"
                  style={{
                    color:
                      themeMode === mode.id
                        ? 'var(--theme-btn-active-text)'
                        : 'var(--text-primary)',
                  }}
                >
                  {mode.name}
                </span>
                {themeMode === mode.id && (
                  <span style={{ color: 'var(--theme-btn-active-text)' }}>
                    <IconCheck />
                  </span>
                )}
              </div>
              <span
                className="text-[10.5px] mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {mode.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 1.5: Time Format Preference */}
      <div
        className="flex flex-col gap-2.5 border-t pt-4"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <label
          className="text-[11.5px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Time Format Preference
        </label>

        <div className="grid grid-cols-2 gap-3">
          {[
            {
              id: '12h',
              name: '12-Hour Clock',
              desc: 'Display time with AM/PM (e.g., 09:45 PM)',
            },
            {
              id: '24h',
              name: '24-Hour Clock',
              desc: 'Display 24-hour military time (e.g., 21:45)',
            },
          ].map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => {
                setTimeFormatState(format.id as '12h' | '24h');
                dispatch(setReduxTimeFormat(format.id as '12h' | '24h'));
              }}
              className={`flex flex-col items-start p-4 rounded-xl cursor-pointer text-left transition-all duration-200 border ${
                timeFormat === format.id
                  ? 'border-[var(--accent-primary)] bg-[var(--theme-btn-active)]'
                  : 'border-[var(--glass-border)] bg-[var(--theme-btn)]'
              }`}
              onMouseEnter={(e) => {
                if (timeFormat !== format.id) {
                  e.currentTarget.style.background = 'var(--theme-btn-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (timeFormat !== format.id) {
                  e.currentTarget.style.background = 'var(--theme-btn)';
                }
              }}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className="font-bold text-[13px]"
                  style={{
                    color:
                      timeFormat === format.id
                        ? 'var(--theme-btn-active-text)'
                        : 'var(--text-primary)',
                  }}
                >
                  {format.name}
                </span>
                {timeFormat === format.id && (
                  <span style={{ color: 'var(--theme-btn-active-text)' }}>
                    <IconCheck />
                  </span>
                )}
              </div>
              <span
                className="text-[10.5px] mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {format.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Color Schema (Group 2) */}
      <div
        className="flex flex-col gap-2.5 border-t pt-4"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <label
          className="text-[11.5px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Group 2: Color Schema Options
        </label>

        <div className="flex flex-col gap-3">
          {schemaOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setThemeSchema(option.id);
                dispatch(setReduxThemeSchema(option.id));
              }}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer text-left transition-all duration-200 border ${
                themeSchema === option.id
                  ? 'border-[var(--accent-primary)] bg-[var(--theme-btn-active)]'
                  : 'border-[var(--glass-border)] bg-[var(--theme-btn)]'
              }`}
              onMouseEnter={(e) => {
                if (themeSchema !== option.id) {
                  e.currentTarget.style.background = 'var(--theme-btn-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (themeSchema !== option.id) {
                  e.currentTarget.style.background = 'var(--theme-btn)';
                }
              }}
            >
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-[13.5px]"
                    style={{
                      color:
                        themeSchema === option.id
                          ? 'var(--theme-btn-active-text)'
                          : 'var(--text-primary)',
                    }}
                  >
                    {option.name}
                  </span>
                  {themeSchema === option.id && (
                    <span style={{ color: 'var(--theme-btn-active-text)' }}>
                      <IconCheck />
                    </span>
                  )}
                </div>

                <div
                  className="flex md:flex-row flex-col items-start md:items-center gap-2.5 text-[11px] mt-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span>
                    Light:{' '}
                    <span className="font-semibold">{option.lightName}</span>
                  </span>
                  <span className="hidden md:block">•</span>
                  <span>
                    Dark:{' '}
                    <span className="font-semibold">{option.darkName}</span>
                  </span>
                </div>
              </div>

              {/* Color preview circle pills */}
              <div className="flex gap-1.5 flex-shrink-0 bg-black/10 dark:bg-white/5 p-1.5 rounded-lg">
                {option.colors.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: color }}
                    title={
                      idx === 0
                        ? 'Primary'
                        : idx === 1
                          ? 'Accent'
                          : idx === 2
                            ? 'Dark background'
                            : 'Light background'
                    }
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Section 3: Custom Themes (Group 3) */}
      <div
        className="flex flex-col gap-3 border-t pt-4"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div className="flex items-center justify-between">
          <label
            className="text-[11.5px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            Group 3: Custom Themes
          </label>
          {!showThemeForm && (
            <button
              type="button"
              onClick={() => {
                prefillColorsFromActiveTheme();
                setShowThemeForm(true);
                setEditingThemeId(null);
              }}
              className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200"
              style={{
                background: 'var(--theme-btn)',
                color: 'var(--accent-primary)',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--theme-btn-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--theme-btn)';
              }}
            >
              + Create Theme
            </button>
          )}
        </div>

        {/* Inline Form to Create / Edit Custom Theme */}
        {showThemeForm && (
          <div
            className="p-4 rounded-xl border flex flex-col gap-4.5 animate-slide-down animate-fade-in"
            style={{
              background: 'rgba(0, 0, 0, 0.15)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-2"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              <span
                className="text-[13.5px] font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {editingThemeId ? 'Edit Custom Theme' : 'Create Custom Theme'}
              </span>
              <button
                type="button"
                onClick={handleCancelCustomTheme}
                className="text-[11.5px] font-semibold cursor-pointer border-none bg-transparent"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>

            {/* Theme Name input */}
            <div className="flex flex-col gap-1.5">
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                Theme Name
              </span>
              <input
                type="text"
                required
                value={customThemeName}
                onChange={(e) => setCustomThemeName(e.target.value)}
                placeholder="e.g. Neon Sunset"
                className="w-full bg-[var(--bg-input)] hover:bg-[var(--bg-input-focus)] focus:bg-[var(--bg-input-focus)] outline-none border border-[var(--glass-border)] focus:border-[var(--accent-primary)] rounded-xl px-3 py-2 text-[13.5px] transition-all duration-200"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>

            {/* Sync Toggle */}
            <div
              className="flex items-center justify-between p-3 rounded-xl border"
              style={{
                borderColor: 'var(--glass-border)',
                background: 'var(--bg-input)',
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-[12px] font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Auto-Sync Modes
                </span>
                <span
                  className="text-[10.5px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {customSyncMode
                    ? 'Light mode colors are auto-generated from your dark mode palette'
                    : 'Manually configure both dark and light mode colors'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCustomSyncMode(!customSyncMode)}
                className="relative w-10 h-[22px] rounded-full cursor-pointer border-none transition-all duration-300 shrink-0"
                style={{
                  background: customSyncMode
                    ? 'var(--accent-primary)'
                    : 'var(--glass-border)',
                }}
              >
                <span
                  className="absolute top-[3px] w-4 h-4 rounded-full transition-all duration-300"
                  style={{
                    background: '#fff',
                    left: customSyncMode ? '22px' : '3px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>

            {/* Dark / Light Tab Switcher */}
            <div
              className="flex rounded-xl overflow-hidden border"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              {(['dark', 'light'] as const).map((tab) => {
                const isActive = customColorTab === tab;
                const isDisabled = customSyncMode && tab === 'light';
                return (
                  <button
                    key={tab}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setCustomColorTab(tab);
                      document.documentElement.setAttribute('data-theme', tab);
                      applyThemePreviewForTab(tab);
                    }}
                    className="flex-1 py-2 text-[12px] font-bold uppercase tracking-wider cursor-pointer border-none transition-all duration-200 flex items-center justify-center gap-1.5"
                    style={{
                      background: isActive
                        ? 'var(--accent-primary)'
                        : 'transparent',
                      color: isActive
                        ? 'var(--bg-primary)'
                        : isDisabled
                          ? 'var(--glass-border)'
                          : 'var(--text-muted)',
                      opacity: isDisabled ? 0.5 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {tab === 'dark' ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    )}
                    {tab} Mode
                  </button>
                );
              })}
            </div>

            {/* Synced light preview hint */}
            {customSyncMode && customColorTab === 'dark' && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10.5px]"
                style={{
                  background: 'var(--theme-btn)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-ring)',
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                Light mode will auto-generate from these colors
              </div>
            )}

            {/* Theme Color pickers grid */}
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const isDark = customColorTab === 'dark';
                const pickers = isDark
                  ? [
                      {
                        key: 'bgPrimary',
                        label: 'App Background',
                        val: customDarkBgPrimary,
                        setter: setCustomDarkBgPrimary,
                      },
                      {
                        key: 'bgSidebar',
                        label: 'Sidebar Background',
                        val: customDarkBgSidebar,
                        setter: setCustomDarkBgSidebar,
                      },
                      {
                        key: 'accentPrimary',
                        label: 'Primary Accent',
                        val: customDarkAccentPrimary,
                        setter: setCustomDarkAccentPrimary,
                      },
                      {
                        key: 'accentSecondary',
                        label: 'Secondary Accent',
                        val: customDarkAccentSecondary,
                        setter: setCustomDarkAccentSecondary,
                      },
                      {
                        key: 'textPrimary',
                        label: 'Main Text',
                        val: customDarkTextPrimary,
                        setter: setCustomDarkTextPrimary,
                      },
                      {
                        key: 'textMuted',
                        label: 'Muted Text',
                        val: customDarkTextMuted,
                        setter: setCustomDarkTextMuted,
                      },
                    ]
                  : [
                      {
                        key: 'bgPrimary',
                        label: 'App Background',
                        val: customLightBgPrimary,
                        setter: setCustomLightBgPrimary,
                      },
                      {
                        key: 'bgSidebar',
                        label: 'Sidebar Background',
                        val: customLightBgSidebar,
                        setter: setCustomLightBgSidebar,
                      },
                      {
                        key: 'accentPrimary',
                        label: 'Primary Accent',
                        val: customLightAccentPrimary,
                        setter: setCustomLightAccentPrimary,
                      },
                      {
                        key: 'accentSecondary',
                        label: 'Secondary Accent',
                        val: customLightAccentSecondary,
                        setter: setCustomLightAccentSecondary,
                      },
                      {
                        key: 'textPrimary',
                        label: 'Main Text',
                        val: customLightTextPrimary,
                        setter: setCustomLightTextPrimary,
                      },
                      {
                        key: 'textMuted',
                        label: 'Muted Text',
                        val: customLightTextMuted,
                        setter: setCustomLightTextMuted,
                      },
                    ];
                return pickers.map((picker) => (
                  <div
                    key={picker.key}
                    className="flex items-center gap-3 bg-[var(--bg-input)] p-2.5 rounded-xl border border-[var(--glass-border)]"
                  >
                    <input
                      type="color"
                      value={picker.val}
                      onChange={(e) => {
                        picker.setter(e.target.value);
                        updateLivePreviewColor(picker.key, e.target.value);
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent shrink-0"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span
                        className="text-[11.5px] font-bold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {picker.label}
                      </span>
                      <span
                        className="text-[10px] uppercase font-mono tracking-wider truncate"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {picker.val}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={handleCancelCustomTheme}
                className="text-[12.5px] font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 border-none bg-transparent"
                style={{ color: 'var(--text-muted)' }}
              >
                Discard
              </button>
              <button
                type="button"
                disabled={!customThemeName.trim()}
                onClick={handleSaveCustomTheme}
                className="text-[12.5px] font-bold px-5 py-2 rounded-lg cursor-pointer transition-all duration-200 border-none select-none disabled:opacity-50"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                }}
              >
                {editingThemeId ? 'Update Theme' : 'Save Theme'}
              </button>
            </div>
          </div>
        )}

        {/* List of Custom Themes */}
        <div className="flex flex-col gap-3">
          {customThemes.length === 0 ? (
            <div
              className="text-center py-6 px-4 rounded-xl border border-dashed text-[12px]"
              style={{
                borderColor: 'var(--glass-border)',
                color: 'var(--text-muted)',
                background: 'rgba(0,0,0,0.05)',
              }}
            >
              No custom themes created yet. Click "+ Create Theme" to build one!
            </div>
          ) : (
            customThemes.map((theme) => (
              <div
                key={theme.id}
                onClick={() => {
                  setThemeSchema(theme.id);
                  dispatch(setReduxThemeSchema(theme.id));
                  applyThemePreview(theme.id, customThemes);
                }}
                className={`flex gap-2 flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl cursor-pointer text-left transition-all duration-200 border ${
                  themeSchema === theme.id
                    ? 'border-[var(--accent-primary)] bg-[var(--theme-btn-active)]'
                    : 'border-[var(--glass-border)] bg-[var(--theme-btn)]'
                }`}
                onMouseEnter={(e) => {
                  if (themeSchema !== theme.id) {
                    e.currentTarget.style.background = 'var(--theme-btn-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (themeSchema !== theme.id) {
                    e.currentTarget.style.background = 'var(--theme-btn)';
                  }
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-[13.5px]"
                      style={{
                        color:
                          themeSchema === theme.id
                            ? 'var(--theme-btn-active-text)'
                            : 'var(--text-primary)',
                      }}
                    >
                      {theme.name}
                    </span>
                    {themeSchema === theme.id && (
                      <span style={{ color: 'var(--theme-btn-active-text)' }}>
                        <IconCheck />
                      </span>
                    )}
                    <span
                      className="text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-black/20 dark:bg-white/10"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Custom
                    </span>
                  </div>
                  <span
                    className="text-[10.5px] block mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Hex codes: {(theme.darkColors || theme.colors).bgPrimary} •{' '}
                    {(theme.darkColors || theme.colors).accentPrimary}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between">
                  {/* Colors preview pills */}
                  <div className="flex gap-1.5 bg-black/10 dark:bg-white/5 p-1.5 rounded-lg">
                    {[
                      {
                        c: (theme.darkColors || theme.colors).bgPrimary,
                        l: 'Background',
                      },
                      {
                        c: (theme.darkColors || theme.colors).bgSidebar,
                        l: 'Sidebar',
                      },
                      {
                        c: (theme.darkColors || theme.colors).accentPrimary,
                        l: 'Accent Primary',
                      },
                      {
                        c: (theme.darkColors || theme.colors).accentSecondary,
                        l: 'Accent Secondary',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
                        style={{ backgroundColor: item.c }}
                        title={item.l}
                      />
                    ))}
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingThemeId(theme.id);
                        setCustomThemeName(theme.name);
                        setCustomSyncMode(theme.syncMode ?? false);
                        setCustomColorTab('dark');

                        if (theme.darkColors) {
                          setCustomDarkBgPrimary(theme.darkColors.bgPrimary);
                          setCustomDarkBgSidebar(theme.darkColors.bgSidebar);
                          setCustomDarkAccentPrimary(
                            theme.darkColors.accentPrimary,
                          );
                          setCustomDarkAccentSecondary(
                            theme.darkColors.accentSecondary,
                          );
                          setCustomDarkTextPrimary(
                            theme.darkColors.textPrimary,
                          );
                          setCustomDarkTextMuted(theme.darkColors.textMuted);

                          setCustomLightBgPrimary(theme.lightColors.bgPrimary);
                          setCustomLightBgSidebar(theme.lightColors.bgSidebar);
                          setCustomLightAccentPrimary(
                            theme.lightColors.accentPrimary,
                          );
                          setCustomLightAccentSecondary(
                            theme.lightColors.accentSecondary,
                          );
                          setCustomLightTextPrimary(
                            theme.lightColors.textPrimary,
                          );
                          setCustomLightTextMuted(theme.lightColors.textMuted);
                        } else if (theme.colors) {
                          setCustomDarkBgPrimary(theme.colors.bgPrimary);
                          setCustomDarkBgSidebar(theme.colors.bgSidebar);
                          setCustomDarkAccentPrimary(
                            theme.colors.accentPrimary,
                          );
                          setCustomDarkAccentSecondary(
                            theme.colors.accentSecondary,
                          );
                          setCustomDarkTextPrimary(theme.colors.textPrimary);
                          setCustomDarkTextMuted(theme.colors.textMuted);

                          const derived = deriveLightFromDark(theme.colors);
                          setCustomLightBgPrimary(derived.bgPrimary);
                          setCustomLightBgSidebar(derived.bgSidebar);
                          setCustomLightAccentPrimary(derived.accentPrimary);
                          setCustomLightAccentSecondary(
                            derived.accentSecondary,
                          );
                          setCustomLightTextPrimary(derived.textPrimary);
                          setCustomLightTextMuted(derived.textMuted);
                        }

                        document.documentElement.setAttribute(
                          'data-theme',
                          'dark',
                        );
                        if (theme.darkColors) {
                          applyCustomColors(theme.darkColors, true);
                        } else if (theme.colors) {
                          applyCustomColors(theme.colors, true);
                        }
                        setShowThemeForm(true);
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer flex items-center justify-center border-none transition-all duration-200"
                      style={{
                        background: 'var(--theme-btn)',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          'var(--theme-btn-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--theme-btn)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }}
                      title="Edit Theme"
                    >
                      <IconPencil />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomTheme(theme.id, theme.name);
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer flex items-center justify-center border-none transition-all duration-200"
                      style={{
                        background: 'var(--theme-btn)',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--danger-bg)';
                        e.currentTarget.style.color = 'var(--danger)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--theme-btn)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }}
                      title="Delete Theme"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
