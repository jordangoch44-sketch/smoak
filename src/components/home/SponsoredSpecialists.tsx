"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  selectSponsoredRailTrainers,
  type SponsoredRailResult,
} from "@/lib/sponsored-rail";
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
  const [rail, setRail] = useState<SponsoredRailResult>({
    trainers: [],
    isLocal: false,
  });

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  const sponsoredPool = useMemo(
    () =>
      listPublicSponsoredTrainers({
        includeBrowserState: hydrated,
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
      }),
    [hydrated, initialCatalog, catalogMode]
  );

  /* Shuffle on mount and whenever location / pool changes (fresh page visit). */
  useEffect(() => {
    if (!hydrated) return;
    setRail(
      selectSponsoredRailTrainers(sponsoredPool, {
        personalizationCity,
        userCoords,
      })
    );
  }, [
    hydrated,
    sponsoredPool,
    personalizationCity,
    coordsKey,
    userCoords,
  ]);

  if (!hydrated || rail.trainers.length === 0) return null;

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
            {rail.isLocal ? "Sponsored near you" : "Featured on SMOAC"}
          </h2>
          <p className="home-section__subtitle">
            {rail.isLocal
              ? "Homepage spotlight for specialists boosting in your area."
              : "Homepage spotlight placements. Enter your ZIP to see boosts near you."}
          </p>
        </header>

        <HorizontalCarousel
          className="home-sponsored__carousel"
          ariaLabel="Sponsored specialists"
        >
          {rail.trainers.map((trainer, index) => (
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
