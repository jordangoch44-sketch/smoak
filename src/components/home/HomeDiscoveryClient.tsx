"use client";

import {
  SponsoredSpecialists,
  FeaturedSpotlightSpecialists,
  NewSpecialists,
  HomeCalorieCalculatorCta,
} from "@/components/home";
import { HomeRailsLoading } from "@/components/home/HomeRouteLoading";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";

/**
 * Marketplace discovery rails — catalog from the session store.
 * Categories (and the city-rankings CTA) sit above; calorie calculator sits
 * between Sponsored and New; essence photo strip sits below.
 * Sponsored leads when anyone is paying for a boost; otherwise that rail is omitted.
 */
export function HomeDiscoveryClient({
  initialCatalog,
  catalogMode: ssrCatalogMode,
}: {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
} = {}) {
  const { trainers, catalogMode, catalogHydrated } = usePublicCatalog();
  const resolvedCatalog =
    catalogHydrated && trainers.length > 0
      ? trainers
      : (initialCatalog ?? trainers);
  const resolvedMode = catalogHydrated
    ? catalogMode
    : (ssrCatalogMode ?? catalogMode);

  if (!catalogHydrated && !(initialCatalog && initialCatalog.length > 0)) {
    return <HomeRailsLoading />;
  }

  return (
    <>
      <SponsoredSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
      <HomeCalorieCalculatorCta />
      <NewSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
      <FeaturedSpotlightSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
    </>
  );
}
