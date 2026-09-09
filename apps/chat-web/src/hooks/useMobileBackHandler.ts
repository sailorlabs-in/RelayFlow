'use client';

import { useEffect, useRef, useMemo } from 'react';
import { showToast } from '../components/toast';

export interface UseMobileBackHandlerOptions {
  enabled: boolean;

  // Active navigation tab
  activeTab: 'chats' | 'groups' | 'friends' | 'profile';
  setActiveTab: (tab: 'chats' | 'groups' | 'friends' | 'profile') => void;

  // Active chat screen (DM or Group Channel)
  showChatArea: boolean;
  onCloseChat: () => void;

  // Profile sub-page
  profileSubPage:
    | 'root'
    | 'account'
    | 'theme'
    | 'status'
    | 'notifications'
    | 'update-notes';
  setProfileSubPage: (
    page:
      | 'root'
      | 'account'
      | 'theme'
      | 'status'
      | 'notifications'
      | 'update-notes',
  ) => void;

  // Hold gesture context menu
  contextMenu: any;
  setContextMenu: (menu: any) => void;

  // Confirmation dialogs
  localConfirmModal: any;
  setLocalConfirmModal: (modal: any) => void;
  confirmModal?: any;
  setConfirmModal?: (modal: any) => void;

  // Drawers
  isMembersListOpen?: boolean;
  setIsMembersListOpen?: (open: boolean) => void;

  // Modals
  isComposeOpen?: boolean;
  setIsComposeOpen?: (open: boolean) => void;

  isCreateGroupOpen?: boolean;
  setIsCreateGroupOpen?: (open: boolean) => void;

  isCreateChannelOpen?: boolean;
  setIsCreateChannelOpen?: (open: boolean) => void;

  isCreateSectionOpen?: boolean;
  setIsCreateSectionOpen?: (open: boolean) => void;

  isInviteMembersOpen?: boolean;
  setIsInviteMembersOpen?: (open: boolean) => void;

  isGroupSettingsOpen?: boolean;
  setIsGroupSettingsOpen?: (open: boolean) => void;

  isChannelSettingsOpen?: boolean;
  setIsChannelSettingsOpen?: (open: boolean) => void;

  isProfileOpen?: boolean;
  setIsProfileOpen?: (open: boolean) => void;

  showUpdateNoteModal?: boolean;
  setShowUpdateNoteModal?: (open: boolean) => void;
}

/**
 * Returns the dismissal action for the topmost active layer on mobile.
 */
function getTopmostDismissAction(
  opts: UseMobileBackHandlerOptions,
): (() => void) | null {
  // Layer 5: Menus, Overlays, and Confirmations
  if (opts.contextMenu) {
    return () => opts.setContextMenu(null);
  }
  if (opts.localConfirmModal) {
    return () => opts.setLocalConfirmModal(null);
  }
  if (opts.confirmModal) {
    return () => opts.setConfirmModal?.(null);
  }

  // Layer 4: Floating Modals
  if (opts.showUpdateNoteModal) {
    return () => opts.setShowUpdateNoteModal?.(false);
  }
  if (opts.isProfileOpen) {
    return () => opts.setIsProfileOpen?.(false);
  }
  if (opts.isChannelSettingsOpen) {
    return () => opts.setIsChannelSettingsOpen?.(false);
  }
  if (opts.isGroupSettingsOpen) {
    return () => opts.setIsGroupSettingsOpen?.(false);
  }
  if (opts.isInviteMembersOpen) {
    return () => opts.setIsInviteMembersOpen?.(false);
  }
  if (opts.isCreateSectionOpen) {
    return () => opts.setIsCreateSectionOpen?.(false);
  }
  if (opts.isCreateChannelOpen) {
    return () => opts.setIsCreateChannelOpen?.(false);
  }
  if (opts.isCreateGroupOpen) {
    return () => opts.setIsCreateGroupOpen?.(false);
  }
  if (opts.isComposeOpen) {
    return () => opts.setIsComposeOpen?.(false);
  }

  // Layer 3: Group Member Drawer
  if (opts.isMembersListOpen) {
    return () => opts.setIsMembersListOpen?.(false);
  }

  // Layer 2: Sub-views (Active Chat or Profile Settings Subpage)
  if (opts.showChatArea) {
    return () => opts.onCloseChat();
  }
  if (opts.activeTab === 'profile' && opts.profileSubPage !== 'root') {
    return () => opts.setProfileSubPage('root');
  }

  // Layer 1: Non-root tabs (switch back to primary 'chats' tab)
  if (opts.activeTab !== 'chats') {
    return () => opts.setActiveTab('chats');
  }

  // Layer 0: Root (Home Chats list with nothing open)
  return null;
}

