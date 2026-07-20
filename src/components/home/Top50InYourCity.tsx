"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  DEFAULT_RANKING_CITY_SLUG,
  getCityTop50Listing,
  getRankedSpecialistsBaseline,
  sortRankedSpecialistsByProximity,
} from "@/data/city-rankings";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { useHydrated } from "@/hooks/useHydrated";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { usePersonalizationMarketplaceCity } from "@/hooks/usePersonalizationMarketplaceCity";
import { primePublicCatalogFromSSR } from "@/lib/approved-specialist-profiles-store";
import { listLiveTopRatedSpecialistsForCity } from "@/lib/live-city-rankings";
import { marketplaceCityToSlug } from "@/lib/marketplace-city-centers";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";
import { Top50RankCard } from "./Top50RankCard";

/** Homepage “Top Rated Near You” — live catalog + proximity when available */
export function Top50InYourCity({
  catalogMode = "live",
  initialCatalog,
}: {
  catalogMode?: PublicCatalogMode;
  initialCatalog?: Trainer[];
}) {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const marketplaceCity = usePersonalizationMarketplaceCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  const citySlug = marketplaceCity
    ? marketplaceCityToSlug(marketplaceCity)
    : DEFAULT_RANKING_CITY_SLUG;
  const listing = getCityTop50Listing(citySlug);
  const cityName = marketplaceCity?.trim() || listing.city;

  const ranked = useMemo(() => {
    const live = listLiveTopRatedSpecialistsForCity(cityName, 20, {
      remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
      catalogMode,
      includeBrowserState: hydrated,
    });

    /* Seed baseline only when marketplace is offline demo mode */
    const list =
      live.length > 0
        ? live
        : catalogMode === "seed"
          ? getRankedSpecialistsBaseline(citySlug)
          : live;

    if (!hydrated || !userCoords) return list;
    return sortRankedSpecialistsByProximity(list, userCoords);
  }, [
    cityName,
    citySlug,
    hydrated,
    coordsKey,
    userCoords,
    catalogMode,
    initialCatalog,
  ]);

  const displayCity = hydrated ? personalizationCity : null;

  if (ranked.length === 0) return null;

  return (
    <section
      className="home-top50 home-section-aurora"
      aria-labelledby="home-top50-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header home-section__header--row">
          <div>
            <h2 id="home-top50-heading" className="home-section__title">
              Top Rated Near You
            </h2>
            <p className="home-section__subtitle">
              {displayCity
                ? `Highest-rated specialists near you in ${displayCity}.`
                : "Highest-rated specialists near you."}
            </p>
          </div>
          <Link
            href="/rankings"
            className="home-section__link hidden sm:inline-flex"
          >
            See full rankings
          </Link>
        </header>

        <HorizontalCarousel
          className="home-top50__carousel"
          ariaLabel={`${listing.displayTitle} specialists`}
        >
          {ranked.map(({ rank, trainer }, index) => (
            <Top50RankCard
              key={trainer.id}
              rank={rank}
              trainer={trainer}
              priority={index < 3}
            />
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
