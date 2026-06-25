'use client';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { initNotificationClient } from 'vibe-message';
import { PrintLog } from '../utils/logger';
import { showToast } from '../components/toast';
import { useAppDispatch, useAppSelector } from '../store';
import type { User } from '../store/slices/authSlice';
import {
  loadMutedConversations,
  setActiveConversation,
} from '../store/slices/chatSlice';
import { setActiveGroup, setActiveChannel } from '../store/slices/groupsSlice';

/* ─────────────────────────────────────────────────────────────────────────────
   NotifCard — inline-styles only so Toastify's internal CSS cannot break layout
   ───────────────────────────────────────────────────────────────────────────── */
interface NotifCardProps {
  initial: string;
  badgeIcon: React.ReactNode;
  badgeLabel: string;
  title: string;
  body: React.ReactNode;
  /** Called when the user clicks the × button */
  onDismiss: () => void;
  /** Called when the user clicks the card body — navigates to the thread */
  onNavigate?: () => void;
}

function NotifCard({
  initial,
  badgeIcon,
  badgeLabel,
  title,
  body,
  onDismiss,
  onNavigate,
}: NotifCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role={onNavigate ? 'button' : undefined}
      tabIndex={onNavigate ? 0 : undefined}
      onClick={onNavigate}
      onKeyDown={
        onNavigate ? (e) => e.key === 'Enter' && onNavigate() : undefined
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 14px 16px',
        background:
          hovered && onNavigate
            ? 'color-mix(in srgb, var(--glass-bg) 90%, var(--accent-primary) 10%)'
            : 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid var(--glass-border)',
        borderRadius: '14px',
        boxShadow:
          hovered && onNavigate
            ? '0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px var(--accent-primary)'
            : '0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px var(--glass-border)',
        animation: 'notifSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        minWidth: '272px',
        maxWidth: '320px',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-sans, Outfit, system-ui, sans-serif)',
        cursor: onNavigate ? 'pointer' : 'default',
        transition: 'background 0.15s ease, box-shadow 0.15s ease',
        position: 'relative',
        outline: 'none',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background:
            'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '15px',
          color: '#ffffff',
          flexShrink: 0,
          boxShadow: '0 0 0 2px var(--avatar-ring), var(--btn-shadow)',
        }}
      >
        {initial}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Type badge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--accent-primary)',
            marginBottom: '4px',
            opacity: 0.9,
          }}
        >
          {badgeIcon}
          {badgeLabel}
        </div>

        {/* Title */}
        <div
          style={{
            fontWeight: 700,
            fontSize: '13.5px',
            lineHeight: 1.25,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '3px',
          }}
        >
          {title}
        </div>

        {/* Message preview */}
        <div
          style={
            {
              fontSize: '12px',
              lineHeight: 1.45,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            } as React.CSSProperties
          }
        >
          {body}
        </div>
      </div>

      {/* Dismiss (×) button */}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          fontSize: '14px',
          opacity: 0.7,
          transition: 'opacity 0.15s ease, background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          (e.currentTarget as HTMLButtonElement).style.background =
            'var(--danger-bg)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.7';
          (e.currentTarget as HTMLButtonElement).style.background =
            'transparent';
          (e.currentTarget as HTMLButtonElement).style.color =
            'var(--text-muted)';
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          width="12"
          height="12"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Live dot — top right, below dismiss button */}
      <div
        style={{
          position: 'absolute',
          top: '34px',
          right: '10px',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          boxShadow: '0 0 6px var(--accent-primary)',
          animation: 'notifPulse 1.6s ease-in-out infinite',
        }}
      />
    </div>
  );
}

let globalClient: any = null;

/**
 * Get or initialize the global vibe-message notification client singleton.
 */
export function getNotificationClient() {
  if (globalClient) {
    return globalClient;
  }
  if (typeof window === 'undefined') {
    return null;
  }

  const appId = process.env.NEXT_PUBLIC_VIBE_APP_ID;
  const publicKey = process.env.NEXT_PUBLIC_VIBE_PUBLIC_KEY;

  if (!appId || !publicKey) {
    console.warn(
      'Vibe Message credentials are not set. Web push notifications are disabled.',
    );
    return null;
  }

  try {
    globalClient = initNotificationClient({
      appId,
      publicKey,
    });
    return globalClient;
  } catch (error) {
    console.error(
      'Failed to initialize Vibe Message notification client:',
      error,
    );
    return null;
  }
}

