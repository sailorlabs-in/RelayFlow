import React from 'react';
import type { DeviceSession } from './types';
import { getOrCreateDeviceToken } from '../../../utils/deviceToken';
import { getNotificationClient } from '../../useNotificationClient';
import { PrintLog } from '../../../utils/logger';

interface NotificationsTabProps {
  user: any;
  timeFormat: '12h' | '24h';
  notificationsEnabled: boolean;
  setNotificationsEnabled: (val: boolean) => void;
  notificationsInAppEnabled: boolean;
  setNotificationsInAppEnabled: (val: boolean) => void;
  notificationsDmEnabled: boolean;
  setNotificationsDmEnabled: (val: boolean) => void;
  notificationsGroupEnabled: boolean;
  setNotificationsGroupEnabled: (val: boolean) => void;
  groupNotificationPref: 'all' | 'mention' | 'none';
  setGroupNotificationPref: (val: 'all' | 'mention' | 'none') => void;
  notificationsFriendRequestEnabled: boolean;
  setNotificationsFriendRequestEnabled: (val: boolean) => void;
  devices: DeviceSession[];
  loadingDevices: boolean;
  handleToggleDeviceNotification: (deviceId: string, enabled: boolean) => void;
  handleSendTestNotification: (deviceId: string) => void;
  handleLogoutDevice: (deviceId: string) => void;
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  user,
  timeFormat,
  notificationsEnabled,
  setNotificationsEnabled,
  notificationsInAppEnabled,
  setNotificationsInAppEnabled,
  notificationsDmEnabled,
  setNotificationsDmEnabled,
  notificationsGroupEnabled,
  setNotificationsGroupEnabled,
  groupNotificationPref,
  setGroupNotificationPref,
  notificationsFriendRequestEnabled,
  setNotificationsFriendRequestEnabled,
  devices,
  loadingDevices,
  handleToggleDeviceNotification,
  handleSendTestNotification,
  handleLogoutDevice,
  setMessage,
}) => {
  return (
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
            Request browser notification permissions to receive updates
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
                  const permission = await Notification.requestPermission();
                  const deviceId = getOrCreateDeviceToken();
                  const compositeId =
                    user && deviceId ? `${user.id}:${deviceId}` : user?.id;
                  if (permission !== 'granted') {
                    setMessage({
                      type: 'error',
                      text: '❌ Notification permission was blocked by the browser. Please check your browser settings.',
                    });
                    setNotificationsEnabled(false);
                  } else {
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
                      PrintLog('Device registered successfully on toggle ON.');
                    }
                  }
                } catch (err) {
                  console.error(
                    'Error requesting notification permission',
                    err,
                  );
                }
              } else {
                try {
                  const permission =
                    'Notification' in window
                      ? Notification.permission
                      : 'default';
                  if (permission === 'granted') {
                    const deviceId = getOrCreateDeviceToken();
                    const compositeId =
                      user && deviceId ? `${user.id}:${deviceId}` : user?.id;
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
          <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
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
                Show alert toasts inside the app when messages arrive in other
                channels
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notificationsInAppEnabled}
                onChange={(e) => setNotificationsInAppEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
            </label>
          </div>

          {/* DM Notifications */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--theme-btn)]">
            <div className="flex flex-col gap-0.5 pr-4">
              <span className="font-bold text-[13.5px] text-[var(--text-primary)]">
                Direct Messages
              </span>
              <span className="text-[11.5px] text-[var(--text-muted)]">
                Receive push notifications for personal direct messages
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notificationsDmEnabled}
                onChange={(e) => setNotificationsDmEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
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
                  Receive push notifications for messages in group channels
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
                <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
              </label>
            </div>

            {notificationsGroupEnabled && (
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[var(--border-muted)]">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
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
                Receive push notifications when someone sends you a friend
                request
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notificationsFriendRequestEnabled}
                onChange={(e) =>
                  setNotificationsFriendRequestEnabled(e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
            </label>
          </div>

          {/* Active Devices List Section */}
          <div className="flex flex-col gap-4 border-t pt-4 border-[var(--border-muted)]">
            <div className="flex flex-col gap-0.5">
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Active Sessions & Devices
              </label>
              <span className="text-[11px] text-[var(--text-muted)]">
                Devices currently logged in to your account. You can toggle
                notifications for each device or revoke their session.
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
                    dev.deviceId === getOrCreateDeviceToken();
                  const isWindows = /windows/i.test(dev.userAgent);
                  const isApple = /macintosh|mac os x|iphone|ipad|ipod/i.test(
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
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-black/10 dark:bg-white/5 text-[var(--text-secondary)] shrink-0">
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
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[var(--accent-ring)] text-[var(--accent-primary)] shrink-0">
                                This Device
                              </span>
                            )}
                            {isCurrent &&
                              typeof window !== 'undefined' &&
                              'Notification' in window &&
                              Notification.permission === 'denied' && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)] shrink-0"
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
                              {new Date(dev.lastActive).toLocaleString([], {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: timeFormat !== '24h',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
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
                              checked={dev.notificationsEnabled !== false}
                              onChange={(e) =>
                                handleToggleDeviceNotification(
                                  dev.deviceId,
                                  e.target.checked,
                                )
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
                          </label>
                        </div>

                        {/* Test notification button */}
                        <button
                          type="button"
                          onClick={() =>
                            handleSendTestNotification(dev.deviceId)
                          }
                          disabled={dev.notificationsEnabled === false}
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
                          onClick={() => handleLogoutDevice(dev.deviceId)}
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

      {/* Troubleshooting / Cache clear section */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--danger-border)] bg-[var(--danger-bg)] mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[13.5px] text-[var(--danger)]">
              Troubleshooting: Force Reset Cache
            </span>
            <span className="text-[11.5px] text-[var(--text-muted)]">
              If you are experiencing sync issues, layout bugs, or stale media,
              clear the local cache and hard reload this device.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm('Force clear cache and hard reload this device?')
              ) {
                if ('caches' in window) {
                  caches.keys().then((keys) => {
                    Promise.all(keys.map((key) => caches.delete(key))).catch(
                      console.error,
                    );
                  });
                }
                navigator.serviceWorker
                  ?.getRegistrations()
                  .then((registrations) => {
                    Promise.all(
                      registrations.map((registration) =>
                        registration.unregister(),
                      ),
                    ).then(() => {
                      window.location.reload();
                    });
                  })
                  .catch(() => {
                    window.location.reload();
                  });
              }
            }}
            className="px-4 py-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] hover:bg-[var(--danger-border)] text-[var(--danger)] text-xs font-bold cursor-pointer transition-all shrink-0"
          >
            Reset Device
          </button>
        </div>
      </div>
    </div>
  );
};
