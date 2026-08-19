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
import { listPublicNewTrainers } from "@/lib/marketplace-public-catalog";
import { sortTrainersByPersonalizationCity } from "@/lib/personalized-trainers";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";
import { HomePortraitSpecialistCard } from "./HomePortraitSpecialistCard";

export function NewSpecialists({
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

  const newcomers = useMemo(() => {
    const coords = hydrated ? userCoords : null;
    return sortTrainersByPersonalizationCity(
      listPublicNewTrainers({
        includeBrowserState: hydrated,
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
      }),
      hydrated ? personalizationCity : null,
      coords
    ).slice(0, 8);
  }, [
    hydrated,
    personalizationCity,
    coordsKey,
    userCoords,
    initialCatalog,
    catalogMode,
  ]);

  useEffect(() => {
    if (!hydrated || newcomers.length === 0) return;
    for (const trainer of newcomers.slice(0, 4)) {
      try {
        router.prefetch(`/trainers/${trainer.id}`);
      } catch {
        /* prefetch is best-effort */
      }
    }
  }, [hydrated, newcomers, router]);

  if (newcomers.length === 0) return null;

  return (
    <section
      className="home-new home-section-aurora"
      aria-labelledby="home-new-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header">
          <h2 id="home-new-heading" className="home-section__title">
            New Specialists
          </h2>
          <p className="home-section__subtitle">
            Newest verified professionals joining SMOAC.
          </p>
        </header>

        <HorizontalCarousel
          className="home-new__carousel"
          ariaLabel="New specialists"
        >
          {newcomers.map((trainer, index) => (
            <HomePortraitSpecialistCard
              key={trainer.id}
              trainer={trainer}
              priority={index < 2}
              impressionSurface="home_new"
            />
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
