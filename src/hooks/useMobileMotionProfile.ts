"use client";

import { useSyncExternalStore } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

function subscribeCoarsePointer(onStoreChange: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getCoarsePointerSnapshot(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Mobile/tablet motion profile — reduced motion or coarse touch (typical phones).
 * Used for shorter bottom-nav panel timing without changing desktop luxury motion.
 */
export function useMobileMotionProfile(): {
  reducedMotion: boolean;
  /** Shorter transitions on phones / reduced-motion */
  fastMotion: boolean;
} {
  const reducedMotion = usePrefersReducedMotion();
  const coarsePointer = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    () => true
  );

  return {
    reducedMotion,
    fastMotion: reducedMotion || coarsePointer,
  };
}
