'use client';

import { useEffect, useRef, useMemo, useState } from 'react';

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

// ---------------------------------------------------------------------------
// Manual Back Handler Registry
// ---------------------------------------------------------------------------

export interface BackHandlerRegistration {
  id: string;
  priority: number;
  handler: () => boolean | void;
}

const manualHandlers: BackHandlerRegistration[] = [];
const registryListeners = new Set<() => void>();

function notifyRegistryListeners() {
  registryListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      void 0;
    }
  });
}

/**
 * Imperatively register a manual back handler.
 * Returns an unregister function to remove it when closed/destroyed.
 */
export function registerBackHandler(
  handler: () => boolean | void,
  priority = 0,
): () => void {
  const id = Math.random().toString(36).substring(2, 9);
  manualHandlers.push({ id, priority, handler });
  manualHandlers.sort((a, b) => b.priority - a.priority);
  notifyRegistryListeners();

  return () => {
    const idx = manualHandlers.findIndex((h) => h.id === id);
    if (idx !== -1) {
      manualHandlers.splice(idx, 1);
      notifyRegistryListeners();
    }
  };
}

/**
 * Declarative hook: Any component, modal, or sheet can register its own
 * back action locally. When enabled is true, back events are intercepted.
 */
export function useBackHandler(
  handler: () => boolean | void,
  enabled = true,
  priority = 0,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return registerBackHandler(() => handlerRef.current(), priority);
  }, [enabled, priority]);
}

/**
 * Programmatically triggers the mobile back event from any button or gesture.
 */
export function triggerBack(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  window.history.back();
  return true;
}

// ---------------------------------------------------------------------------
// Layer Dismissal Logic
// ---------------------------------------------------------------------------

/**
 * Returns the dismissal action for the topmost active layer on mobile.
 * When on the root of chats, groups, friends, or profile (with nothing open),
 * returns null (NO back event).
 */
function getTopmostDismissAction(
  opts: UseMobileBackHandlerOptions,
): (() => void) | null {
  // Manual registered handlers have highest priority
  if (manualHandlers.length > 0) {
    const topEntry = manualHandlers[manualHandlers.length - 1];
    return () => {
      topEntry.handler();
    };
  }

  // Layer 4: Menus, Overlays, and Confirmations
  if (opts.contextMenu) {
    return () => opts.setContextMenu(null);
  }
  if (opts.localConfirmModal) {
    return () => opts.setLocalConfirmModal(null);
  }
  if (opts.confirmModal) {
    return () => opts.setConfirmModal?.(null);
  }

  // Layer 3: Floating Modals
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

  // Layer 2: Group Member Drawer
  if (opts.isMembersListOpen) {
    return () => opts.setIsMembersListOpen?.(false);
  }

  // Layer 1: Sub-views (Active Chat or Profile Settings Subpage)
  if (opts.showChatArea) {
    return () => opts.onCloseChat();
  }
  if (opts.activeTab === 'profile' && opts.profileSubPage !== 'root') {
    return () => opts.setProfileSubPage('root');
  }

  // Layer 0: Root of any main tab (chats, groups, friends, profile)
  // No back event within the app! Returns null so back exits the web app.
  return null;
}

export function useMobileBackHandler(options: UseMobileBackHandlerOptions) {
  const { enabled } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [manualCount, setManualCount] = useState<number>(manualHandlers.length);

  useEffect(() => {
    const onRegistryChange = () => setManualCount(manualHandlers.length);
    registryListeners.add(onRegistryChange);
    return () => {
      registryListeners.delete(onRegistryChange);
    };
  }, []);

  const historyDepthRef = useRef<number>(0);
  const isHandlingPopstateRef = useRef<boolean>(false);
  const isProgrammaticBackRef = useRef<boolean>(false);

  // Compute current target depth:
  // Root of chats, groups, friends, profile = depth 0 (clean root, no back stack).
  // Sub-views, drawers, modals, overlays, or manual handlers = depth > 0 (back active).
  const targetDepth = useMemo(() => {
    let depth = 0; // Root of chats, groups, friends, or profile

    // Sub-view (Active Chat Area or Profile Subpage)
    if (
      options.showChatArea ||
      (options.activeTab === 'profile' && options.profileSubPage !== 'root')
    ) {
      depth += 1;
    }

    // Drawer (Member List)
    if (options.isMembersListOpen) {
      depth += 1;
    }

    // Modals
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

    // Overlays / Confirmations
    const isAnyOverlayOpen = Boolean(
      options.localConfirmModal || options.confirmModal || options.contextMenu,
    );
    if (isAnyOverlayOpen) {
      depth += 1;
    }

    // Manual registered handlers
    depth += manualCount;

    return depth;
  }, [
    options.showChatArea,
    options.activeTab,
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
    manualCount,
  ]);

  // Initial history base setup on mobile mount
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const state = window.history.state;
    if (!state || !state.rfMobile) {
      // Set base history state at depth 0
      window.history.replaceState(
        { rfMobile: true, depth: 0, isBase: true },
        '',
        window.location.href,
      );
      historyDepthRef.current = 0;
    } else {
      historyDepthRef.current = state.depth ?? 0;
    }

    const handlePopState = (e: PopStateEvent) => {
      if (!optionsRef.current.enabled) {
        return;
      }

      // If this pop was triggered programmatically (e.g. UI close button unwinding history), ignore
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
      } else {
        // At root screen of Chats, Groups, Friends, or Profile:
        // No back event within the app — user quits the webapp!
        try {
          window.close();
        } catch {
          // Browser may restrict window.close(); fall through to history back
          void 0;
        }
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.history.back();
          }
        }, 50);
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
      // Forward navigation (opening chat, opening modal, registering manual handler, etc.)
      for (let d = current + 1; d <= target; d += 1) {
        window.history.pushState(
          { rfMobile: true, depth: d },
          '',
          window.location.href,
        );
      }
      historyDepthRef.current = target;
    } else if (target < current) {
      // Backward navigation via UI action (in-app '<' back button, closing modal, or tab switch)
      const diff = current - target;
      isProgrammaticBackRef.current = true;
      historyDepthRef.current = target;
      window.history.go(-diff);

      // If we returned to root, ensure clean base state
      if (target === 0) {
        window.history.replaceState(
          { rfMobile: true, depth: 0, isBase: true },
          '',
          window.location.href,
        );
      }
    } else if (target === 0) {
      // Switching between tabs at root (Chats -> Groups -> Friends -> Profile)
      // Keep depth 0 and clear any back event history
      window.history.replaceState(
        { rfMobile: true, depth: 0, isBase: true },
        '',
        window.location.href,
      );
    }
  }, [targetDepth, enabled]);
}
