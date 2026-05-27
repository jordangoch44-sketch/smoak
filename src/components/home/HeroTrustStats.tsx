"use client";

import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { getHomeHeroTrustSegments } from "@/lib/home-marketplace-stats";

export function HeroTrustStats() {
  const city = usePersonalizationCity();
  const segments = getHomeHeroTrustSegments(city);

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
