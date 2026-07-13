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

/** Homepage “Top Rated Near You” — city rankings rail */
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

        <Link
          href="/rankings"
          className="home-section__link-mobile mt-6 inline-flex sm:hidden"
        >
          See full rankings
        </Link>
      </div>
    </section>
  );
}
