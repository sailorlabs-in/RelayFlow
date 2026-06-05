'use client';

import axios from 'axios';
import { API_URL } from '../../constants/config';
import { PRESENCE_STATUS_DETAILS } from '@chat-app/shared-constants';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { PrintLog } from '../../utils/logger';
import { getNotificationClient } from '../useNotificationClient';
import { ConfirmationModal } from '../../components/ConfirmationModal';

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

const IconBell = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconLogout = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconX = ({ size = 16 }: { size?: number }): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    style={{ width: size, height: size }}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function ProfileSettingsContent({
  isModal = false,
  onClose,
  onSignOut,
}: {
  isModal?: boolean;
  onClose?: () => void;
  onSignOut?: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, accessToken, status } = useAppSelector((s) => s.auth);

  // Active Tab: 'account' | 'theme' | 'status' | 'notifications'
  const [activeTab, setActiveTab] = useState<
    'account' | 'theme' | 'status' | 'notifications'
  >('account');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your account?',
      confirmLabel: 'Sign Out',
      type: 'info',
      onConfirm: () => {
        socketManager.disconnect();
        dispatch(logoutUser());
        setConfirmModal(null);
      },
    });
  };

  // Account State
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Theme State
  const [themeMode, setThemeMode] = useState('system');
  const [themeSchema, setThemeSchema] = useState('arctic_glass');

  // Status & Visibility State
  const [userStatus, setUserStatus] = useState('online');
  const [visibility, setVisibility] = useState('everyone');

  // Notification Preferences State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsDmEnabled, setNotificationsDmEnabled] = useState(true);
  const [notificationsGroupEnabled, setNotificationsGroupEnabled] =
    useState(true);
  const [notificationsInAppEnabled, setNotificationsInAppEnabled] =
    useState(true);
  const [
    notificationsFriendRequestEnabled,
    setNotificationsFriendRequestEnabled,
  ] = useState(true);

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
      setUsername(user.username || '');
      setThemeMode(user.themeMode || 'system');
      setThemeSchema(user.themeSchema || 'arctic_glass');
      setUserStatus(user.status || 'online');
      setVisibility(user.visibility || 'everyone');
      setNotificationsEnabled(user.notificationsEnabled ?? true);
      setNotificationsDmEnabled(user.notificationsDmEnabled ?? true);
      setNotificationsGroupEnabled(user.notificationsGroupEnabled ?? true);
      setNotificationsInAppEnabled(user.notificationsInAppEnabled ?? true);
      setNotificationsFriendRequestEnabled(
        user.notificationsFriendRequestEnabled ?? true,
      );
      hasInitializedRef.current = true;
    }
  }, [user, accessToken, router, isModal]);

  // Debounced real-time username availability check
  useEffect(() => {
    if (!hasInitializedRef.current || !username.trim()) {
      setUsernameAvailable(null);
      return;
    }

    const normalized = username.toLowerCase().trim();
    if (normalized === (user?.username || '').toLowerCase()) {
      setUsernameAvailable(null);
      return;
    }

    if (normalized.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(normalized)) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    setUsernameAvailable(null);

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await axios.get(
          `${API_URL}/users/check-username?username=${normalized}`,
          {
            headers: {
              Authorization: accessToken ? `Bearer ${accessToken}` : '',
            },
          },
        );
        setUsernameAvailable(response.data.available);
      } catch (err) {
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [username, accessToken, user]);

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

    if (usernameAvailable === false) {
      setMessage({
        type: 'error',
        text: '❌ Username is already taken.',
      });
      return;
    }

    if (username.trim().length < 3) {
      setMessage({
        type: 'error',
        text: '❌ Username must be at least 3 characters long.',
      });
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setMessage({
        type: 'error',
        text: '❌ Username can only contain alphanumeric characters, underscores, and hyphens.',
      });
      return;
    }

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
        username: username.toLowerCase().trim(),
        themeMode,
        themeSchema,
        status: userStatus,
        visibility,
        notificationsEnabled,
        notificationsDmEnabled,
        notificationsGroupEnabled,
        notificationsInAppEnabled,
        notificationsFriendRequestEnabled,
      };

      if (password) {
        payload.password = password;
      }

      const result = await dispatch(updateUserProfile(payload)).unwrap();

      // Mark as saved so unmount effect doesn't revert
      isSavedRef.current = true;

      // Update HTML Attributes & localStorage instantly
      const root = document.documentElement;
      root.setAttribute(
        'data-theme-schema',
        result.themeSchema || 'arctic_glass',
      );

      const finalTheme = result.themeMode || 'system';
      root.setAttribute('data-theme', finalTheme);

      localStorage.setItem('rf-theme', finalTheme);
      localStorage.setItem(
        'rf-theme-schema',
        result.themeSchema || 'arctic_glass',
      );

      // Clear password inputs
      setPassword('');
      setConfirmPassword('');

      setMessage({ type: 'success', text: '✔ Settings saved successfully!' });

      if (isModal && onClose) {
        setTimeout(() => {
          onClose();
        }, 0);
      }

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

  // Schema choices — ordered by hue (cyan → teal → green → blue → indigo → violet → red → orange → brown → amber → gold)
  const schemaOptions = [
    {
      id: 'arctic_glass',
      name: 'Arctic Blue',
      lightName: 'Sky Blue / Frost White',
      darkName: 'Deep Navy / Cyan Glow',
      colors: ['#38BDF8', '#7DD3FC', '#0D1829', '#F8FBFF'],
    },
    {
      id: 'obsidian_cyan',
      name: 'Neon Cyan',
      lightName: 'Ocean Cyan / Cool Gray',
      darkName: 'Obsidian Dark / Neon Cyan',
      colors: ['#22D3EE', '#67E8F9', '#131318', '#F7FAFC'],
    },
    {
      id: 'midnight_emerald',
      name: 'Midnight Teal',
      lightName: 'Teal Mint / Clean White',
      darkName: 'Deep Teal / Jade Glow',
      colors: ['#2DD4BF', '#5EEAD4', '#0F2220', '#FCFCFB'],
    },
    {
      id: 'emerald',
      name: 'Forest Green',
      lightName: 'Fresh Green / Pure White',
      darkName: 'Deep Forest / Emerald Glow',
      colors: ['#10B981', '#34D399', '#131D18', '#ECFDF5'],
    },
    {
      id: 'tokyo_night',
      name: 'Tokyo Night',
      lightName: 'Day Blue / Soft Indigo',
      darkName: 'Storm Navy / Neon Lilac',
      colors: ['#7AA2F7', '#BB9AF7', '#1E2030', '#F6F7FB'],
    },
    {
      id: 'linear',
      name: 'Stellar Indigo',
      lightName: 'Clean Gray / Indigo',
      darkName: 'Space Dark / Electric Indigo',
      colors: ['#7B89FF', '#A78BFA', '#0E1018', '#FAFAFA'],
    },
    {
      id: 'violet',
      name: 'Deep Violet',
      lightName: 'Lavender / Pure White',
      darkName: 'Royal Violet / Deep Indigo',
      colors: ['#9E77ED', '#B794F4', '#181227', '#F4F0FF'],
    },
    {
      id: 'carbon_red',
      name: 'Carbon Red',
      lightName: 'Crimson / Pure White',
      darkName: 'Carbon Dark / Vivid Red',
      colors: ['#FF6B6B', '#FF8787', '#131213', '#FAFAFA'],
    },
    {
      id: 'graphite_orange',
      name: 'Graphite Amber',
      lightName: 'Warm Orange / Off-White',
      darkName: 'Graphite Dark / Amber Glow',
      colors: ['#FFB347', '#FFD08A', '#151413', '#FAFAFA'],
    },
    {
      id: 'coffee',
      name: 'Warm Coffee',
      lightName: 'Beige / Cocoa Brown',
      darkName: 'Dark Cocoa / Caramel Glow',
      colors: ['#C89F7B', '#E8B980', '#2A221D', '#FAF6F1'],
    },
    {
      id: 'golden',
      name: 'Golden Amber',
      lightName: 'Gold / Warm Cream',
      darkName: 'Dark Slate / Gold Accent',
      colors: ['#E9A319', '#FBBF24', '#1B1A16', '#F5F5F5'],
    },
    {
      id: 'matte_gold',
      name: 'Matte Gold',
      lightName: 'Luxury Gold / Pearl White',
      darkName: 'Obsidian Dark / Pure Gold',
      colors: ['#D4AF37', '#F4D03F', '#121110', '#FFFDF8'],
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
      <div className="flex items-center justify-between px-6 py-4.5 border-b border-[var(--border-muted)]">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--text-primary)]">
            Profile Settings
          </h1>
          <p className="text-[11.5px] mt-0.5 text-[var(--text-muted)]">
            Configure your display name, theme layouts, and active status.
          </p>
        </div>

        {isModal ? (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-200 border-none bg-[var(--theme-btn)] text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)] hover:text-[var(--text-primary)] active-press"
            title="Close Settings"
          >
            <IconX size={15} />
          </button>
        ) : (
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-200 bg-[var(--theme-btn)] text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)] hover:text-[var(--text-primary)] active-press"
            title="Back to Chat"
          >
            <IconX size={15} />
          </Link>
        )}
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
            {
              id: 'notifications',
              label: 'Notifications',
              icon: <IconBell />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(
                  tab.id as 'account' | 'theme' | 'status' | 'notifications',
                );
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

          <div className="flex-grow hidden md:block" />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13.5px] font-semibold cursor-pointer text-left transition-all duration-200 border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:opacity-85 mt-auto md:mt-0"
          >
            <IconLogout />
            <span>Sign Out</span>
          </button>
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
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    className="input-base rounded-[10px] px-4 py-3 text-[14px]"
                    placeholder="Enter unique username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                  {checkingUsername && (
                    <span className="text-[11px] text-[var(--text-muted)] mt-1 animate-pulse flex items-center gap-1">
                      Checking availability...
                    </span>
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <span className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
                      ✔ Username is available
                    </span>
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <span className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                      ❌ Username is taken
                    </span>
                  )}
                  {!checkingUsername && usernameAvailable === null && (
                    <span
                      className="text-[10.5px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Your unique username for search.
                    </span>
                  )}
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
                    {PRESENCE_STATUS_DETAILS.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={async () => {
                          setUserStatus(st.id);
                          // Optimistically update status in redux authSlice and chatSlice onlineUsers
                          dispatch(updateUserStatusOptimistic(st.id));
                          if (user?.id) {
                            dispatch(
                              socketUpdateUserStatus({
                                userId: user.id,
                                status: st.id,
                                autoStatus: 'online',
                              }),
                            );
                          }
                          // Immediately push status change via socket for real-time broadcast
                          socketManager.updateStatus(st.id);
                          // Persist change to database
                          try {
                            await dispatch(
                              updateUserProfile({ status: st.id }),
                            ).unwrap();
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

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="flex flex-col gap-6 flex-1 animate-fade-in">
                <div>
                  <h2 className="text-[17px] font-bold text-[var(--text-primary)]">
                    Notification Preferences
                  </h2>
                  <p className="text-[12px] mt-0.5 text-[var(--text-muted)]">
                    Control when and how you receive push notifications.
                  </p>
                </div>

                {/* Enable Notifications Switch */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--theme-btn)] animate-fade-in">
                  <div className="flex flex-col gap-0.5 pr-4">
                    <span className="font-bold text-[14px] text-[var(--text-primary)]">
                      Enable Push Notifications
                    </span>
                    <span className="text-[11.5px] text-[var(--text-muted)]">
                      Request browser notification permissions to receive
                      updates
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        setNotificationsEnabled(checked);
                        if (checked) {
                          try {
                            const permission =
                              await Notification.requestPermission();
                            if (permission !== 'granted') {
                              setMessage({
                                type: 'error',
                                text: '❌ Notification permission was blocked by the browser. Please check your browser settings.',
                              });
                              setNotificationsEnabled(false);
                            } else {
                              // Register device immediately to generate VAPID subscription
                              const client = getNotificationClient();
                              if (client && user?.id) {
                                PrintLog(
                                  'Registering device immediately on toggle ON...',
                                );
                                await client.registerDevice({
                                  externalUserId: user.id,
                                  serviceWorkerPath: '/push-sw.js',
                                  serviceWorkerScope: '/',
                                });
                                PrintLog(
                                  'Device registered successfully on toggle ON.',
                                );
                              }
                            }
                          } catch (err) {
                            console.error(
                              'Error requesting notification permission',
                              err,
                            );
                          }
                        } else {
                          // Unregister device immediately on toggle OFF
                          try {
                            const client = getNotificationClient();
                            if (client && user?.id) {
                              PrintLog(
                                'Unregistering device immediately on toggle OFF...',
                              );
                              await client.unregisterDevice(user.id);
                              PrintLog(
                                'Device unregistered successfully on toggle OFF.',
                              );
                            }
                          } catch (err) {
                            console.error(
                              'Error unregistering device on toggle OFF',
                              err,
                            );
                          }
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                  </label>
                </div>

                {/* Other preferences (conditional on notificationsEnabled) */}
                {notificationsEnabled && (
                  <div className="flex flex-col gap-4 border-t pt-4 border-[var(--border-muted)] animate-fade-in">
                    <label className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Push Notification Filters
                    </label>

                    {/* In-App Toast Notifications Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--theme-btn)]">
                      <div className="flex flex-col gap-0.5 pr-4">
                        <span className="font-bold text-[13.5px] text-[var(--text-primary)]">
                          In-App Toast Notifications
                        </span>
                        <span className="text-[11.5px] text-[var(--text-muted)]">
                          Show alert toasts inside the app when messages arrive
                          in other channels
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notificationsInAppEnabled}
                          onChange={(e) =>
                            setNotificationsInAppEnabled(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                      </label>
                    </div>

                    {/* DM Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--theme-btn)]">
                      <div className="flex flex-col gap-0.5 pr-4">
                        <span className="font-bold text-[13.5px] text-[var(--text-primary)]">
                          Direct Messages
                        </span>
                        <span className="text-[11.5px] text-[var(--text-muted)]">
                          Receive push notifications for personal direct
                          messages
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notificationsDmEnabled}
                          onChange={(e) =>
                            setNotificationsDmEnabled(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                      </label>
                    </div>

                    {/* Group Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--theme-btn)]">
                      <div className="flex flex-col gap-0.5 pr-4">
                        <span className="font-bold text-[13.5px] text-[var(--text-primary)]">
                          Groups & Channels
                        </span>
                        <span className="text-[11.5px] text-[var(--text-muted)]">
                          Receive push notifications for messages in group
                          channels
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notificationsGroupEnabled}
                          onChange={(e) =>
                            setNotificationsGroupEnabled(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                      </label>
                    </div>

                    {/* Friend Request Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--theme-btn)]">
                      <div className="flex flex-col gap-0.5 pr-4">
                        <span className="font-bold text-[13.5px] text-[var(--text-primary)]">
                          Friend req. notification
                        </span>
                        <span className="text-[11.5px] text-[var(--text-muted)]">
                          Receive push notifications when someone sends you a
                          friend request
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notificationsFriendRequestEnabled}
                          onChange={(e) =>
                            setNotificationsFriendRequestEnabled(
                              e.target.checked,
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                      </label>
                    </div>
                  </div>
                )}
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
                disabled={
                  status === 'loading' ||
                  checkingUsername ||
                  usernameAvailable === false
                }
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

  return (
    <>
      {isModal ? (
        innerContent
      ) : (
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
      )}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
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
