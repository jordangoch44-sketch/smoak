"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import {
  useMarketplacePersonalizationCity,
  useMarketplaceUserCoordinates,
  useMarketplaceUserCoordinatesKey,
} from "@/hooks/useMarketplaceGeo";
import { useHydrated } from "@/hooks/useHydrated";
import { primePublicCatalogFromSSR } from "@/lib/approved-specialist-profiles-store";
import {
  listPublicFeaturedTrainers,
  selectFeaturedSpotlightTrainers,
} from "@/lib/paid-placements";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";
import { HomePortraitSpecialistCard } from "./HomePortraitSpecialistCard";

/** Homepage featured spotlight — portrait rail matching New Specialists. */
export function FeaturedSpotlightSpecialists({
  initialCatalog,
  catalogMode = "live",
}: {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const personalizationCity = useMarketplacePersonalizationCity();
  const userCoords = useMarketplaceUserCoordinates();
  const coordsKey = useMarketplaceUserCoordinatesKey();

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

  const rail = useMemo(
    () =>
      selectFeaturedSpotlightTrainers(featuredPool, {
        personalizationCity: hydrated ? personalizationCity : null,
        userCoords: hydrated ? userCoords : null,
        shuffle: hydrated,
      }),
    [featuredPool, hydrated, personalizationCity, coordsKey, userCoords]
  );

  useEffect(() => {
    if (!hydrated || rail.trainers.length === 0) return;
    for (const trainer of rail.trainers.slice(0, 4)) {
      try {
        router.prefetch(`/trainers/${trainer.id}`);
      } catch {
        /* prefetch is best-effort */
      }
    }
  }, [hydrated, rail.trainers, router]);

  if (rail.trainers.length === 0) return null;

  return (
    <section
      className="home-featured home-section-aurora"
      aria-labelledby="home-featured-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header">
          <h2 id="home-featured-heading" className="home-section__title">
            Featured Specialists
          </h2>
          <p className="home-section__subtitle">
            {rail.isLocal
              ? "Highlighted professionals elevating their presence in your area."
              : "Highlighted verified professionals on SMOAC."}
          </p>
        </header>

        <HorizontalCarousel
          className="home-featured__carousel"
          ariaLabel="Featured specialists"
        >
          {rail.trainers.map((trainer, index) => (
            <HomePortraitSpecialistCard
              key={trainer.id}
              trainer={trainer}
              priority={index < 2}
              impressionSurface="home_featured"
            />
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