export function useMobileBackHandler(options: UseMobileBackHandlerOptions) {
  const { enabled } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const historyDepthRef = useRef<number>(1);
  const isHandlingPopstateRef = useRef<boolean>(false);
  const isProgrammaticBackRef = useRef<boolean>(false);
  const lastExitPressRef = useRef<number>(0);

  // Compute the current target depth based on active visual layers
  const targetDepth = useMemo(() => {
    let depth = 1; // Root tab (chats)

    if (options.activeTab !== 'chats') {
      depth += 1;
    }

    if (
      options.showChatArea ||
      (options.activeTab === 'profile' && options.profileSubPage !== 'root')
    ) {
      depth += 1;
    }

    if (options.isMembersListOpen) {
      depth += 1;
    }

    const isAnyModalOpen = Boolean(
      options.isComposeOpen ||
        options.isCreateGroupOpen ||
        options.isCreateChannelOpen ||
        options.isCreateSectionOpen ||
        options.isInviteMembersOpen ||
        options.isGroupSettingsOpen ||
        options.isChannelSettingsOpen ||
        options.isProfileOpen ||
        options.showUpdateNoteModal,
    );
    if (isAnyModalOpen) {
      depth += 1;
    }

    const isAnyOverlayOpen = Boolean(
      options.localConfirmModal || options.confirmModal || options.contextMenu,
    );
    if (isAnyOverlayOpen) {
      depth += 1;
    }

    return depth;
  }, [
    options.activeTab,
    options.showChatArea,
    options.profileSubPage,
    options.isMembersListOpen,
    options.isComposeOpen,
    options.isCreateGroupOpen,
    options.isCreateChannelOpen,
    options.isCreateSectionOpen,
    options.isInviteMembersOpen,
    options.isGroupSettingsOpen,
    options.isChannelSettingsOpen,
    options.isProfileOpen,
    options.showUpdateNoteModal,
    options.localConfirmModal,
    options.confirmModal,
    options.contextMenu,
  ]);

  // Initial history trap setup on mobile mount
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const state = window.history.state;
    if (!state || !state.rfMobile) {
      // Entry 0: Base trap
      window.history.replaceState(
        { rfMobile: true, depth: 0, isBase: true },
        '',
        window.location.href,
      );
      // Entry 1: Root active
      window.history.pushState(
        { rfMobile: true, depth: 1 },
        '',
        window.location.href,
      );
      historyDepthRef.current = 1;
    } else {
      historyDepthRef.current = state.depth ?? 1;
    }

    const handlePopState = (e: PopStateEvent) => {
      if (!optionsRef.current.enabled) {
        return;
      }

      // If this pop was triggered by our own window.history.go(-diff), ignore it
      if (isProgrammaticBackRef.current) {
        isProgrammaticBackRef.current = false;
        return;
      }

      // User pressed the Android hardware/gesture back button or browser back
      const poppedDepth = e.state?.depth ?? historyDepthRef.current - 1;
      historyDepthRef.current = Math.max(0, poppedDepth);

      const dismissAction = getTopmostDismissAction(optionsRef.current);

      if (dismissAction) {
        isHandlingPopstateRef.current = true;
        dismissAction();
        // At root screen (Chats list, nothing open) -> Double-back to exit pattern
        const now = Date.now();
        if (now - lastExitPressRef.current < 2000) {
          // Confirmed exit within 2 seconds: close webapp
          lastExitPressRef.current = 0;
          try {
            window.close();
          } catch {
            // Browser may disallow script-initiated window closing; fall back to history back
            void 0;
          }
          // In regular browser tabs where script-initiated window.close() may be restricted,
          // pop backward to exit domain
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.history.back();
            }
          }, 50);
        } else {
          // First back press at root: show toast and preserve open state
          lastExitPressRef.current = now;
          showToast.info('Press back again to exit', { autoClose: 2000 });
          window.history.pushState(
            { rfMobile: true, depth: 1 },
            '',
            window.location.href,
          );
          historyDepthRef.current = 1;
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled]);

  // Synchronize targetDepth changes with window.history
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    // If this render was triggered by popstate handling, the browser history
    // has already been popped. Do not push or pop!
    if (isHandlingPopstateRef.current) {
      isHandlingPopstateRef.current = false;
      historyDepthRef.current = targetDepth;
      return;
    }

    const current = historyDepthRef.current;
    const target = targetDepth;

    if (target > current) {
      // Forward navigation (opening chat, opening modal, etc.)
      for (let d = current + 1; d <= target; d++) {
        window.history.pushState(
          { rfMobile: true, depth: d },
          '',
          window.location.href,
        );
      }
      historyDepthRef.current = target;
    } else if (target < current) {
      // Backward navigation via UI action (in-app '<' back button or modal close button)
      const diff = current - target;
      isProgrammaticBackRef.current = true;
      historyDepthRef.current = target;
      window.history.go(-diff);
    }
  }, [targetDepth, enabled]);
}
