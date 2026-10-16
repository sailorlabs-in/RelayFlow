'use client';

import { useRef, useCallback } from 'react';
import type { Message } from '../../store/slices/chatSlice';

interface UseMessageLongPressOptions {
  msg: Message;
  isMobile: boolean;
  onLongPress?: (coords: { x: number; y: number }, msg: Message) => void;
  threshold?: number;
}

export function useMessageLongPress({
  msg,
  isMobile,
  onLongPress,
  threshold = 400,
}: UseMessageLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasTriggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || e.touches.length !== 1) {
        return;
      }

      const target = e.target as HTMLElement;
      // Do not trigger long-press when interacting with buttons, links, or inputs
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a')
      ) {
        return;
      }

      const touch = e.touches[0];
      hasTriggeredRef.current = false;
      startCoordsRef.current = { x: touch.clientX, y: touch.clientY };

      clear();

      timerRef.current = setTimeout(() => {
        hasTriggeredRef.current = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(40);
          } catch {
            // Ignore if vibration is not allowed by permissions
          }
        }
        onLongPress?.(startCoordsRef.current, msg);
      }, threshold);
    },
    [isMobile, clear, threshold, onLongPress, msg],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!timerRef.current || e.touches.length === 0) {
        return;
      }
      const touch = e.touches[0];
      const dist = Math.hypot(
        touch.clientX - startCoordsRef.current.x,
        touch.clientY - startCoordsRef.current.y,
      );
      // Cancel long-press if user moves finger by more than 10px (scrolling)
      if (dist > 10) {
        clear();
      }
    },
    [clear],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      clear();
      if (hasTriggeredRef.current) {
        e.preventDefault();
      }
    },
    [clear],
  );

  const onTouchCancel = useCallback(() => {
    clear();
  }, [clear]);

  const onClick = useCallback((e: React.MouseEvent) => {
    if (hasTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasTriggeredRef.current = false;
    }
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    onClick,
  };
}
