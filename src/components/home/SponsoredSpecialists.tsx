"use client";

import { useEffect, useMemo } from "react";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { useHydrated } from "@/hooks/useHydrated";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { primePublicCatalogFromSSR } from "@/lib/approved-specialist-profiles-store";
import { listPublicSponsoredTrainers } from "@/lib/marketplace-public-catalog";
import { sortTrainersByPersonalizationCity } from "@/lib/personalized-trainers";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";
import { SponsoredSpecialistCard } from "./SponsoredSpecialistCard";

export function SponsoredSpecialists({
  initialCatalog,
  catalogMode = "live",
}: {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
}) {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  const sponsored = useMemo(() => {
    const coords = hydrated ? userCoords : null;
    return sortTrainersByPersonalizationCity(
      listPublicSponsoredTrainers({
        includeBrowserState: hydrated,
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
      }),
      hydrated ? personalizationCity : null,
      coords
    ).slice(0, 6);
  }, [
    hydrated,
    personalizationCity,
    coordsKey,
    userCoords,
    initialCatalog,
    catalogMode,
  ]);

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
