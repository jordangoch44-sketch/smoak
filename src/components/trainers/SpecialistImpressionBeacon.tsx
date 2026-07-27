"use client";

import { useEffect, useRef } from "react";
import {
  recordSpecialistEngagement,
  type SpecialistEngagementSurface,
} from "@/lib/specialist-engagement-tracking";

interface SpecialistImpressionBeaconProps {
  specialistId: string;
  surface: SpecialistEngagementSurface;
}

/**
 * Fires search_appearance once when the card enters the viewport
 * (IntersectionObserver — avoids carousel/grid mount overcounting).
 */
export function SpecialistImpressionBeacon({
  specialistId,
  surface,
}: SpecialistImpressionBeaconProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || fired.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible || fired.current) return;
        fired.current = true;
        recordSpecialistEngagement({
          event: "search_appearance",
          specialistId,
          surface,
          oncePerSession: true,
        });
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [specialistId, surface]);

  return (
    <span
      ref={ref}
      className="pointer-events-none absolute inset-0"
      aria-hidden
      data-engagement-impression={specialistId}
    />
  );
}
