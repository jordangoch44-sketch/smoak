"use client";

import Link from "next/link";
import { useMemo } from "react";
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
import { marketplaceCityToSlug } from "@/lib/marketplace-city-centers";
import { Top50RankCard } from "./Top50RankCard";

export function Top50InYourCity() {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const marketplaceCity = usePersonalizationMarketplaceCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  const citySlug = marketplaceCity
    ? marketplaceCityToSlug(marketplaceCity)
    : DEFAULT_RANKING_CITY_SLUG;
  const listing = getCityTop50Listing(citySlug);

  const ranked = useMemo(() => {
    const baseline = getRankedSpecialistsBaseline(citySlug);
    if (!hydrated || !userCoords) return baseline;
    return sortRankedSpecialistsByProximity(baseline, userCoords);
  }, [citySlug, hydrated, coordsKey, userCoords]);

  const displayCity = hydrated ? personalizationCity : null;

  return (
    <section
      className="home-top50 home-section-aurora"
      aria-labelledby="home-top50-heading"
    >
      <div className="home-top50__glow" aria-hidden />

      <div className="home-top50__inner mx-auto max-w-7xl px-4 sm:px-6">
        <div className="home-top50__header">
          <div className="home-top50__titles">
            <p className="home-top50__eyebrow">City rankings</p>
            <h2 id="home-top50-heading" className="home-top50__title">
              Top 50 in Your City
            </h2>
            <p className="home-top50__subtitle">
              {displayCity
                ? `The highest-rated health & wellness specialists near you in ${displayCity}.`
                : listing.subtitle}
            </p>
            <p className="home-top50__city-line">{listing.displayTitle}</p>
          </div>
          <Link
            href="/rankings"
            className="home-top50__view-all hidden shrink-0 text-sm text-silver-400 transition-colors hover:text-white sm:inline-flex sm:min-h-11 sm:items-center"
          >
            See full rankings →
          </Link>
        </div>

        <HorizontalCarousel
          className="home-top50__carousel"
          ariaLabel={`${listing.displayTitle} specialists`}
        >
          {ranked.map(({ rank, trainer, showTopRatedBadge }, index) => (
            <Top50RankCard
              key={trainer.id}
              rank={rank}
              trainer={trainer}
              showTopRatedBadge={showTopRatedBadge}
              priority={index < 3}
            />
          ))}
        </HorizontalCarousel>

        <Link
          href="/rankings"
          className="home-top50__view-all-mobile mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 text-sm text-silver-300 transition-colors active:bg-white/5 active:text-white sm:hidden"
        >
          See full rankings
        </Link>
      </div>
    </section>
  );
}
