"use client";

import { useEffect, useState } from "react";

/** Count-up on mount for premium analytics — respects reduced motion */
export function useAnimatedMetricValue(
  target: number,
  enabled: boolean
): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;

    const startAnimation = () => {
      if (typeof window !== "undefined") {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
          setValue(target);
          return;
        }
      }

      setValue(0);
      const duration = 720;
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        setValue(Math.round(target * eased));
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        }
      };

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(startAnimation);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);

  return enabled ? value : target;
}
