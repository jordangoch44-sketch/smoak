"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
} from "react";

const AUTOPLAY_MS = 5500;
const INTERACTION_PAUSE_MS = 9000;
const SWIPE_THRESHOLD_PX = 48;

interface UseProfileHeroCoverGalleryOptions {
  imageCount: number;
}

export function useProfileHeroCoverGallery({
  imageCount,
}: UseProfileHeroCoverGalleryOptions) {
  const [index, setIndex] = useState(0);
  const pauseUntilRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const count = Math.max(imageCount, 0);
  const canSlide = count > 1;

  const goTo = useCallback(
    (next: number) => {
      if (!canSlide) return;
      setIndex((next + count) % count);
    },
    [canSlide, count]
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  const registerInteraction = useCallback(() => {
    pauseUntilRef.current = Date.now() + INTERACTION_PAUSE_MS;
  }, []);

  useEffect(() => {
    if (!canSlide) return;

    const timer = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [canSlide, count]);

  const onTouchStart = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || !canSlide) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

      registerInteraction();
      if (deltaX < 0) goNext();
      else goPrev();
    },
    [canSlide, goNext, goPrev, registerInteraction]
  );

  return {
    index,
    count,
    canSlide,
    goTo,
    goNext,
    goPrev,
    registerInteraction,
    onTouchStart,
    onTouchEnd,
  };
}
