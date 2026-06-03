'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import {
  updateUserProfile,
  logoutUser,
  setThemeMode as setReduxThemeMode,
  setThemeSchema as setReduxThemeSchema,
  updateUserStatusOptimistic,
} from '../../store/slices/authSlice';
import { socketUpdateUserStatus } from '../../store/slices/chatSlice';
import { socketManager } from '../../store/socketManager';
import StoreProvider from '../../store/StoreProvider';

/* ── SVGs for icons ────────────────────────────────────────── */
const IconArrowLeft = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-4 h-4 mr-2"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconUser = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconPalette = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.01445 19.1559 5.06822 19.3868 4.99513 19.5962C4.78696 20.1941 4.95473 20.8624 5.43625 21.2828C5.91777 21.7032 6.6027 21.7779 7.15949 21.4746C7.37583 21.3567 7.63665 21.3789 7.83143 21.531C9.06646 21.8349 10.514 22 12 22Z" />
    <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
    <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
    <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
  </svg>
);

const IconActivity = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconCheck = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    className="w-[15px] h-[15px]"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconLock = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-4 h-4 mr-2 opacity-60"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function ProfileSettingsContent({
  isModal = false,
  onClose,
}: {
  isModal?: boolean;
  onClose?: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, accessToken, status } = useAppSelector((s) => s.auth);

  // Active Tab: 'account' | 'theme' | 'status'
  const [activeTab, setActiveTab] = useState<'account' | 'theme' | 'status'>(
    'account',
  );

  // Account State
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Theme State
  const [themeMode, setThemeMode] = useState('system');
  const [themeSchema, setThemeSchema] = useState('arctic_glass');

  // Status & Visibility State
  const [userStatus, setUserStatus] = useState('online');
  const [visibility, setVisibility] = useState('everyone');

  // Notification State
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Fix: use refs to track initialization and save status for stable preview
  const hasInitializedRef = useRef(false);
  const isSavedRef = useRef(false);

  // Load initial settings - only once on mount
  useEffect(() => {
    if (!accessToken || !user) {
      if (!isModal) {
        router.push('/');
      }
      return;
    }

    if (!hasInitializedRef.current) {
      setDisplayName(user.displayName || '');
      setThemeMode(user.themeMode || 'system');
      setThemeSchema(user.themeSchema || 'arctic_glass');
      setUserStatus(user.status || 'online');
      setVisibility(user.visibility || 'everyone');
      hasInitializedRef.current = true;
    }
  }, [user, accessToken, router, isModal]);

  // Revert preview theme on unmount if not saved
  useEffect(() => {
    // Capture the original values when the component mounts
    const savedMode = user?.themeMode || 'system';
    const savedSchema = user?.themeSchema || 'arctic_glass';

    return (): void => {
      // Only revert if we haven't saved the changes
      if (!isSavedRef.current) {
        dispatch(setReduxThemeMode(savedMode));
        dispatch(setReduxThemeSchema(savedSchema));
      }
    };
  }, [dispatch]);

  // Handle Form Submission
  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setMessage(null);

    // Password validation if they input something
    if (password) {
      if (password.length < 6) {
        setMessage({
          type: 'error',
          text: '❌ Password must be at least 6 characters long.',
        });
        return;
      }
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: '❌ Passwords do not match.' });
        return;
      }
    }

    try {
      const payload: Record<string, string | boolean | undefined> = {
        displayName,
        themeMode,
        themeSchema,
        status: userStatus,
        visibility,
      };

      if (password) {
        payload.password = password;
      }

      const result = await dispatch(updateUserProfile(payload)).unwrap();

      // Mark as saved so unmount effect doesn't revert
      isSavedRef.current = true;

      // Update HTML Attributes & localStorage instantly
      const root = document.documentElement;
      root.setAttribute('data-theme-schema', result.themeSchema || 'golden');

      const finalTheme = result.themeMode || 'system';
      root.setAttribute('data-theme', finalTheme);

      localStorage.setItem('rf-theme', finalTheme);
      localStorage.setItem('rf-theme-schema', result.themeSchema || 'golden');

      // Clear password inputs
      setPassword('');
      setConfirmPassword('');

      setMessage({ type: 'success', text: '✔ Settings saved successfully!' });

      // Clear alert after 3.5 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3500);
    } catch (err: unknown) {
      const errorMsg =
        typeof err === 'string' ? err : 'Failed to save settings.';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  if (!accessToken || !user) {
    return (
      <div
        className="flex items-center justify-center min-h-screen w-screen"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div
          className="text-center font-medium animate-float"
          style={{ color: 'var(--text-muted)' }}
        >
          Loading profile settings...
        </div>
      </div>
    );
  }

  // Schema choices
  const schemaOptions = [
    {
      id: 'emerald',
      name: 'Option 1: Emerald/Forest Green',
      lightName: 'Light Green',
      darkName: 'Dark Olive Green / Dark Green',
      colors: ['#0F9F58', '#10B981', '#0A0F0D', '#ECFDF5'],
    },
    {
      id: 'golden',
      name: 'Option 2: Golden/Amber (Brand Active)',
      lightName: 'Gold / Cream',
      darkName: 'Amber / Dark Gray',
      colors: ['#C67C00', '#E9A319', '#111111', '#F5F5F5'],
    },
    {
      id: 'coffee',
      name: 'Option 3: Warm Coffee',
      lightName: 'Beige / Light Brown',
      darkName: 'Coffee / Dark Cocoa',
      colors: ['#8B5E3C', '#D9A066', '#1F1815', '#FAF6F1'],
    },
    {
      id: 'violet',
      name: 'Option 4: Deep Violet',
      lightName: 'Lavender / White',
      darkName: 'Royal Violet / Deep Purple',
      colors: ['#7F56D9', '#9E77ED', '#0E0A16', '#F4F0FF'],
    },
    {
      id: 'linear',
      name: 'Option 5: Linear Inspired (Elite SaaS)',
      lightName: 'Light Gray / Indigo',
      darkName: 'Midnight Dark / Purple Accent',
      colors: ['#5E6AD2', '#7C3AED', '#08090A', '#FAFAFA'],
    },
    {
      id: 'midnight_emerald',
      name: 'Option 6: Midnight Emerald',
      lightName: 'Teal Mint / White',
      darkName: 'Midnight Emerald / Dark Jade',
      colors: ['#0E9384', '#15B8A6', '#071412', '#FCFCFB'],
    },
    {
      id: 'graphite_orange',
      name: 'Option 7: Graphite Orange',
      lightName: 'Charcoal Orange / Off-White',
      darkName: 'Graphite Orange / Matte Black',
      colors: ['#E57A00', '#FF9F1A', '#0B0B0B', '#FAFAFA'],
    },
    {
      id: 'arctic_glass',
      name: 'Option 8: Arctic Glass',
      lightName: 'Arctic Blue / Ice White',
      darkName: 'Deep Ocean / Cyan Glow',
      colors: ['#0099FF', '#00C2FF', '#050A12', '#F8FBFF'],
    },
    {
      id: 'carbon_red',
      name: 'Option 9: Carbon Red',
      lightName: 'Crimson / Pure White',
      darkName: 'Carbon Red / Pitch Black',
      colors: ['#D32F2F', '#F44336', '#090909', '#FAFAFA'],
    },
    {
      id: 'tokyo_night',
      name: 'Option 10: Tokyo Night',
      lightName: 'Day Light Blue / Indigo',
      darkName: 'Tokyo Storm / Neon Purple',
      colors: ['#3B82F6', '#7C3AED', '#1A1B26', '#F6F7FB'],
    },
    {
      id: 'matte_gold',
      name: 'Option 11: Matte Black + Gold 🏆',
      lightName: 'Luxury Gold / Pearl White',
      darkName: 'Matte Obsidian / Gold Accent',
      colors: ['#B8860B', '#D4AF37', '#050505', '#FFFDF8'],
    },
    {
      id: 'obsidian_cyan',
      name: 'Option 12: Obsidian + Cyan',
      lightName: 'Ocean Cyan / Cool Gray',
      darkName: 'Obsidian Cyberpunk / Neon Cyan',
      colors: ['#0891B2', '#06B6D4', '#09090B', '#F7FAFC'],
    },
  ];

  const innerContent = (
    <div
      className={
        isModal
          ? 'relative flex flex-col w-full h-full overflow-hidden z-10'
          : 'relative flex flex-col w-[960px] max-w-full min-h-[620px] rounded-2xl glass-panel animate-slide-up overflow-hidden z-10'
      }
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-6 py-4.5 border-b"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div className="flex items-center gap-4">
          {isModal ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center text-[13px] font-semibold rounded-lg px-3 py-2 cursor-pointer transition-all duration-200 border-none"
              style={{
                background: 'var(--theme-btn)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--theme-btn-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--theme-btn)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <IconArrowLeft />
              Close Settings
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center text-[13px] font-semibold rounded-lg px-3 py-2 cursor-pointer transition-all duration-200"
              style={{
                background: 'var(--theme-btn)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--theme-btn-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--theme-btn)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <IconArrowLeft />
              Back to Chat
            </Link>
          )}
          <div>
            <h1
              className="text-[20px] font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Profile Settings
            </h1>
            <p
              className="text-[11.5px] mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Configure your display name, theme layouts, and active status.
            </p>
          </div>
        </div>

        <button
          onClick={() => dispatch(logoutUser())}
          className="text-[12.5px] font-semibold px-3.5 py-2 rounded-lg cursor-pointer transition-all duration-200 border border-transparent"
          style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            borderColor: 'var(--danger-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.85';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Inner split workspace */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Left Navigation tab list */}
        <div
          className="w-full md:w-[240px] flex flex-row md:flex-col p-3 gap-1.5 border-r"
          style={{
            borderColor: 'var(--border-muted)',
            background: 'rgba(0,0,0,0.015)',
          }}
        >
          {[
            { id: 'account', label: 'Account settings', icon: <IconUser /> },
            {
              id: 'theme',
              label: 'Appearance & Themes',
              icon: <IconPalette />,
            },
            {
              id: 'status',
              label: 'Status & Visibility',
              icon: <IconActivity />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as 'account' | 'theme' | 'status');
              }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13.5px] font-semibold cursor-pointer text-left transition-all duration-200 border-none ${
                activeTab === tab.id ? 'theme-btn-active' : ''
              }`}
              style={
                activeTab === tab.id
                  ? {
                      background: 'var(--theme-btn-active)',
                      color: 'var(--theme-btn-active-text)',
                    }
                  : {
                      background: 'transparent',
                      color: 'var(--text-muted)',
                    }
              }
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'var(--theme-btn-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Main panel content Form */}
        <form
          onSubmit={(e) => {
            void handleSave(e);
          }}
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-chat)' }}
        >
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {message && (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in"
                style={{
                  background:
                    message.type === 'success'
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'var(--danger-bg)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.20)' : 'var(--danger-border)'}`,
                  color:
                    message.type === 'success' ? '#10b981' : 'var(--danger)',
                }}
              >
                {message.text}
              </div>
            )}

            {/* TAB: ACCOUNT */}
            {activeTab === 'account' && (
              <div className="flex flex-col gap-5 flex-1">
                <div>
                  <h2
                    className="text-[17px] font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Account Settings
                  </h2>
                  <p
                    className="text-[12px] mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Modify your basic account info, username, and password.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[11.5px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Email address
                  </label>
                  <input
                    type="email"
                    disabled
                    className="input-base rounded-[10px] px-4 py-3 text-[14px] cursor-not-allowed opacity-60"
                    value={user.email}
                  />
                  <span
                    className="text-[10.5px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Registered email cannot be modified.
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[11.5px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-base rounded-[10px] px-4 py-3 text-[14px]"
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor =
                        'var(--accent-primary)';
                      e.currentTarget.style.boxShadow =
                        '0 0 0 3px var(--accent-ring)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div
                  className="border-t pt-4 mt-2"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <div
                    className="flex items-center text-[13px] font-bold mb-4"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <IconLock />
                    Update Password
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        New Password
                      </label>
                      <input
                        type="password"
                        className="input-base rounded-[10px] px-4 py-3 text-[14px]"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor =
                            'var(--accent-primary)';
                          e.currentTarget.style.boxShadow =
                            '0 0 0 3px var(--accent-ring)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor =
                            'var(--glass-border)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        className="input-base rounded-[10px] px-4 py-3 text-[14px]"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor =
                            'var(--accent-primary)';
                          e.currentTarget.style.boxShadow =
                            '0 0 0 3px var(--accent-ring)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor =
                            'var(--glass-border)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                  <p
                    className="text-[11px] mt-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Leave blank if you do not wish to change your password.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: APPEARANCE & THEME */}
            {activeTab === 'theme' && (
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
                            e.currentTarget.style.background =
                              'var(--theme-btn-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (themeMode !== mode.id) {
                            e.currentTarget.style.background =
                              'var(--theme-btn)';
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
                            <span
                              style={{ color: 'var(--theme-btn-active-text)' }}
                            >
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
                            e.currentTarget.style.background =
                              'var(--theme-btn-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (themeSchema !== option.id) {
                            e.currentTarget.style.background =
                              'var(--theme-btn)';
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
                              <span
                                style={{
                                  color: 'var(--theme-btn-active-text)',
                                }}
                              >
                                <IconCheck />
                              </span>
                            )}
                          </div>

                          <div
                            className="flex items-center gap-2.5 text-[11px] mt-1"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <span>
                              Light:{' '}
                              <span className="font-semibold">
                                {option.lightName}
                              </span>
                            </span>
                            <span>•</span>
                            <span>
                              Dark:{' '}
                              <span className="font-semibold">
                                {option.darkName}
                              </span>
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
              </div>
            )}

            {/* TAB: STATUS & VISIBILITY */}
            {activeTab === 'status' && (
              <div className="flex flex-col gap-6 flex-1">
                <div>
                  <h2
                    className="text-[17px] font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Status & Visibility
                  </h2>
                  <p
                    className="text-[12px] mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Manage your active presence status across the workspace.
                  </p>
                </div>

                {/* Section 1: User Status */}
                <div className="flex flex-col gap-2.5">
                  <label
                    className="text-[11.5px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Presence Status
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        id: 'online',
                        name: 'Online',
                        color: '#22c55e',
                        desc: 'Active & receptive to messages',
                      },
                      {
                        id: 'away',
                        name: 'Away',
                        color: '#eab308',
                        desc: 'Stepped away from keyboard',
                      },
                      {
                        id: 'dnd',
                        name: 'DND',
                        color: '#ef4444',
                        desc: 'Muted — focus mode active',
                      },
                      {
                        id: 'offline',
                        name: 'Offline',
                        color: '#71717a',
                        desc: 'Invisible to all users',
                      },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={async () => {
                          setUserStatus(st.id);
                          // Optimistically update status in redux authSlice and chatSlice onlineUsers
                          dispatch(updateUserStatusOptimistic(st.id));
                          if (user?.id) {
                            dispatch(socketUpdateUserStatus({ userId: user.id, status: st.id, autoStatus: 'online' }));
                          }
                          // Immediately push status change via socket for real-time broadcast
                          socketManager.updateStatus(st.id);
                          // Persist change to database
                          try {
                            await dispatch(updateUserProfile({ status: st.id })).unwrap();
                          } catch (err) {
                            console.error('Failed to auto-save status:', err);
                          }
                        }}
                        className={`flex flex-col items-start p-4 rounded-xl cursor-pointer text-left transition-all duration-200 border ${
                          userStatus === st.id
                            ? 'border-[var(--accent-primary)] bg-[var(--theme-btn-active)]'
                            : 'border-[var(--glass-border)] bg-[var(--theme-btn)]'
                        }`}
                        onMouseEnter={(e) => {
                          if (userStatus !== st.id) {
                            e.currentTarget.style.background =
                              'var(--theme-btn-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (userStatus !== st.id) {
                            e.currentTarget.style.background =
                              'var(--theme-btn)';
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: st.color }}
                          />
                          <span
                            className="font-bold text-[13px]"
                            style={{
                              color:
                                userStatus === st.id
                                  ? 'var(--theme-btn-active-text)'
                                  : 'var(--text-primary)',
                            }}
                          >
                            {st.name}
                          </span>
                        </div>
                        <span
                          className="text-[10.5px] mt-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {st.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Save Buttons */}
          {activeTab !== 'status' && (
            <div
              className="flex items-center justify-end gap-3 border-t p-6 pt-4 bg-[var(--bg-chat)] z-10"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              {isModal ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[13.5px] font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border-none bg-transparent"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              ) : (
                <Link
                  href="/"
                  className="text-[13.5px] font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </Link>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-send text-[13.5px] font-semibold px-6 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden"
              >
                {status === 'loading' ? 'Saving changes…' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  if (isModal) {
    return innerContent;
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen w-screen p-4 md:p-6"
      style={{
        background: 'var(--bg-primary)',
        transition: 'background 0.3s ease',
      }}
    >
      {/* Background radial glows mapping the active theme */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
          radial-gradient(circle at 15% 15%, var(--bg-glow-1) 0%, transparent 40%),
          radial-gradient(circle at 85% 85%, var(--bg-glow-2) 0%, transparent 40%)
        `,
          opacity: 0.8,
        }}
      />

      {innerContent}
    </div>
  );
}

export default function ProfileSettingsPage(): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <StoreProvider>
      <ProfileSettingsContent />
    </StoreProvider>
  );
}