export function useNotificationClient(
  user: User | null,
  setIsDMMode?: (val: boolean) => void,
) {
  const [client, setClient] = useState<any>(null);
  const registeredUserIdRef = useRef<string | null>(null);
  const dispatch = useAppDispatch();

  const activeConversationId = useAppSelector(
    (s) => s.chat.activeConversationId,
  );
  const activeChannelId = useAppSelector((s) => s.groups.activeChannelId);
  const activeGroupId = useAppSelector((s) => s.groups.activeGroupId);
  const mutedConversationIds = useAppSelector(
    (s) => s.chat.mutedConversationIds,
  );

  const activeConversationIdRef = useRef(activeConversationId);
  const activeChannelIdRef = useRef(activeChannelId);
  const activeGroupIdRef = useRef(activeGroupId);
  const mutedConversationIdsRef = useRef(mutedConversationIds);
  const userRef = useRef(user);
  // Stable ref so navigation callbacks inside the onMessage closure always
  // use the latest dispatch without needing it in the effect dependency array.
  const dispatchRef = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    activeGroupIdRef.current = activeGroupId;
  }, [activeGroupId]);

  useEffect(() => {
    mutedConversationIdsRef.current = mutedConversationIds;
  }, [mutedConversationIds]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load persisted muted conversation IDs from localStorage when user is known
  useEffect(() => {
    if (user?.id) {
      dispatch(loadMutedConversations(user.id));
    }
  }, [user?.id, dispatch]);

  // Initialize client on mount
  useEffect(() => {
    const c = getNotificationClient();
    if (c) {
      setClient(c);

      c.onMessage((payload: any) => {
        PrintLog('Vibe Message Foreground payload:', payload);

        // Suppress if user turned off in-app notifications in settings
        if (userRef.current?.notificationsInAppEnabled === false) {
          PrintLog(
            'Ignored foreground notification: In-app notifications are disabled',
          );
          return;
        }

        // Extract metadata and message content
        let meta: any = {};
        let messageText = payload.body || '';

        if (payload.data && Object.keys(payload.data).length > 0) {
          meta = payload.data;
        } else {
          // Fallback for compatibility or if data is stringified in body
          try {
            meta = JSON.parse(payload.body || '{}');
            messageText = meta.message || messageText;
          } catch {
            meta = {};
          }
        }

        // ── Friend Request Notifications ───────────────────────────────────
        if (meta.type === 'friend_request') {
          if (userRef.current?.notificationsFriendRequestEnabled === false) {
            PrintLog('Suppressed: friend request notifications are disabled');
            return;
          }
          const senderName = meta.senderName || 'Someone';
          const initial = senderName.charAt(0).toUpperCase();

          const toastId = `friend-req-${Date.now()}`;

          showToast.notification(
            <NotifCard
              initial={initial}
              badgeLabel="Friend Request"
              badgeIcon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="10"
                  height="10"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              }
              title="New Friend Request"
              body={
                <>
                  <span
                    style={{ fontWeight: 600, color: 'var(--accent-primary)' }}
                  >
                    {senderName}
                  </span>{' '}
                  sent you a friend request!
                </>
              }
              onDismiss={() => toast.dismiss(toastId)}
            />,
            {
              toastId,
              icon: false,
              closeButton: false,
              className: 'custom-inapp-toast-container',
              autoClose: 5000,
              hideProgressBar: true,
            },
          );
          return;
        }

        const msgConvoId = meta.conversationId || payload.data?.conversationId;
        const msgGroupId = meta.groupId || '';
        // isMention: backend sets this true when the push is for a direct @mention.
        // We never suppress @mention pushes even if the channel is active — the user
        // should always be alerted when someone pings them.
        const isMention = meta.isMention === true || meta.isMention === 'true';

        // ── Mute Check — suppress if this thread is muted by the local user ──
        if (
          msgConvoId &&
          mutedConversationIdsRef.current.includes(msgConvoId)
        ) {
          PrintLog('Suppressed: conversation is muted by user', msgConvoId);
          return;
        }

        // Suppress if user is currently viewing this DM conversation
        // (never suppress @mention pings)
        if (
          !isMention &&
          msgConvoId &&
          msgConvoId === activeConversationIdRef.current
        ) {
          PrintLog('Suppressed: user is viewing DM conversation', msgConvoId);
          return;
        }

        // Suppress if user is currently viewing this group channel
        // (never suppress @mention pings — user should always see when mentioned)
        if (
          !isMention &&
          msgConvoId &&
          msgConvoId === activeChannelIdRef.current
        ) {
          PrintLog('Suppressed: user is viewing group channel', msgConvoId);
          return;
        }

        // Suppress if user is in the same group and channel matches
        if (
          !isMention &&
          msgGroupId &&
          msgGroupId === activeGroupIdRef.current &&
          msgConvoId === activeChannelIdRef.current
        ) {
          PrintLog(
            'Suppressed: user is viewing this group channel',
            msgGroupId,
            msgConvoId,
          );
          return;
        }

        const isDm = meta.isDm === 'true' || meta.isDm === true;
        const senderName = meta.senderName || 'Someone';

        let toastTitle = '';
        const toastBody = messageText;

        if (isDm) {
          toastTitle = senderName;
        } else {
          const groupName = meta.groupName || 'Group';
          const channelName = meta.channelName || 'general';
          toastTitle = `${groupName} › #${channelName}`;
        }

        const initial = senderName.charAt(0).toUpperCase();

        const dmIcon = (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="10"
            height="10"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
        const groupIcon = (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="10"
            height="10"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        );

        const toastId = `msg-${msgConvoId ?? ''}-${Date.now()}`;

        // Build the navigation callback
        const handleNavigate = msgConvoId
          ? () => {
              if (isDm) {
                dispatchRef.current(setActiveConversation(msgConvoId));
              } else {
                dispatchRef.current(setActiveGroup(msgGroupId));
                dispatchRef.current(setActiveChannel(msgConvoId));
              }
              toast.dismiss(toastId);
            }
          : undefined;

        showToast.notification(
          <NotifCard
            initial={initial}
            badgeLabel={isDm ? 'Direct Message' : 'Group Message'}
            badgeIcon={isDm ? dmIcon : groupIcon}
            title={toastTitle}
            body={
              isDm ? (
                toastBody
              ) : (
                <>
                  <span
                    style={{ fontWeight: 600, color: 'var(--accent-primary)' }}
                  >
                    {senderName}:{' '}
                  </span>
                  {toastBody}
                </>
              )
            }
            onDismiss={() => toast.dismiss(toastId)}
            onNavigate={handleNavigate}
          />,
          {
            toastId,
            icon: false,
            closeButton: false,
            className: 'custom-inapp-toast-container',
            autoClose: 5000,
            hideProgressBar: true,
          },
        );
      });

      c.onBackgroundMessage((payload: any) => {
        PrintLog('Vibe Message Background click payload:', payload);
        if (payload) {
          const msgConvoId = payload.conversationId;
          const msgGroupId = payload.groupId || '';
          const isDm = payload.isDm === 'true' || payload.isDm === true;

          if (msgConvoId) {
            if (isDm) {
              if (setIsDMMode) {
                setIsDMMode(true);
              }
              dispatchRef.current(setActiveGroup(null));
              dispatchRef.current(setActiveConversation(msgConvoId));
            } else {
              if (setIsDMMode) {
                setIsDMMode(false);
              }
              dispatchRef.current(setActiveGroup(msgGroupId));
              dispatchRef.current(setActiveChannel(msgConvoId));
            }
          }
        }
      });

      c.onSilentMessage((data: any) => {
        PrintLog('Vibe Message Silent payload:', data);
      });
    }
  }, []);

  // Reactively register or unregister based on user or client changes
  useEffect(() => {
    if (!client) {
      return;
    }

    const register = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      const deviceId = localStorage.getItem('rf_device_id');

      // Determine if platform notifications are enabled for this user + device
      let platformNotificationsEnabled = true;
      if (user) {
        if (user.notificationsEnabled === false) {
          platformNotificationsEnabled = false;
        } else if (user.loggedInDevices && deviceId) {
          try {
            const devices = JSON.parse(user.loggedInDevices);
            if (Array.isArray(devices)) {
              const currentDevice = devices.find(
                (d: any) => d.deviceId === deviceId,
              );
              if (
                currentDevice &&
                currentDevice.notificationsEnabled === false
              ) {
                platformNotificationsEnabled = false;
              }
            }
          } catch {
            // ignore
          }
        }
      }

      // Check browser permission status
      const permission =
        'Notification' in window ? Notification.permission : 'default';
      const compositeId =
        user && deviceId ? `${user.id}:${deviceId}` : user?.id;

      // Handle logout / unregistration of previous session
      if (!user || !user.id || !compositeId) {
        const oldCompositeId = registeredUserIdRef.current;
        if (oldCompositeId && permission === 'granted') {
          try {
            PrintLog(
              `User logged out. Unregistering device: ${oldCompositeId}`,
            );
            await client.unregisterDevice(oldCompositeId);
            registeredUserIdRef.current = null;
          } catch (error) {
            console.error('Failed to unregister device on logout:', error);
          }
        }
        return;
      }

      // Case 3: Notification permission is denied
      if (permission === 'denied') {
        PrintLog(
          'Push notifications browser permission is denied. Skipping Vibe Message API calls.',
        );
        registeredUserIdRef.current = null;
        return;
      }

      // Case 1: Notifications enabled (both globally/device on platform AND browser permission granted)
      if (platformNotificationsEnabled && permission === 'granted') {
        if (registeredUserIdRef.current === compositeId) {
          return; // Already registered
        }
        try {
          PrintLog(`Registering device for user composite ID: ${compositeId}`);
          await client.registerDevice({
            externalUserId: compositeId,
            serviceWorkerPath: '/push-sw.js',
            serviceWorkerScope: '/',
          });
          registeredUserIdRef.current = compositeId;
          PrintLog('Device registered successfully for notifications.');
        } catch (error) {
          console.error(
            'Failed to register device for push notifications:',
            error,
          );
        }
      }
      // Case 2: Notification permission is granted, but user manually turned off notifications on the platform
      else if (!platformNotificationsEnabled && permission === 'granted') {
        // If we were previously registered (or we want to make sure it's clean), unregister
        try {
          PrintLog(
            `Platform notifications are disabled but permission is granted. Unregistering device: ${compositeId}`,
          );
          await client.unregisterDevice(compositeId);
          registeredUserIdRef.current = null;
          PrintLog('Device unregistered successfully.');
        } catch (error) {
          console.error(
            'Failed to unregister device for push notifications:',
            error,
          );
        }
      }
      // Case 4: Permission is 'default' (not granted, not denied) - do not register, do not unregister
      else {
        PrintLog(
          `Browser permission is 'default'. Skipping register/unregister.`,
        );
        registeredUserIdRef.current = null;
      }
    };

    register();
  }, [client, user]);

  // Handle URL redirection query params from push notifications on mount/hydration
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const convoId = searchParams.get('notificationConvoId');
    const groupId = searchParams.get('notificationGroupId');
    const isDm = searchParams.get('isDm') === 'true';

    if (convoId) {
      PrintLog('Redirecting via query params:', { convoId, groupId, isDm });

      if (isDm) {
        if (setIsDMMode) {
          setIsDMMode(true);
        }
        dispatch(setActiveGroup(null));
        dispatch(setActiveConversation(convoId));
      } else if (groupId) {
        if (setIsDMMode) {
          setIsDMMode(false);
        }
        dispatch(setActiveGroup(groupId));
        dispatch(setActiveChannel(convoId));
      }

      // Clean up search parameters from URL so they don't trigger again on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('notificationConvoId');
      url.searchParams.delete('notificationGroupId');
      url.searchParams.delete('isDm');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [dispatch, setIsDMMode]);
}
