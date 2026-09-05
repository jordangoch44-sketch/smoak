"use client";

import { useEffect, useState } from "react";
import { EXPLORE_MAP_LAYOUT_EVENT } from "@/lib/explore-map-layout";

/**
 * Increments after Search layout settles (tab slide, overlays, first paint)
 * so map engines can recapture size and rebind pin hits.
 */
export function useExploreMapLayoutEpoch(): number {
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setEpoch((value) => value + 1);
    const timeouts = [90, 380, 960].map((ms) => window.setTimeout(bump, ms));
    window.addEventListener(EXPLORE_MAP_LAYOUT_EVENT, bump);
    return () => {
      for (const id of timeouts) window.clearTimeout(id);
      window.removeEventListener(EXPLORE_MAP_LAYOUT_EVENT, bump);
    };
  }, []);

  return epoch;
}
