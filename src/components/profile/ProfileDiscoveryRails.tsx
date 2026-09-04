"use client";

import { useMemo } from "react";
import type { Trainer } from "@/types";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { HomePortraitSpecialistCard } from "@/components/home/HomePortraitSpecialistCard";
import { useHydrated } from "@/hooks/useHydrated";
import { getSponsoredPicksNearTrainer } from "@/lib/related-trainers";

interface ProfileDiscoveryRailsProps {
  trainer: Trainer;
}

export function ProfileDiscoveryRails({ trainer }: ProfileDiscoveryRailsProps) {
  const hydrated = useHydrated();

  const featured = useMemo(() => {
    if (!hydrated) return [];
    return getSponsoredPicksNearTrainer(trainer, 8);
  }, [hydrated, trainer]);

  if (featured.length === 0) return null;

  return (
    <div className="profile-discovery">
      <section
        className="profile-discovery__section"
        aria-labelledby="profile-featured-heading"
      >
        <header className="profile-discovery__header">
          <h2 id="profile-featured-heading" className="profile-discovery__title">
            Picks for you
          </h2>
          <p className="profile-discovery__subtitle">
            Boosted specialists near {trainer.city}.
          </p>
        </header>
        <HorizontalCarousel
          className="profile-discovery__carousel"
          ariaLabel="Picks for you"
        >
            {featured.map((card, index) => (
              <HomePortraitSpecialistCard
                key={card.id}
                trainer={card}
                priority={index < 2}
                impressionSurface="profile_rail"
                replaceCurrentProfile
              />
            ))}
        </HorizontalCarousel>
      </section>
    </div>
  );
}
