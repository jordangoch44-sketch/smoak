"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TrainerList } from "@/components/trainers";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { useHydrated } from "@/hooks/useHydrated";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { buildExploreSearchParams } from "@/lib/explore-url";
import { getSavedZipExploreFilters } from "@/lib/explore-location-filters";
import { getPersonalizedFeaturedTrainers } from "@/lib/personalized-trainers";

/** TODO: Rename to FeaturedProviders when internal trainer types are refactored */
export function FeaturedTrainers() {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  const exploreHref = useMemo(() => {
    if (!hydrated) return "/explore";
    const saved = getSavedZipExploreFilters();
    if (!saved.zipCode && !saved.city) return "/explore";
    return `/explore?${buildExploreSearchParams(saved, "")}`;
  }, [hydrated]);

  const featured = useMemo(() => {
    const coords = hydrated ? userCoords : null;
    return getPersonalizedFeaturedTrainers(
      hydrated ? personalizationCity : null,
      coords
    ).slice(0, 4);
  }, [hydrated, personalizationCity, coordsKey, userCoords]);

  const displayCity = hydrated ? personalizationCity : null;

  return (
    <section className="home-featured home-section-aurora px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-silver-400">
              Top rated near you
            </p>
            <h2 className="mt-1.5 text-xl font-medium tracking-tight text-white sm:text-2xl">
              Featured specialists
            </h2>
            <p className="mt-1 text-sm text-silver-400">
              {displayCity
                ? `Vetted specialists near you in ${displayCity}.`
                : "Vetted specialists with verified reviews and clear session pricing."}
            </p>
          </div>
          <Link
            href={exploreHref}
            className="hidden shrink-0 text-sm text-silver-400 transition-colors hover:text-white sm:inline-flex sm:min-h-11 sm:items-center"
          >
            View all →
          </Link>
        </div>

        <TrainerList
          trainers={featured}
          variant="featured"
          priorityCount={4}
          className="mt-8"
        />

        <Link
          href={exploreHref}
          className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 text-sm text-silver-300 active:bg-white/5 active:text-white sm:hidden"
        >
          Explore specialists
        </Link>
      </div>
    </section>
  );
}
