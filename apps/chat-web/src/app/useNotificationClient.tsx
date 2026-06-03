'use client';

import React, { useEffect, useRef } from 'react';
import { initNotificationClient } from 'vibe-message';
import { showToast } from '../components/toast';
import type { User } from '../store/slices/authSlice';
import { useAppSelector } from '../store';

export function useNotificationClient(user: User | null) {
  const clientRef = useRef<any>(null);
  const registeredUserIdRef = useRef<string | null>(null);

  const activeConversationId = useAppSelector((s) => s.chat.activeConversationId);
  const activeChannelId = useAppSelector((s) => s.groups.activeChannelId);
  const activeGroupId = useAppSelector((s) => s.groups.activeGroupId);

  const activeConversationIdRef = useRef(activeConversationId);
  const activeChannelIdRef = useRef(activeChannelId);
  const activeGroupIdRef = useRef(activeGroupId);
  const userRef = useRef(user);

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
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const appId = process.env.NEXT_PUBLIC_VIBE_APP_ID;
    const publicKey = process.env.NEXT_PUBLIC_VIBE_PUBLIC_KEY;

    if (!appId || !publicKey) {
      console.warn('Vibe Message credentials are not set. Web push notifications are disabled.');
      return;
    }

    if (!clientRef.current) {
      try {
        console.log('Initializing Vibe Message notification client...');
        clientRef.current = initNotificationClient({
          appId,
          publicKey,
        });

        clientRef.current.onMessage((payload: any) => {
          console.log('Vibe Message Foreground payload:', payload);

          // Suppress if user turned off in-app notifications in settings
          if (userRef.current?.notificationsInAppEnabled === false) {
            console.log('Ignored foreground notification: In-app notifications are disabled');
            return;
          }

          // Parse the JSON body sent from the backend
          let meta: any = {};
          try {
            meta = JSON.parse(payload.body || '{}');
          } catch {
            // If body is not JSON, treat it as plain text fallback
            meta = { message: payload.body || '' };
          }

          const msgConvoId = meta.conversationId || payload.data?.conversationId;
          const msgGroupId = meta.groupId || '';

          // Suppress if user is currently viewing this DM conversation
          if (msgConvoId && msgConvoId === activeConversationIdRef.current) {
            console.log('Suppressed: user is viewing DM conversation', msgConvoId);
            return;
          }

          // Suppress if user is currently viewing this group channel
          if (msgConvoId && msgConvoId === activeChannelIdRef.current) {
            console.log('Suppressed: user is viewing group channel', msgConvoId);
            return;
          }

          // Suppress if user is in the same group and channel matches
          if (msgGroupId && msgGroupId === activeGroupIdRef.current && msgConvoId === activeChannelIdRef.current) {
            console.log('Suppressed: user is viewing this group channel', msgGroupId, msgConvoId);
            return;
          }

          const isDm = meta.isDm === 'true' || meta.isDm === true;
          const senderName = meta.senderName || 'Someone';
          const messageText = meta.message || '';

          let toastTitle = '';
          let toastBody = '';

          if (isDm) {
            toastTitle = senderName;
            toastBody = messageText;
          } else {
            const groupName = meta.groupName || 'Group';
            const channelName = meta.channelName || 'general';
            toastTitle = `${groupName}(${channelName})`;
            toastBody = messageText;
          }

          const initial = senderName.charAt(0).toUpperCase();

          showToast.notification(
            <div className="flex items-center gap-3 p-1 font-sans">
              <div className="avatar-base w-10 h-10 text-[14px] shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14.5px] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                  {toastTitle}
                </div>
                <div className="text-[12.5px] leading-snug mt-0.5 break-words" style={{ color: 'var(--text-muted)' }}>
                  {isDm ? (
                    toastBody
                  ) : (
                    <>
                      <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{senderName}:</span>{' '}
                      {toastBody}
                    </>
                  )}
                </div>
              </div>
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                style={{ background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }}
              />
            </div>,
            {
              icon: false,
              closeButton: true,
              className: 'custom-inapp-toast-container',
              autoClose: 4000,
            }
          );
        });

        clientRef.current.onBackgroundMessage((payload: any) => {
          console.log('Vibe Message Background click payload:', payload);
        });

        clientRef.current.onSilentMessage((data: any) => {
          console.log('Vibe Message Silent payload:', data);
        });
      } catch (error) {
        console.error('Failed to initialize Vibe Message notification client:', error);
      }
    }
  }, []);

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    const register = async () => {
      if (user && user.id && user.notificationsEnabled !== false) {
        if (registeredUserIdRef.current === user.id) return;
        try {
          console.log(`Registering device for user: ${user.id}`);
          await client.registerDevice({
            externalUserId: user.id,
            serviceWorkerPath: '/push-sw.js',
            serviceWorkerScope: '/',
          });
          registeredUserIdRef.current = user.id;
          console.log('Device registered successfully for notifications.');
        } catch (error) {
          console.error('Failed to register device for push notifications:', error);
        }
      } else {
        const oldUserId = registeredUserIdRef.current;
        if (oldUserId) {
          try {
            console.log(`Unregistering device for user: ${oldUserId}`);
            await client.unregisterDevice(oldUserId);
            registeredUserIdRef.current = null;
            console.log('Device unregistered successfully.');
          } catch (error) {
            console.error('Failed to unregister device for push notifications:', error);
          }
        }
      }
    };

    register();
  }, [user]);
}
