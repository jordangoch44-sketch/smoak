"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
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
import {
  listPublicTopRankedBoostTrainers,
  selectTopRankedBoostForCity,
} from "@/lib/paid-placements";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import { reviewAggregatesFromSerialized } from "@/lib/reviews/specialist-review-types";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";
import type { Trainer } from "@/types/trainer";
import { SponsoredSpecialistCard } from "./SponsoredSpecialistCard";
import { Top50RankCard } from "./Top50RankCard";

/** Homepage “Top Rated Near You” — SMOAC review ranks + labeled ranking boosts */
export function Top50InYourCity({
  catalogMode = "live",
  initialCatalog,
  initialAggregates = [],
}: {
  catalogMode?: PublicCatalogMode;
  initialCatalog?: Trainer[];
  initialAggregates?: SpecialistReviewAggregate[];
}) {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const marketplaceCity = usePersonalizationMarketplaceCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  const aggregates = useMemo(
    () => reviewAggregatesFromSerialized(initialAggregates),
    [initialAggregates]
  );

  const cityName = marketplaceCity?.trim() || personalizationCity?.trim() || "";

  const catalogOpts = useMemo(
    () => ({
      remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
      catalogMode,
      includeBrowserState: hydrated,
    }),
    [catalogMode, initialCatalog, hydrated]
  );

  const ranked = useMemo(() => {
    return listLiveTopRatedSpecialistsForCity(
      cityName,
      20,
      catalogOpts,
      aggregates,
      hydrated ? userCoords : null
    );
  }, [
    cityName,
    hydrated,
    coordsKey,
    userCoords,
    catalogOpts,
    aggregates,
  ]);

  const rankingBoosts = useMemo(() => {
    if (!hydrated) return [];
    return selectTopRankedBoostForCity(
      listPublicTopRankedBoostTrainers(catalogOpts),
      cityName,
      6
    );
  }, [hydrated, catalogOpts, cityName]);

  const displayCity = hydrated ? personalizationCity : null;

  if (ranked.length === 0 && rankingBoosts.length === 0) return null;

  return (
    <section
      className="home-top50 home-section-aurora"
      aria-labelledby="home-top50-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        {rankingBoosts.length > 0 ? (
          <div className="home-ranking-boost">
            <header className="home-section__header">
              <h2 className="home-section__title home-section__title--sm">
                Ranking boosts
                {displayCity ? ` · ${displayCity}` : ""}
              </h2>
              <p className="home-section__subtitle">
                Paid ranking placement — separate from organic SMOAC review ranks
                below.
              </p>
            </header>
            <HorizontalCarousel
              className="home-top50__carousel"
              ariaLabel="Ranking boost specialists"
            >
              {rankingBoosts.map((trainer, index) => (
                <SponsoredSpecialistCard
                  key={trainer.id}
                  trainer={trainer}
                  priority={index < 2}
                  badgeLabel="Ranking boost"
                  impressionSurface="home_ranking_boost"
                />
              ))}
            </HorizontalCarousel>
          </div>
        ) : null}

        {ranked.length > 0 ? (
          <>
            <header className="home-section__header home-section__header--row">
              <div>
                <h2 id="home-top50-heading" className="home-section__title">
                  Top Rated Near You
                </h2>
                <p className="home-section__subtitle">
                  {displayCity
                    ? `Highest SMOAC-reviewed specialists near you in ${displayCity}.`
                    : "Highest-rated specialists by SMOAC client reviews."}
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
              ariaLabel="Top rated specialists"
            >
              {ranked.map(({ rank, trainer, avgRating, reviewCount }, index) => (
                <Top50RankCard
                  key={trainer.id}
                  rank={rank}
                  trainer={trainer}
                  smoacRating={avgRating}
                  smoacReviewCount={reviewCount}
                  priority={index < 3}
                />
              ))}
            </HorizontalCarousel>
          </>
        ) : null}
      </div>
    </section>
  );
}
