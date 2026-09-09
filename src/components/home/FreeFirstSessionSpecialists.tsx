"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import {
  useMarketplacePersonalizationCity,
  useMarketplaceUserCoordinates,
  useMarketplaceUserCoordinatesKey,
} from "@/hooks/useMarketplaceGeo";
import { useFrozenTrainerList } from "@/hooks/useFrozenTrainerList";
import { useHydrated } from "@/hooks/useHydrated";
import { primePublicCatalogFromSSR } from "@/lib/approved-specialist-profiles-store";
import {
  FREE_FIRST_SESSION_LABEL,
  FREE_FIRST_SESSION_RAIL_LIMIT,
  FREE_FIRST_SESSION_RAIL_TITLE,
} from "@/lib/free-first-session";
import { listPublicFreeFirstSessionTrainers } from "@/lib/marketplace-public-catalog";
import { selectPlacementRailTrainers } from "@/lib/sponsored-rail";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import { trainerProfilePath } from "@/lib/trainer-profile-path";
import type { Trainer } from "@/types/trainer";
import { HomePortraitSpecialistCard } from "./HomePortraitSpecialistCard";

export function FreeFirstSessionSpecialists({
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

  const offerPool = useMemo(
    () =>
      listPublicFreeFirstSessionTrainers({
        includeBrowserState: hydrated,
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
      }),
    [hydrated, initialCatalog, catalogMode]
  );

  const rail = useMemo(
    () =>
      selectPlacementRailTrainers(offerPool, {
        personalizationCity: hydrated ? personalizationCity : null,
        userCoords: hydrated ? userCoords : null,
        limit: FREE_FIRST_SESSION_RAIL_LIMIT,
        shuffle: hydrated,
      }),
    [offerPool, hydrated, personalizationCity, coordsKey, userCoords]
  );
  const trainers = useFrozenTrainerList(rail.trainers);

  useEffect(() => {
    if (!hydrated || trainers.length === 0) return;
    for (const trainer of trainers.slice(0, 4)) {
      try {
        router.prefetch(trainerProfilePath(trainer));
      } catch {
        /* prefetch is best-effort */
      }
    }
  }, [hydrated, trainers, router]);

  if (trainers.length === 0) return null;

  return (
    <section
      className="home-free-first home-section-aurora"
      aria-labelledby="home-free-first-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header">
          <h2 id="home-free-first-heading" className="home-section__title">
            {FREE_FIRST_SESSION_RAIL_TITLE}
          </h2>
        </header>

        <HorizontalCarousel
          className="home-free-first__carousel"
          ariaLabel={FREE_FIRST_SESSION_RAIL_TITLE}
        >
          {trainers.map((trainer, index) => (
            <HomePortraitSpecialistCard
              key={trainer.id}
              trainer={trainer}
              priority={index < 2}
              impressionSurface="home_free_first"
              badgeLabel={FREE_FIRST_SESSION_LABEL}
            />
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
