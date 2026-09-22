"use client";

import { useId } from "react";

/**
 * Centered smoke ring while a map pan/zoom is reloading specialists.
 * Visual only — the results bar already announces “Searching”.
 */
export function ExploreMapSearchRing() {
  const gradientId = `explore-map-search-smoke-${useId().replace(/:/g, "")}`;

  return (
    <div className="explore-map-search-ring" aria-hidden>
      <svg className="explore-map-search-ring__svg" viewBox="0 0 48 48">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--smoac-color-warm)" />
            <stop offset="28%" stopColor="var(--smoac-color-rose)" />
            <stop offset="52%" stopColor="var(--smoac-color-violet)" />
            <stop offset="78%" stopColor="var(--smoac-color-indigo)" />
            <stop offset="100%" stopColor="var(--smoac-color-cool)" />
          </linearGradient>
        </defs>
        <circle
          className="explore-map-search-ring__track"
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.25"
        />
        <circle
          className="explore-map-search-ring__arc"
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeDasharray="34 79.1"
        />
      </svg>
    </div>
  );
}
