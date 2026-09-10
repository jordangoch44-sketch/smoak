"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";

const AUTOPLAY_MS = 5500;
const INTERACTION_PAUSE_MS = 9000;

interface UseProfileHeroCoverGalleryOptions {
  imageCount: number;
}

export function useProfileHeroCoverGallery({
  imageCount,
}: UseProfileHeroCoverGalleryOptions) {
  const [index, setIndex] = useState(0);
  const pauseUntilRef = useRef(0);
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
      const scale = window.visualViewport?.scale ?? 1;
      if (scale > 1.05) return;
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [canSlide, count]);

  const { onTouchStart, onTouchEnd } = useHorizontalSwipe({
    enabled: canSlide,
    onSwipeLeft: () => {
      registerInteraction();
      goNext();
    },
    onSwipeRight: () => {
      registerInteraction();
      goPrev();
    },
  });

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
