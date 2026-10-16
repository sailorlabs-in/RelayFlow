'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  updateUserProfile,
  setLocalHotReactions,
} from '../../store/slices/authSlice';

export const DEFAULT_HOT_REACTIONS = ['👍', '❤️', '😂', '😮', '🔥'];
export const MAX_HOT_REACTIONS = 5;

const STORAGE_PREFIX = 'rf-hot-reactions-';

/**
 * Reads stored hot reactions from localStorage or user profile.
 * Always returns between 1 and MAX_HOT_REACTIONS emojis.
 */
export function getStoredHotReactions(
  userId?: string,
  userProfileHotReactions?: string,
): string[] {
  // If user profile has hot reactions from DB/Redis, prioritize it
  if (userProfileHotReactions) {
    try {
      const parsed = JSON.parse(userProfileHotReactions);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed
          .filter((e) => typeof e === 'string' && e.trim().length > 0)
          .slice(0, MAX_HOT_REACTIONS);
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    } catch {
      // Fallback to localStorage
    }
  }

  if (typeof window === 'undefined') {
    return DEFAULT_HOT_REACTIONS;
  }
  try {
    // Check if chat_user in localStorage has server hot reactions
    const cachedUser = localStorage.getItem('chat_user');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        if (u && u.hotReactions && (!userId || u.id === userId)) {
          const parsed = JSON.parse(u.hotReactions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed
              .filter((e) => typeof e === 'string' && e.trim().length > 0)
              .slice(0, MAX_HOT_REACTIONS);
            if (cleaned.length > 0) {
              return cleaned;
            }
          }
        }
      } catch {
        // continue
      }
    }

    const key = userId
      ? `${STORAGE_PREFIX}${userId}`
      : `${STORAGE_PREFIX}default`;
    const stored =
      localStorage.getItem(key) || localStorage.getItem('rf-hot-reactions');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed
          .filter((e) => typeof e === 'string' && e.trim().length > 0)
          .slice(0, MAX_HOT_REACTIONS);
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  } catch (err) {
    console.error('Failed to read hot reactions from localStorage:', err);
  }
  return DEFAULT_HOT_REACTIONS;
}

/**
 * Persists updated hot reactions to localStorage and notifies listening components.
 */
export function saveStoredHotReactions(
  reactions: string[],
  userId?: string,
): string[] {
  const cleaned = reactions
    .filter((e) => typeof e === 'string' && e.trim().length > 0)
    .slice(0, MAX_HOT_REACTIONS);
  const finalReactions =
    cleaned.length > 0 ? cleaned : [...DEFAULT_HOT_REACTIONS];

  if (typeof window !== 'undefined') {
    try {
      const key = userId
        ? `${STORAGE_PREFIX}${userId}`
        : `${STORAGE_PREFIX}default`;
      localStorage.setItem(key, JSON.stringify(finalReactions));
      localStorage.setItem('rf-hot-reactions', JSON.stringify(finalReactions));
      window.dispatchEvent(
        new CustomEvent('rf-hot-reactions-updated', {
          detail: { reactions: finalReactions, userId },
        }),
      );
    } catch (err) {
      console.error('Failed to save hot reactions to localStorage:', err);
    }
  }
  return finalReactions;
}

/**
 * Custom hook to manage and synchronize hot reactions across components,
 * localStorage, PostgreSQL DB, and Redis cache seamlessly across all user devices.
 */
export function useHotReactions(userId?: string) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const effectiveUserId = userId || currentUser?.id;
  const dbHotReactions = currentUser?.hotReactions;

  const [hotReactions, setHotReactionsState] = useState<string[]>(() =>
    getStoredHotReactions(effectiveUserId, dbHotReactions),
  );

  // Sync when user logs in or profile updates from Redis/DB
  useEffect(() => {
    if (dbHotReactions) {
      try {
        const parsed = JSON.parse(dbHotReactions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed
            .filter((e) => typeof e === 'string' && e.trim().length > 0)
            .slice(0, MAX_HOT_REACTIONS);
          if (cleaned.length > 0) {
            setHotReactionsState(cleaned);
            saveStoredHotReactions(cleaned, effectiveUserId);
            return;
          }
        }
      } catch {
        // Fallback to local
      }
    }
    setHotReactionsState(
      getStoredHotReactions(effectiveUserId, dbHotReactions),
    );
  }, [effectiveUserId, dbHotReactions]);

  // Listen for local tab/window updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{
        reactions?: string[];
        userId?: string;
      }>;
      if (customEvent.detail?.reactions) {
        setHotReactionsState(customEvent.detail.reactions);
      } else {
        setHotReactionsState(
          getStoredHotReactions(effectiveUserId, dbHotReactions),
        );
      }
    };

    window.addEventListener('rf-hot-reactions-updated', handleUpdate);
    return () => {
      window.removeEventListener('rf-hot-reactions-updated', handleUpdate);
    };
  }, [effectiveUserId, dbHotReactions]);

  const updateHotReactions = useCallback(
    (newReactions: string[]) => {
      const saved = saveStoredHotReactions(newReactions, effectiveUserId);
      setHotReactionsState(saved);

      // Persist to PostgreSQL DB and Redis via Gateway
      if (effectiveUserId) {
        const stringified = JSON.stringify(saved);
        dispatch(setLocalHotReactions(stringified));
        dispatch(updateUserProfile({ hotReactions: stringified }));
      }
    },
    [dispatch, effectiveUserId],
  );

  const resetToDefault = useCallback(() => {
    updateHotReactions(DEFAULT_HOT_REACTIONS);
  }, [updateHotReactions]);

  return {
    hotReactions,
    updateHotReactions,
    resetToDefault,
    maxReactions: MAX_HOT_REACTIONS,
  };
}
