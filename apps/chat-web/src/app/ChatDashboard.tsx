'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ProfileSettingsContent } from './profile/page';
import { useAppDispatch, useAppSelector } from '../store';
import {
  logoutUser,
  updateUserProfile,
  setThemeMode,
} from '../store/slices/authSlice';
import { fetchConversations } from '../store/slices/chatSlice';
import { socketManager } from '../store/socketManager';
import StoreProvider from '../store/StoreProvider';
import { INACTIVITY_TIMEOUT_MS } from '@chat-app/shared-constants';

// Import extracted modular components
import { AuthGate } from '../components/AuthGate';
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatArea } from '../components/ChatArea';
import { ComposeModal } from '../components/ComposeModal';
import { Theme } from '../components/ThemeSwitcher';

function ChatDashboardContent() {
  const dispatch = useAppDispatch();

  const { user, accessToken } = useAppSelector((s) => s.auth);
  const { activeConversationId } = useAppSelector((s) => s.chat);

  // --- Modal & Panel States ---
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [autoStatus, setAutoStatus] = useState<'online' | 'away'>('online');

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleThemeChange = useCallback((t: Theme) => {
    dispatch(setThemeMode(t));
    if (user && user.themeMode !== t) {
      dispatch(updateUserProfile({ themeMode: t }));
    }
  }, [user, dispatch]);

  const handleLogout = useCallback(() => {
    socketManager.disconnect();
    dispatch(logoutUser());
  }, [dispatch]);

  // ---- Socket + conversations fetch on login ----
  useEffect(() => {
    if (accessToken && user) {
      dispatch(fetchConversations(user.id));
      socketManager.connect(accessToken);
      
      return () => {
        socketManager.disconnect();
      };
    }
    return undefined;
  }, [accessToken, user, dispatch]);

  const manualStatus = user?.status || 'online';
  const ownStatus = manualStatus === 'online' ? autoStatus : manualStatus;

  // Sync ownStatus with document dataset
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.ownStatus = ownStatus;
  }

  // Ref to access current values inside listeners without re-binding
  const autoStatusRef = useRef(autoStatus);
  useEffect(() => {
    autoStatusRef.current = autoStatus;
  }, [autoStatus]);

  // ---- Inactivity detection: auto-away after 2 minutes ----
  useEffect(() => {
    if (!accessToken || !user) return;

    if (manualStatus !== 'online') {
      // Clear timers and broadcast manual status
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      socketManager.updateStatus(manualStatus, 'online');
      return;
    }

    // Otherwise, we are manually 'online'
    const INACTIVITY_MS = INACTIVITY_TIMEOUT_MS;

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      if (autoStatusRef.current === 'away') {
        setAutoStatus('online');
        socketManager.updateStatus('online', 'online');
      }

      inactivityTimerRef.current = setTimeout(() => {
        setAutoStatus('away');
        socketManager.updateStatus('online', 'away');
      }, INACTIVITY_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        setAutoStatus('away');
        socketManager.updateStatus('online', 'away');
      } else {
        resetTimer();
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check
    resetTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, user?.id, manualStatus]);

  // ── RENDER: Auth Gate ──
  if (!accessToken || !user) {
    return <AuthGate />;
  }

  return (
    <div className="flex h-screen w-screen p-3.5 gap-3.5"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Sidebar Panel */}
      <ChatSidebar
        ownStatus={ownStatus}
        setIsProfileOpen={setIsProfileOpen}
        setIsComposeOpen={setIsComposeOpen}
        handleLogout={handleLogout}
        handleThemeChange={handleThemeChange}
      />

      {/* Message Feed / Workspace Area */}
      <ChatArea
        activeConversationId={activeConversationId}
        setIsComposeOpen={setIsComposeOpen}
      />

      {/* Compose Conversation Modal */}
      {isComposeOpen && (
        <ComposeModal onClose={() => setIsComposeOpen(false)} />
      )}

      {/* Profile Settings Modal */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(4,6,12,0.65)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          onClick={() => setIsProfileOpen(false)}
        >
          <div
            className="w-[800px] max-w-full h-[85vh] flex flex-col overflow-hidden animate-slide-up"
            style={{
              background: 'var(--glass-bg)',
              border: '1.5px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '18px',
              boxShadow: 'var(--glass-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileSettingsContent isModal onClose={() => setIsProfileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatDashboard() {
  return (
    <StoreProvider>
      <ChatDashboardContent />
    </StoreProvider>
  );
}
