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
import {
  listPublicFeaturedTrainers,
  selectFeaturedSpotlightTrainers,
} from "@/lib/paid-placements";
import type { SponsoredRailResult } from "@/lib/sponsored-rail";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";
import { SponsoredSpecialistCard } from "./SponsoredSpecialistCard";

/** Homepage spotlight for `featured` (Platinum / homepage_spotlight add-on). */
export function FeaturedSpotlightSpecialists({
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

  const featuredPool = useMemo(
    () =>
      listPublicFeaturedTrainers({
        includeBrowserState: hydrated,
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
      }),
    [hydrated, initialCatalog, catalogMode]
  );

  useEffect(() => {
    if (!hydrated) return;
    setRail(
      selectFeaturedSpotlightTrainers(featuredPool, {
        personalizationCity,
        userCoords,
      })
    );
  }, [hydrated, featuredPool, personalizationCity, coordsKey, userCoords]);

  if (!hydrated || rail.trainers.length === 0) return null;

  return (
    <section
      className="home-sponsored home-section-aurora relative"
      aria-labelledby="home-featured-heading"
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
          <h2 id="home-featured-heading" className="home-section__title">
            {rail.isLocal ? "Spotlight near you" : "Homepage spotlight"}
          </h2>
          <p className="home-section__subtitle">
            {rail.isLocal
              ? "Featured specialists elevating their presence in your area."
              : "Paid homepage spotlight placements across SMOAC."}
          </p>
        </header>

        <HorizontalCarousel
          className="home-sponsored__carousel"
          ariaLabel="Featured spotlight specialists"
        >
          {rail.trainers.map((trainer, index) => (
            <SponsoredSpecialistCard
              key={trainer.id}
              trainer={trainer}
              priority={index < 2}
              badgeLabel="Featured"
              impressionSurface="home_featured"
            />
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
