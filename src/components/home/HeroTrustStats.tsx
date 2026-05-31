"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { getHomeHeroTrustSegments } from "@/lib/home-marketplace-stats";

export function HeroTrustStats() {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const segments = getHomeHeroTrustSegments(
    hydrated ? personalizationCity : null
  );

  return (
    <div
      className="hero-search__trust"
      role="group"
      aria-label="Marketplace highlights"
    >
      {segments.map((label, index) => (
        <span key={label} className="hero-search__trust-segment">
          {index > 0 ? (
            <span className="hero-search__trust-sep" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="hero-search__trust-label">{label}</span>
        </span>
      ))}
    </div>
  );
}
