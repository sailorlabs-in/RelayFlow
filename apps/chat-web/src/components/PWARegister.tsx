'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register('/push-sw.js', { scope: '/' })
      .then((reg) => {
        console.log('PWA Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('PWA Service Worker registration failed:', err);
      });

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === 'SILENT_MESSAGE' &&
        event.data.data?.action === 'clear-cache-reload'
      ) {
        console.log(
          'Received clear-cache-reload command. Clearing cache and reloading...',
        );
        if ('caches' in window) {
          caches.keys().then((keys) => {
            Promise.all(keys.map((key) => caches.delete(key))).catch(
              console.error,
            );
          });
        }
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => {
            Promise.all(
              registrations.map((registration) => registration.unregister()),
            ).then(() => {
              window.location.reload();
            });
          })
          .catch(() => {
            window.location.reload();
          });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}
