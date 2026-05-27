"use client";

import { useCallback, useRef, type TouchEvent as ReactTouchEvent } from "react";

const SWIPE_THRESHOLD_PX = 48;

interface UseHorizontalSwipeOptions {
  enabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

/** Horizontal swipe — ignores gestures that look like vertical scrolling */
export function useHorizontalSwipe({
  enabled = true,
  onSwipeLeft,
  onSwipeRight,
}: UseHorizontalSwipeOptions) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || !enabled) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

      if (deltaX < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
    [enabled, onSwipeLeft, onSwipeRight]
  );

  return { onTouchStart, onTouchEnd };
}
