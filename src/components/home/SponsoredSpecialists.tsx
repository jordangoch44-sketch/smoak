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
import { listPublicSponsoredTrainers } from "@/lib/marketplace-public-catalog";
import { selectSponsoredRailTrainers } from "@/lib/sponsored-rail";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";
import { HomePortraitSpecialistCard } from "./HomePortraitSpecialistCard";

export function SponsoredSpecialists({
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

  const sponsoredPool = useMemo(
    () =>
      listPublicSponsoredTrainers({
        includeBrowserState: hydrated,
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
      }),
    [hydrated, initialCatalog, catalogMode]
  );

  const rail = useMemo(
    () =>
      selectSponsoredRailTrainers(sponsoredPool, {
        personalizationCity: hydrated ? personalizationCity : null,
        userCoords: hydrated ? userCoords : null,
        shuffle: hydrated,
      }),
    [sponsoredPool, hydrated, personalizationCity, coordsKey, userCoords]
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
      className="home-sponsored home-section-aurora"
      aria-labelledby="home-sponsored-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header">
          <h2 id="home-sponsored-heading" className="home-section__title">
            Sponsored Specialists
          </h2>
          <p className="home-section__subtitle">
            {rail.isLocal
              ? "Paid profile boosts from specialists in your area."
              : "Paid profile boosts from specialists on SMOAC."}
          </p>
        </header>

        <HorizontalCarousel
          className="home-sponsored__carousel"
          ariaLabel="Sponsored specialists"
        >
          {rail.trainers.map((trainer, index) => (
            <HomePortraitSpecialistCard
              key={trainer.id}
              trainer={trainer}
              priority={index < 2}
              impressionSurface="home_sponsored"
            />
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
