"use client";

import { useMemo } from "react";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { useHydrated } from "@/hooks/useHydrated";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { listPublicSponsoredTrainers } from "@/lib/marketplace-public-catalog";
import { sortTrainersByPersonalizationCity } from "@/lib/personalized-trainers";
import { SponsoredSpecialistCard } from "./SponsoredSpecialistCard";

export function SponsoredSpecialists() {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  const sponsored = useMemo(() => {
    const coords = hydrated ? userCoords : null;
    return sortTrainersByPersonalizationCity(
      listPublicSponsoredTrainers({ includeBrowserState: hydrated }),
      hydrated ? personalizationCity : null,
      coords
    ).slice(0, 6);
  }, [hydrated, personalizationCity, coordsKey, userCoords]);

  if (sponsored.length === 0) return null;

  return (
    <section
      className="home-sponsored home-section-aurora relative"
      aria-labelledby="home-sponsored-heading"
    >
      <AuroraAtmosphere
        intensity="subtle"
        starDensity="none"
        glowPosition="section-top"
        glowColor="violet"
        enableMotion
        className="home-sponsored__cosmic"
      />
      <div className="home-section__inner home-sponsored__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header">
          <h2 id="home-sponsored-heading" className="home-section__title">
            Sponsored Specialists
          </h2>
          <p className="home-section__subtitle">
            Premium featured listings near you.
          </p>
        </header>

        <HorizontalCarousel
          className="home-sponsored__carousel"
          ariaLabel="Sponsored specialists"
        >
          {sponsored.map((trainer, index) => (
            <SponsoredSpecialistCard
              key={trainer.id}
              trainer={trainer}
              priority={index < 2}
            />
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
