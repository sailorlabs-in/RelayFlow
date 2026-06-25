'use client';

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
  setLocalCustomThemes,
  updateUserStatusOptimistic,
  checkUsernameAvailability,
  fetchDevices,
  logoutDevice,
  toggleDeviceNotification,
  sendTestNotification,
  fetchCurrentUser,
} from '../../store/slices/authSlice';
import { socketUpdateUserStatus } from '../../store/slices/chatSlice';
import { socketManager } from '../../store/socketManager';
import StoreProvider from '../../store/StoreProvider';
import { Avatar } from '../../components/Avatar';
import { generateAvatarThumbnail, compressImage } from '../../utils/media';
import {
  rgbToHex,
  deriveLightFromDark,
  applyCustomColors,
  clearCustomColors,
} from '../../utils/theme';
import type { ThemeColorSet } from '../../utils/theme';

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

const IconPencil = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-[13px] h-[13px]"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconTrash = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-[13px] h-[13px]"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarThumbnailUrl, setAvatarThumbnailUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const deleteOldMedia = async (url: string) => {
    if (!url) {
      return;
    }
    try {
      const bucketUrl = (
        process.env.NEXT_PUBLIC_BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');
      const prefix = `${bucketUrl}/storage/`;
      if (url.startsWith(prefix)) {
        const path = url.slice(prefix.length);
        const parts = path.split('/');
        if (parts.length >= 2) {
          const bucket = parts[0];
          const name = parts.slice(1).join('/');
          await fetch(`${bucketUrl}/files`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bucket,
              names: [name],
            }),
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete old media:', err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '❌ Only image files are allowed.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: '❌ Image size cannot exceed 5MB.' });
      return;
    }

    setUploadingAvatar(true);

    try {
      if (avatarUrl) {
        await deleteOldMedia(avatarUrl);
      }
      if (avatarThumbnailUrl && avatarThumbnailUrl !== avatarUrl) {
        await deleteOldMedia(avatarThumbnailUrl);
      }

      // Compress main avatar image (max 400px, 0.85 quality)
      const compressedBlob = await compressImage(file, 400, 0.85);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
      });

      // Generate 50x50 thumbnail
      const thumbBlob = await generateAvatarThumbnail(file);
      const thumbFile = new File([thumbBlob], `thumb_${file.name}`, {
        type: 'image/jpeg',
      });

      const formData = new FormData();
      formData.append('bucket', 'relayflow');
      formData.append('folder', 'profile-media');
      formData.append('files', compressedFile);
      formData.append('files', thumbFile);

      const bucketUrl = (
        process.env.NEXT_PUBLIC_BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');
      const response = await fetch(`${bucketUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        const mainUrl = data.files[0].url;
        const thumbUrl = data.files[1]?.url || mainUrl;
        setAvatarUrl(mainUrl);
        setAvatarThumbnailUrl(thumbUrl);
        setMessage({
          type: 'success',
          text: '✔ Avatar uploaded successfully!',
        });
      } else {
        throw new Error('No files returned');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setMessage({ type: 'error', text: '❌ Failed to upload avatar.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Theme State
  const [themeMode, setThemeMode] = useState('system');
  const [themeSchema, setThemeSchema] = useState('arctic_glass');
  const [customThemes, setCustomThemes] = useState<any[]>([]);
  const [showThemeForm, setShowThemeForm] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);

  // Custom Theme Form fields
  const [customThemeName, setCustomThemeName] = useState('');
  const [customColorTab, setCustomColorTab] = useState<'dark' | 'light'>(
    'dark',
  );
  const [customSyncMode, setCustomSyncMode] = useState(true);

  // Dark mode colors
  const [customDarkAccentPrimary, setCustomDarkAccentPrimary] =
    useState('#38bdf8');
  const [customDarkAccentSecondary, setCustomDarkAccentSecondary] =
    useState('#7dd3fc');
  const [customDarkBgPrimary, setCustomDarkBgPrimary] = useState('#0d1829');
  const [customDarkBgSidebar, setCustomDarkBgSidebar] = useState('#16233e');
  const [customDarkTextPrimary, setCustomDarkTextPrimary] = useState('#f8fafc');
  const [customDarkTextMuted, setCustomDarkTextMuted] = useState('#64748b');

  // Light mode colors
  const [customLightAccentPrimary, setCustomLightAccentPrimary] =
    useState('#0284c7');
  const [customLightAccentSecondary, setCustomLightAccentSecondary] =
    useState('#38bdf8');
  const [customLightBgPrimary, setCustomLightBgPrimary] = useState('#f8fbff');
  const [customLightBgSidebar, setCustomLightBgSidebar] = useState('#eef4fa');
  const [customLightTextPrimary, setCustomLightTextPrimary] =
    useState('#1e1e1e');
  const [customLightTextMuted, setCustomLightTextMuted] = useState('#64748b');

  // Status & Visibility State
  const [userStatus, setUserStatus] = useState('online');
  const [visibility, setVisibility] = useState('everyone');

  // 2FA States
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [twoFactorOnlyNewDevice, setTwoFactorOnlyNewDevice] = useState(false);

  // Notification Preferences State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsDmEnabled, setNotificationsDmEnabled] = useState(true);
  const [notificationsGroupEnabled, setNotificationsGroupEnabled] =
    useState(true);
  const [groupNotificationPref, setGroupNotificationPref] = useState<
    'all' | 'mention' | 'none'
  >('all');
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

  // Device Sessions State
  interface DeviceSession {
    deviceId: string;
    userAgent: string;
    deviceInfo: string;
    ip: string;
    lastActive: string;
    notificationsEnabled: boolean;
  }
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Load devices when switching to notifications tab
  useEffect(() => {
    if (activeTab === 'notifications' && user) {
      setLoadingDevices(true);
      dispatch(fetchDevices())
        .unwrap()
        .then((data) => {
          setDevices(data);
        })
        .catch((err) => {
          console.error('Failed to load devices:', err);
        })
        .finally(() => {
          setLoadingDevices(false);
        });
    }
  }, [activeTab, user, dispatch]);

  const handleToggleDeviceNotification = async (
    deviceId: string,
    enabled: boolean,
  ) => {
    const currentDeviceId =
      typeof window !== 'undefined'
        ? localStorage.getItem('rf_device_id')
        : null;
    const isCurrent = deviceId === currentDeviceId;

    if (isCurrent && enabled) {
      // Current device being enabled: verify browser permissions
      const permission =
        'Notification' in window ? Notification.permission : 'default';

      if (permission === 'denied') {
        setMessage({
          type: 'error',
          text: '❌ Notification permission is blocked by your browser. Please allow notifications in your browser settings first.',
        });
        return;
      }

      let finalPermission: NotificationPermission = permission;
      if (permission === 'default') {
        try {
          finalPermission = await Notification.requestPermission();
        } catch (err) {
          console.error('Error requesting permission:', err);
          finalPermission = 'default';
        }
      }

      if (finalPermission !== 'granted') {
        setMessage({
          type: 'error',
          text: '❌ Notification permission was not granted. Cannot enable push notifications on this device.',
        });
        return;
      }
    }

    try {
      await dispatch(toggleDeviceNotification({ deviceId, enabled })).unwrap();
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === deviceId ? { ...d, notificationsEnabled: enabled } : d,
        ),
      );
      dispatch(fetchCurrentUser());

      // If it is the current device, register/unregister on Vibe client immediately if permission is granted
      if (isCurrent) {
        const permission =
          'Notification' in window ? Notification.permission : 'default';
        if (permission === 'granted') {
          const client = getNotificationClient();
          const compositeId = user ? `${user.id}:${deviceId}` : null;
          if (client && compositeId) {
            if (enabled) {
              PrintLog(
                'Registering current device immediately on toggle device ON...',
              );
              await client.registerDevice({
                externalUserId: compositeId,
                serviceWorkerPath: '/push-sw.js',
                serviceWorkerScope: '/',
              });
            } else {
              PrintLog(
                'Unregistering current device immediately on toggle device OFF...',
              );
              await client.unregisterDevice(compositeId);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle device notification:', err);
      setMessage({
        type: 'error',
        text: '❌ Failed to update device notification preference.',
      });
    }
  };

  const handleSendTestNotification = async (deviceId: string) => {
    try {
      await dispatch(sendTestNotification(deviceId)).unwrap();
      setMessage({
        type: 'success',
        text: '✔ Test notification queued successfully! Check your device.',
      });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Failed to send test notification:', err);
      setMessage({
        type: 'error',
        text: '❌ Failed to send test notification. Make sure notifications are allowed and enabled.',
      });
    }
  };

  const handleLogoutDevice = (deviceId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Device Session',
      message:
        'Are you sure you want to log out of this device? The session will be invalidated immediately.',
      confirmLabel: 'Revoke Session',
      type: 'danger',
      onConfirm: async () => {
        try {
          await dispatch(logoutDevice(deviceId)).unwrap();
          setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
          dispatch(fetchCurrentUser());
          setConfirmModal(null);
          // If the user logs out the current device, force logout locally too
          const currentId =
            typeof window !== 'undefined'
              ? localStorage.getItem('rf_device_id')
              : null;
          if (deviceId === currentId) {
            socketManager.disconnect();
            dispatch(logoutUser());
          }
        } catch (err) {
          console.error('Failed to logout device:', err);
          setConfirmModal(null);
        }
      },
    });
  };

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
      setGroupNotificationPref(user.groupNotificationPref || 'all');
      setNotificationsInAppEnabled(user.notificationsInAppEnabled ?? true);
      setNotificationsFriendRequestEnabled(
        user.notificationsFriendRequestEnabled ?? true,
      );
      setIsTwoFactorEnabled(user.isTwoFactorEnabled ?? false);
      setTwoFactorOnlyNewDevice(user.twoFactorOnlyNewDevice ?? false);
      setAvatarUrl(user.avatarUrl || '');
      setAvatarThumbnailUrl(user.avatarThumbnailUrl || '');

      let parsedThemes: any[] = [];
      if (user.customThemes) {
        try {
          parsedThemes = JSON.parse(user.customThemes);
        } catch (e) {
          // ignore
        }
      }
      setCustomThemes(parsedThemes);

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
        const result = await dispatch(
          checkUsernameAvailability(normalized),
        ).unwrap();
        setUsernameAvailable(result.available);
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
        groupNotificationPref,
        notificationsInAppEnabled,
        notificationsFriendRequestEnabled,
        isTwoFactorEnabled,
        twoFactorOnlyNewDevice,
        avatarUrl,
        avatarThumbnailUrl,
        customThemes: JSON.stringify(customThemes),
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

  const applyThemePreview = (schemaId: string, currentCustomThemes: any[]) => {
    const activeCustom = currentCustomThemes.find((t) => t.id === schemaId);
    if (activeCustom && (activeCustom.darkColors || activeCustom.colors)) {
      const currentMode =
        document.documentElement.getAttribute('data-theme') || 'dark';
      const resolvedMode =
        currentMode === 'system'
          ? window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark'
          : currentMode;

      let colors: ThemeColorSet;
      if (activeCustom.darkColors) {
        colors =
          resolvedMode === 'light'
            ? activeCustom.lightColors
            : activeCustom.darkColors;
      } else {
        colors = activeCustom.colors;
      }

      applyCustomColors(colors, resolvedMode === 'dark');
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
        return rgbToHex(val);
      }
      return fallback;
    };

    setCustomThemeName('');
    setCustomSyncMode(true);
    setCustomColorTab('dark');

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

    setCustomLightAccentPrimary('#0284c7');
    setCustomLightAccentSecondary('#38bdf8');
    setCustomLightBgPrimary('#f8fbff');
    setCustomLightBgSidebar('#eef4fa');
    setCustomLightTextPrimary('#1e1e1e');
    setCustomLightTextMuted('#64748b');
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

    let lightColors: ThemeColorSet;
    if (customSyncMode) {
      lightColors = deriveLightFromDark(darkColors);
    } else {
      lightColors = {
        accentPrimary: customLightAccentPrimary,
        accentSecondary: customLightAccentSecondary,
        bgPrimary: customLightBgPrimary,
        bgSidebar: customLightBgSidebar,
        textPrimary: customLightTextPrimary,
        textMuted: customLightTextMuted,
      };
    }

    const newTheme = {
      id: themeId,
      name: customThemeName.trim(),
      syncMode: customSyncMode,
      darkColors,
      lightColors,
    };

    let updatedThemes = [];
    if (editingThemeId) {
      updatedThemes = customThemes.map((t) =>
        t.id === editingThemeId ? newTheme : t,
      );
    } else {
      updatedThemes = [...customThemes, newTheme];
    }

    setCustomThemes(updatedThemes);
    dispatch(setLocalCustomThemes(JSON.stringify(updatedThemes)));
    setThemeSchema(themeId);
    dispatch(setReduxThemeSchema(themeId));

    // Restore original theme mode attribute
    document.documentElement.setAttribute('data-theme', themeMode);

    // Close the form
    setShowThemeForm(false);
    setEditingThemeId(null);
  };

  const handleCancelCustomTheme = () => {
    document.documentElement.setAttribute('data-theme', themeMode);
    setShowThemeForm(false);
    setEditingThemeId(null);
    applyThemePreview(themeSchema, customThemes);
  };

  const handleDeleteCustomTheme = (themeId: string, themeName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Custom Theme',
      message: `Are you sure you want to delete "${themeName}"? This action cannot be undone.`,
      confirmLabel: 'Delete Theme',
      type: 'danger',
      onConfirm: () => {
        const updatedThemes = customThemes.filter((t) => t.id !== themeId);
        setCustomThemes(updatedThemes);
        dispatch(setLocalCustomThemes(JSON.stringify(updatedThemes)));

        let nextSchema = themeSchema;
        if (themeSchema === themeId) {
          nextSchema = 'arctic_glass';
          setThemeSchema(nextSchema);
          dispatch(setReduxThemeSchema(nextSchema));
          applyThemePreview(nextSchema, updatedThemes);
        }

        setConfirmModal(null);
      },
    });
  };

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
          className="w-full md:w-[240px] flex flex-row md:flex-col p-3 gap-1.5 border-b md:border-b-0 md:border-r overflow-x-auto md:overflow-x-visible shrink-0 flex-nowrap"
          style={{
            borderColor: 'var(--border-muted)',
            background: 'rgba(0,0,0,0.015)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
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
              className={`flex items-center gap-3 shrink-0 w-max md:w-full px-4 py-3 rounded-xl text-[13.5px] font-semibold cursor-pointer text-left transition-all duration-200 border-none ${
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
            className="flex items-center gap-3 shrink-0 w-max md:w-full px-4 py-3 rounded-xl text-[13.5px] font-semibold cursor-pointer text-left transition-all duration-200 border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:opacity-85 mt-auto md:mt-0"
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

                {/* Avatar upload picture container */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.015)] shadow-sm animate-fade-in">
                  <div className="relative shrink-0">
                    <Avatar
                      letter={(displayName ||
                        username ||
                        user.email)[0].toUpperCase()}
                      url={avatarUrl}
                      size="lg"
                      status={userStatus}
                    />
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Profile Picture
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border-none bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)] hover:opacity-95 disabled:opacity-50 active-press"
                      >
                        Change Avatar
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            deleteOldMedia(avatarUrl);
                            if (
                              avatarThumbnailUrl &&
                              avatarThumbnailUrl !== avatarUrl
                            ) {
                              deleteOldMedia(avatarThumbnailUrl);
                            }
                            setAvatarUrl('');
                            setAvatarThumbnailUrl('');
                          }}
                          className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-all active-press"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
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

                <div
                  className="border-t pt-4 mt-2"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <div
                    className="flex items-center text-[13px] font-bold mb-4"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none; stroke: currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 mr-2 opacity-60"
                      style={{
                        width: 16,
                        height: 16,
                        stroke: 'currentColor',
                        fill: 'none',
                      }}
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Two-Factor Authentication (2FA)
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Toggle 1: Enable 2FA */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.01)]">
                      <div className="flex flex-col gap-0.5 pr-4">
                        <span
                          className="font-bold text-[13.5px]"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Enable Two-Factor Authentication
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Require a security code sent to your email to log in
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isTwoFactorEnabled}
                          onChange={(e) => {
                            setIsTwoFactorEnabled(e.target.checked);
                            if (!e.target.checked) {
                              setTwoFactorOnlyNewDevice(false);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                      </label>
                    </div>

                    {/* Toggle 2: Only ask OTP on new device */}
                    {isTwoFactorEnabled && (
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.01)] animate-fade-in">
                        <div className="flex flex-col gap-0.5 pr-4">
                          <span
                            className="font-bold text-[13.5px]"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            Only ask OTP on new device
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Bypass OTP prompt if the login device is
                            recognized/remembered
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={twoFactorOnlyNewDevice}
                            onChange={(e) =>
                              setTwoFactorOnlyNewDevice(e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                        </label>
                      </div>
                    )}
                  </div>
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
                          e.currentTarget.style.background =
                            'var(--theme-btn-hover)';
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
                          {editingThemeId
                            ? 'Edit Custom Theme'
                            : 'Create Custom Theme'}
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
                                document.documentElement.setAttribute(
                                  'data-theme',
                                  tab,
                                );
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
                                  <line
                                    x1="4.22"
                                    y1="4.22"
                                    x2="5.64"
                                    y2="5.64"
                                  />
                                  <line
                                    x1="18.36"
                                    y1="18.36"
                                    x2="19.78"
                                    y2="19.78"
                                  />
                                  <line x1="1" y1="12" x2="3" y2="12" />
                                  <line x1="21" y1="12" x2="23" y2="12" />
                                  <line
                                    x1="4.22"
                                    y1="19.78"
                                    x2="5.64"
                                    y2="18.36"
                                  />
                                  <line
                                    x1="18.36"
                                    y1="5.64"
                                    x2="19.78"
                                    y2="4.22"
                                  />
                                </svg>
                              )}
                              {tab} Mode
                              {isDisabled && (
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect
                                    x="3"
                                    y="11"
                                    width="18"
                                    height="11"
                                    rx="2"
                                    ry="2"
                                  />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              )}
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
                                  updateLivePreviewColor(
                                    picker.key,
                                    e.target.value,
                                  );
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
                        No custom themes created yet. Click "+ Create Theme" to
                        build one!
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
                          className={`flex items-center justify-between p-4 rounded-xl cursor-pointer text-left transition-all duration-200 border ${
                            themeSchema === theme.id
                              ? 'border-[var(--accent-primary)] bg-[var(--theme-btn-active)]'
                              : 'border-[var(--glass-border)] bg-[var(--theme-btn)]'
                          }`}
                          onMouseEnter={(e) => {
                            if (themeSchema !== theme.id) {
                              e.currentTarget.style.background =
                                'var(--theme-btn-hover)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (themeSchema !== theme.id) {
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
                                    themeSchema === theme.id
                                      ? 'var(--theme-btn-active-text)'
                                      : 'var(--text-primary)',
                                }}
                              >
                                {theme.name}
                              </span>
                              {themeSchema === theme.id && (
                                <span
                                  style={{
                                    color: 'var(--theme-btn-active-text)',
                                  }}
                                >
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
                              Hex codes:{' '}
                              {(theme.darkColors || theme.colors).bgPrimary} •{' '}
                              {(theme.darkColors || theme.colors).accentPrimary}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Colors preview pills */}
                            <div className="flex gap-1.5 bg-black/10 dark:bg-white/5 p-1.5 rounded-lg">
                              {[
                                {
                                  c: (theme.darkColors || theme.colors)
                                    .bgPrimary,
                                  l: 'Background',
                                },
                                {
                                  c: (theme.darkColors || theme.colors)
                                    .bgSidebar,
                                  l: 'Sidebar',
                                },
                                {
                                  c: (theme.darkColors || theme.colors)
                                    .accentPrimary,
                                  l: 'Accent Primary',
                                },
                                {
                                  c: (theme.darkColors || theme.colors)
                                    .accentSecondary,
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

                                  // Support both new dual-mode and legacy single-mode themes
                                  if (theme.darkColors) {
                                    setCustomDarkBgPrimary(
                                      theme.darkColors.bgPrimary,
                                    );
                                    setCustomDarkBgSidebar(
                                      theme.darkColors.bgSidebar,
                                    );
                                    setCustomDarkAccentPrimary(
                                      theme.darkColors.accentPrimary,
                                    );
                                    setCustomDarkAccentSecondary(
                                      theme.darkColors.accentSecondary,
                                    );
                                    setCustomDarkTextPrimary(
                                      theme.darkColors.textPrimary,
                                    );
                                    setCustomDarkTextMuted(
                                      theme.darkColors.textMuted,
                                    );

                                    setCustomLightBgPrimary(
                                      theme.lightColors.bgPrimary,
                                    );
                                    setCustomLightBgSidebar(
                                      theme.lightColors.bgSidebar,
                                    );
                                    setCustomLightAccentPrimary(
                                      theme.lightColors.accentPrimary,
                                    );
                                    setCustomLightAccentSecondary(
                                      theme.lightColors.accentSecondary,
                                    );
                                    setCustomLightTextPrimary(
                                      theme.lightColors.textPrimary,
                                    );
                                    setCustomLightTextMuted(
                                      theme.lightColors.textMuted,
                                    );
                                  } else if (theme.colors) {
                                    setCustomDarkBgPrimary(
                                      theme.colors.bgPrimary,
                                    );
                                    setCustomDarkBgSidebar(
                                      theme.colors.bgSidebar,
                                    );
                                    setCustomDarkAccentPrimary(
                                      theme.colors.accentPrimary,
                                    );
                                    setCustomDarkAccentSecondary(
                                      theme.colors.accentSecondary,
                                    );
                                    setCustomDarkTextPrimary(
                                      theme.colors.textPrimary,
                                    );
                                    setCustomDarkTextMuted(
                                      theme.colors.textMuted,
                                    );
                                    const derived = deriveLightFromDark(
                                      theme.colors,
                                    );
                                    setCustomLightBgPrimary(derived.bgPrimary);
                                    setCustomLightBgSidebar(derived.bgSidebar);
                                    setCustomLightAccentPrimary(
                                      derived.accentPrimary,
                                    );
                                    setCustomLightAccentSecondary(
                                      derived.accentSecondary,
                                    );
                                    setCustomLightTextPrimary(
                                      derived.textPrimary,
                                    );
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
                                  e.currentTarget.style.color =
                                    'var(--text-primary)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    'var(--theme-btn)';
                                  e.currentTarget.style.color =
                                    'var(--text-muted)';
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
                                  e.currentTarget.style.background =
                                    'var(--danger-bg)';
                                  e.currentTarget.style.color = 'var(--danger)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    'var(--theme-btn)';
                                  e.currentTarget.style.color =
                                    'var(--text-muted)';
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

                {/* Section 2: Visibility Settings */}
                <div
                  className="flex flex-col gap-2.5 border-t pt-4"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <label
                    className="text-[11.5px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Profile Visibility (Who can see you in the Add Friends list)
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        id: 'everyone',
                        name: 'Everyone',
                        desc: 'All users can see you in the suggestions list.',
                      },
                      {
                        id: 'friends_of_friends',
                        name: 'Friends of Friends',
                        desc: 'Only friends of your friends can see you.',
                      },
                      {
                        id: 'noone',
                        name: 'No One',
                        desc: 'Nobody can see you in the suggestions list.',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={async () => {
                          setVisibility(opt.id);
                          try {
                            await dispatch(
                              updateUserProfile({ visibility: opt.id }),
                            ).unwrap();
                          } catch (err) {
                            console.error(
                              'Failed to auto-save visibility:',
                              err,
                            );
                          }
                        }}
                        className={`flex flex-col items-start p-4 rounded-xl cursor-pointer text-left transition-all duration-200 border ${
                          visibility === opt.id
                            ? 'border-[var(--accent-primary)] bg-[var(--theme-btn-active)]'
                            : 'border-[var(--glass-border)] bg-[var(--theme-btn)]'
                        }`}
                        onMouseEnter={(e) => {
                          if (visibility !== opt.id) {
                            e.currentTarget.style.background =
                              'var(--theme-btn-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (visibility !== opt.id) {
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
                                visibility === opt.id
                                  ? 'var(--theme-btn-active-text)'
                                  : 'var(--text-primary)',
                            }}
                          >
                            {opt.name}
                          </span>
                          {visibility === opt.id && (
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
                          {opt.desc}
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
                            const deviceId =
                              typeof window !== 'undefined'
                                ? localStorage.getItem('rf_device_id')
                                : null;
                            const compositeId =
                              user && deviceId
                                ? `${user.id}:${deviceId}`
                                : user?.id;
                            if (permission !== 'granted') {
                              setMessage({
                                type: 'error',
                                text: '❌ Notification permission was blocked by the browser. Please check your browser settings.',
                              });
                              setNotificationsEnabled(false);
                            } else {
                              // Register device immediately to generate VAPID subscription
                              const client = getNotificationClient();
                              if (client && compositeId) {
                                PrintLog(
                                  'Registering device immediately on toggle ON...',
                                );
                                await client.registerDevice({
                                  externalUserId: compositeId,
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
                            const permission =
                              'Notification' in window
                                ? Notification.permission
                                : 'default';
                            if (permission === 'granted') {
                              const deviceId =
                                typeof window !== 'undefined'
                                  ? localStorage.getItem('rf_device_id')
                                  : null;
                              const compositeId =
                                user && deviceId
                                  ? `${user.id}:${deviceId}`
                                  : user?.id;
                              const client = getNotificationClient();
                              if (client && compositeId) {
                                PrintLog(
                                  'Unregistering device immediately on toggle OFF...',
                                );
                                await client.unregisterDevice(compositeId);
                                PrintLog(
                                  'Device unregistered successfully on toggle OFF.',
                                );
                              }
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
                    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--theme-btn)]">
                      <div className="flex items-center justify-between">
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

                      {notificationsGroupEnabled && (
                        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[var(--border-muted)]">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                            Group Notification Preference
                          </label>
                          <select
                            value={groupNotificationPref}
                            onChange={(e) =>
                              setGroupNotificationPref(
                                e.target.value as 'all' | 'mention' | 'none',
                              )
                            }
                            style={{
                              background: 'var(--bg-input)',
                              borderColor: 'var(--glass-border)',
                              color: 'var(--text-primary)',
                            }}
                            className="w-full py-2 px-3 rounded-lg border text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                          >
                            <option
                              value="all"
                              style={{
                                background: 'var(--dropdown-bg)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              All Messages
                            </option>
                            <option
                              value="mention"
                              style={{
                                background: 'var(--dropdown-bg)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              Only Mentions (me & @everyone)
                            </option>
                            <option
                              value="none"
                              style={{
                                background: 'var(--dropdown-bg)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              None
                            </option>
                          </select>
                        </div>
                      )}
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

                    {/* Active Devices List Section */}
                    <div className="flex flex-col gap-4 border-t pt-4 border-[var(--border-muted)]">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          Active Sessions & Devices
                        </label>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Devices currently logged in to your account. You can
                          toggle notifications for each device or revoke their
                          session.
                        </span>
                      </div>

                      {loadingDevices ? (
                        <div className="text-center py-6 text-xs text-[var(--text-muted)] animate-pulse">
                          Loading active devices...
                        </div>
                      ) : devices.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[var(--text-muted)]">
                          No active devices logged in.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {devices.map((dev) => {
                            const isCurrent =
                              typeof window !== 'undefined' &&
                              dev.deviceId ===
                                localStorage.getItem('rf_device_id');
                            const isWindows = /windows/i.test(dev.userAgent);
                            const isApple =
                              /macintosh|mac os x|iphone|ipad|ipod/i.test(
                                dev.userAgent,
                              );
                            const isAndroid = /android/i.test(dev.userAgent);

                            return (
                              <div
                                key={dev.deviceId}
                                className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--theme-btn)] shadow-xs relative"
                                style={
                                  isCurrent
                                    ? {
                                        borderColor: 'var(--accent-primary)',
                                        background:
                                          'color-mix(in srgb, var(--accent-primary) 3%, var(--theme-btn))',
                                      }
                                    : {}
                                }
                              >
                                <div
                                  className="flex items-center gap-3.5"
                                  style={{ minWidth: 0 }}
                                >
                                  {/* OS Icon */}
                                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-black/10 dark:bg-white/5 text-[var(--text-secondary)] flex-shrink-0">
                                    {isWindows ? (
                                      <svg
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        fill="currentColor"
                                      >
                                        <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.101zM10.95 1.95L24 0v11.55H10.95V1.95zM10.95 12.45H24v11.55l-13.05-1.95v-9.6z" />
                                      </svg>
                                    ) : isApple ? (
                                      <svg
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        fill="currentColor"
                                      >
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.1.08.2.1.28.1 1.05-.03 2.11-.62 2.53-1.43z" />
                                      </svg>
                                    ) : isAndroid ? (
                                      <svg
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        fill="currentColor"
                                      >
                                        <path d="M17.5 12c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m-11 0c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12m11.92-5.76l1.63-2.83a.5.5 0 0 0-.18-.68.5.5 0 0 0-.68.18l-1.66 2.88C14.93 5.3 13.5 5 12 5c-1.5 0-2.93.3-4.21.79L6.13 2.91a.5.5 0 0 0-.68-.18.5.5 0 0 0-.18.68l1.63 2.83C3.69 7.84 1.5 11.16 1.5 15h21c0-3.84-2.19-7.16-5.42-8.76" />
                                      </svg>
                                    ) : (
                                      <svg
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <rect
                                          x="2"
                                          y="3"
                                          width="20"
                                          height="14"
                                          rx="2"
                                          ry="2"
                                        />
                                        <line x1="8" y1="21" x2="16" y2="21" />
                                        <line x1="12" y1="17" x2="12" y2="21" />
                                      </svg>
                                    )}
                                  </div>

                                  <div
                                    className="flex flex-col gap-0.5"
                                    style={{ minWidth: 0 }}
                                  >
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-[13.5px] text-[var(--text-primary)] truncate">
                                        {dev.deviceInfo || 'Unknown Device'}
                                      </span>
                                      {isCurrent && (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[var(--accent-ring)] text-[var(--accent-primary)] flex-shrink-0">
                                          This Device
                                        </span>
                                      )}
                                      {isCurrent &&
                                        typeof window !== 'undefined' &&
                                        'Notification' in window &&
                                        Notification.permission ===
                                          'denied' && (
                                          <span
                                            className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)] flex-shrink-0"
                                            title="Notifications are blocked in your browser settings for this site"
                                          >
                                            Blocked by Browser
                                          </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-muted)]">
                                      <span>
                                        IP:{' '}
                                        {dev.ip === '::1' ||
                                        dev.ip === '127.0.0.1' ||
                                        dev.ip === '::ffff:127.0.0.1'
                                          ? 'Localhost'
                                          : dev.ip}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        Active:{' '}
                                        {new Date(
                                          dev.lastActive,
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 flex-shrink-0">
                                  {/* Notification toggle for this device */}
                                  <div
                                    className="flex items-center gap-1.5"
                                    title="Toggle push notifications for this device"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      width="14"
                                      height="14"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      className="opacity-60"
                                    >
                                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                    <label className="relative inline-flex items-center cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={
                                          dev.notificationsEnabled !== false
                                        }
                                        onChange={(e) =>
                                          handleToggleDeviceNotification(
                                            dev.deviceId,
                                            e.target.checked,
                                          )
                                        }
                                        className="sr-only peer"
                                      />
                                      <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                                    </label>
                                  </div>

                                  {/* Test notification button */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendTestNotification(dev.deviceId)
                                    }
                                    disabled={
                                      dev.notificationsEnabled === false
                                    }
                                    className="flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all border border-transparent bg-black/5 dark:bg-white/5 text-[var(--text-muted)] hover:bg-[var(--accent-ring)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] disabled:opacity-30 disabled:cursor-not-allowed active-press"
                                    title={
                                      dev.notificationsEnabled === false
                                        ? 'Enable notifications on this device to send a test push'
                                        : 'Send a test push notification to this device'
                                    }
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      width="14"
                                      height="14"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M22 2L11 13" />
                                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                  </button>

                                  {/* Logout button (revoke session) */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleLogoutDevice(dev.deviceId)
                                    }
                                    className="flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all border border-transparent bg-black/5 dark:bg-white/5 text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] hover:border-[var(--danger-border)] active-press"
                                    title={
                                      isCurrent
                                        ? 'Log out from this account'
                                        : 'Revoke session for this device'
                                    }
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      width="14"
                                      height="14"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                      <polyline points="16 17 21 12 16 7" />
                                      <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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
