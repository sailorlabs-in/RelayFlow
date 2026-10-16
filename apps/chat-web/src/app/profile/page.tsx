'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import ApiRequest from '../../utils/ApiRequest';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  updateUserProfile,
  logoutUser,
  setThemeMode as setReduxThemeMode,
  setThemeSchema as setReduxThemeSchema,
  setTimeFormat as setReduxTimeFormat,
  checkUsernameAvailability,
  fetchDevices,
  logoutDevice,
  toggleDeviceNotification,
  sendTestNotification,
  fetchCurrentUser,
} from '../../store/slices/authSlice';
import { socketManager } from '../../store/socketManager';
import StoreProvider from '../../store/StoreProvider';
import { generateAvatarThumbnail, compressImage } from '../../utils/media';
import { getOrCreateDeviceToken } from '../../utils/deviceToken';
import { getNotificationClient } from '../useNotificationClient';
import { PrintLog } from '../../utils/logger';

import type { ProfileTabType, DeviceSession, SchemaOption } from './components';

import {
  IconX,
  ProfileNavSidebar,
  AccountTab,
  ThemeTab,
  StatusTab,
  NotificationsTab,
  UpdateNotesTab,
  RetentionTab,
} from './components';

export function ProfileSettingsContent({
  isModal = false,
  onClose,
  onSignOut,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  isMobileView = false,
  onSaveSuccess,
}: {
  isModal?: boolean;
  onClose?: () => void;
  onSignOut?: () => void;
  activeTab?: ProfileTabType;
  setActiveTab?: (tab: ProfileTabType) => void;
  isMobileView?: boolean;
  onSaveSuccess?: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, accessToken, status } = useAppSelector((s) => s.auth);

  const [internalActiveTab, setInternalActiveTab] =
    useState<ProfileTabType>('account');

  const activeTab =
    externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab =
    externalSetActiveTab !== undefined
      ? externalSetActiveTab
      : setInternalActiveTab;

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

  // Theme Settings State
  const [themeMode, setThemeMode] = useState('system');
  const [themeSchema, setThemeSchema] = useState('arctic_glass');
  const [timeFormat, setTimeFormatState] = useState<'12h' | '24h'>('12h');
  const [customThemes, setCustomThemes] = useState<any[]>([]);

  // Status & Visibility State
  const [userStatus, setUserStatus] = useState('online');
  const [visibility, setVisibility] = useState('everyone');

  // Security / 2FA State
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

  // Data Retention State
  const [retentionMediaDays, setRetentionMediaDays] = useState<number>(
    user?.retentionMediaDays !== undefined ? user.retentionMediaDays : 30,
  );
  const [retentionMessageDays, setRetentionMessageDays] = useState<number>(
    user?.retentionMessageDays !== undefined ? user.retentionMessageDays : 90,
  );

  // Notification State
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Device Sessions State
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Update Notes State
  const [historyNotes, setHistoryNotes] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

      const compressedBlob = await compressImage(file, 400, 0.85);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
      });

      const thumbBlob = await generateAvatarThumbnail(file);
      const thumbFile = new File([thumbBlob], `thumb_${file.name}`, {
        type: 'image/jpeg',
      });

      const formData = new FormData();
      formData.append('bucket', 'avatars');
      formData.append('files', compressedFile);
      formData.append('files', thumbFile);

      const bucketUrl = (
        process.env.NEXT_PUBLIC_BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');
      const response = await fetch(`${bucketUrl}/upload`, {
        method: 'POST',
        headers: {
          'X-User-Id': user?.id || 'anonymous',
          'X-Client-Type': 'web',
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.files?.[0]?.url) {
        const mainUrl = data.files[0].url;
        const thumbUrl = data.files[1]?.url || mainUrl;
        setAvatarUrl(mainUrl);
        setAvatarThumbnailUrl(thumbUrl);
        setMessage({
          type: 'success',
          text: '✔ Profile picture uploaded! Click "Save Changes" below to apply.',
        });
      } else {
        setMessage({
          type: 'error',
          text: '❌ Upload failed. Please try again.',
        });
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setMessage({
        type: 'error',
        text: '❌ Upload failed. Check connection.',
      });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // Load devices when switching to notifications tab
  useEffect(() => {
    if (activeTab === 'notifications' && user) {
      setLoadingDevices(true);
      dispatch(fetchDevices())
        .unwrap()
        .then((data: DeviceSession[]) => {
          setDevices(data);
        })
        .catch((err: unknown) => {
          console.error('Failed to load devices:', err);
        })
        .finally(() => {
          setLoadingDevices(false);
        });
    }
  }, [activeTab, user, dispatch]);

  // Load update notes when switching to update-notes tab
  useEffect(() => {
    if (activeTab === 'update-notes' && accessToken) {
      setHistoryLoading(true);
      ApiRequest('/users/update-notes/all', 'get')
        .then((res) => {
          const notesData = res?.data || res || [];
          setHistoryNotes(notesData);
        })
        .catch((err) => {
          console.error('Failed to load update notes:', err);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, [activeTab, accessToken]);

  const handleToggleDeviceNotification = async (
    deviceId: string,
    enabled: boolean,
  ) => {
    const currentDeviceId = getOrCreateDeviceToken();
    const isCurrent = deviceId === currentDeviceId;

    if (isCurrent && enabled) {
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
          const currentId = getOrCreateDeviceToken();
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
      setTimeFormatState(user.timeFormat || '12h');
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
      setRetentionMediaDays(
        user.retentionMediaDays !== undefined ? user.retentionMediaDays : 30,
      );
      setRetentionMessageDays(
        user.retentionMessageDays !== undefined
          ? user.retentionMessageDays
          : 90,
      );

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
  }, [username, accessToken, user, dispatch]);

  // Revert preview theme on unmount if not saved
  useEffect(() => {
    const savedMode = user?.themeMode || 'system';
    const savedSchema = user?.themeSchema || 'arctic_glass';
    const savedTimeFormat = user?.timeFormat || '12h';

    return (): void => {
      if (!isSavedRef.current) {
        dispatch(setReduxThemeMode(savedMode));
        dispatch(setReduxThemeSchema(savedSchema));
        dispatch(setReduxTimeFormat(savedTimeFormat));
      }
    };
  }, [dispatch, user]);

  // Schema choices
  const schemaOptions: SchemaOption[] = [
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
      const payload: Record<string, string | boolean | number | undefined> = {
        displayName,
        username: username.toLowerCase().trim(),
        themeMode,
        themeSchema,
        timeFormat,
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
        retentionMediaDays,
        retentionMessageDays,
      };

      if (password) {
        payload.password = password;
      }

      const result = await dispatch(updateUserProfile(payload)).unwrap();
      isSavedRef.current = true;

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
      localStorage.setItem('rf-time-format', result.timeFormat || '12h');

      setPassword('');
      setConfirmPassword('');

      setMessage({ type: 'success', text: '✔ Settings saved successfully!' });

      if (isModal && onClose) {
        setTimeout(() => {
          onClose();
        }, 0);
      }

      if (onSaveSuccess) {
        setTimeout(() => {
          onSaveSuccess();
        }, 1000);
      }

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

  const innerContent = (
    <div
      className={
        isMobileView
          ? 'relative flex flex-col w-full h-full overflow-hidden z-10'
          : isModal
            ? 'relative flex flex-col w-full h-full overflow-hidden z-10'
            : 'relative flex flex-col w-[960px] max-w-full min-h-[620px] rounded-2xl glass-panel animate-slide-up overflow-hidden z-10'
      }
    >
      {/* Header bar */}
      {!isMobileView && (
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[var(--border-muted)]">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-[var(--text-primary)]">
              Settings
            </h1>
            <p className="text-[11.5px] mt-0.5 text-[var(--text-muted)]">
              Configure your Name, theme layouts, and active status.
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
      )}

      {/* Inner split workspace */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Left Navigation tab list */}
        {!isMobileView && (
          <ProfileNavSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSignOut={handleSignOut}
          />
        )}

        {/* Right Main panel content Form */}
        <form
          onSubmit={(e) => {
            void handleSave(e);
          }}
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            background: isMobileView ? 'transparent' : 'var(--bg-chat)',
          }}
        >
          <div
            className={
              isMobileView
                ? 'flex-1 overflow-y-auto p-1.5 flex flex-col gap-4'
                : 'flex-1 overflow-y-auto p-6 flex flex-col gap-5'
            }
          >
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
              <AccountTab
                user={user}
                userStatus={userStatus}
                displayName={displayName}
                setDisplayName={setDisplayName}
                username={username}
                setUsername={setUsername}
                checkingUsername={checkingUsername}
                usernameAvailable={usernameAvailable}
                avatarUrl={avatarUrl}
                setAvatarUrl={setAvatarUrl}
                avatarThumbnailUrl={avatarThumbnailUrl}
                setAvatarThumbnailUrl={setAvatarThumbnailUrl}
                uploadingAvatar={uploadingAvatar}
                avatarInputRef={avatarInputRef}
                handleAvatarUpload={handleAvatarUpload}
                deleteOldMedia={deleteOldMedia}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                isTwoFactorEnabled={isTwoFactorEnabled}
                setIsTwoFactorEnabled={setIsTwoFactorEnabled}
                twoFactorOnlyNewDevice={twoFactorOnlyNewDevice}
                setTwoFactorOnlyNewDevice={setTwoFactorOnlyNewDevice}
              />
            )}

            {/* TAB: APPEARANCE & THEME */}
            {activeTab === 'theme' && (
              <ThemeTab
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                themeSchema={themeSchema}
                setThemeSchema={setThemeSchema}
                timeFormat={timeFormat}
                setTimeFormatState={setTimeFormatState}
                customThemes={customThemes}
                setCustomThemes={setCustomThemes}
                schemaOptions={schemaOptions}
                onShowConfirm={(opts) => setConfirmModal(opts)}
              />
            )}

            {/* TAB: STATUS & VISIBILITY */}
            {activeTab === 'status' && (
              <StatusTab
                user={user}
                userStatus={userStatus}
                setUserStatus={setUserStatus}
                visibility={visibility}
                setVisibility={setVisibility}
              />
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <NotificationsTab
                user={user}
                timeFormat={timeFormat}
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
                notificationsInAppEnabled={notificationsInAppEnabled}
                setNotificationsInAppEnabled={setNotificationsInAppEnabled}
                notificationsDmEnabled={notificationsDmEnabled}
                setNotificationsDmEnabled={setNotificationsDmEnabled}
                notificationsGroupEnabled={notificationsGroupEnabled}
                setNotificationsGroupEnabled={setNotificationsGroupEnabled}
                groupNotificationPref={groupNotificationPref}
                setGroupNotificationPref={setGroupNotificationPref}
                notificationsFriendRequestEnabled={
                  notificationsFriendRequestEnabled
                }
                setNotificationsFriendRequestEnabled={
                  setNotificationsFriendRequestEnabled
                }
                devices={devices}
                loadingDevices={loadingDevices}
                handleToggleDeviceNotification={handleToggleDeviceNotification}
                handleSendTestNotification={handleSendTestNotification}
                handleLogoutDevice={handleLogoutDevice}
                setMessage={setMessage}
              />
            )}

            {/* TAB: UPDATE NOTES HISTORY */}
            {activeTab === 'update-notes' && (
              <UpdateNotesTab
                historyLoading={historyLoading}
                historyNotes={historyNotes}
              />
            )}

            {/* TAB: 1-ON-1 AUTO-DELETION & MEDIA RETENTION */}
            {activeTab === 'retention' && (
              <RetentionTab
                retentionMediaDays={retentionMediaDays}
                setRetentionMediaDays={setRetentionMediaDays}
                retentionMessageDays={retentionMessageDays}
                setRetentionMessageDays={setRetentionMessageDays}
              />
            )}
          </div>

          {/* Footer Action Save Buttons */}
          {activeTab !== 'status' && activeTab !== 'update-notes' && (
            <div
              className={
                isMobileView
                  ? 'flex items-center justify-end gap-3 border-t py-4 px-2 bg-transparent z-10'
                  : 'flex items-center justify-end gap-3 border-t p-6 pt-4 bg-[var(--bg-chat)] z-10'
              }
              style={{ borderColor: 'var(--border-muted)' }}
            >
              {!isMobileView &&
                (isModal ? (
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
                ))}
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
      {isMobileView ? (
        innerContent
      ) : isModal ? (
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
