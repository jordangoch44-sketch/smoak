"use client";

import { useMemo } from "react";
import {
  SponsoredSpecialists,
  FeaturedSpotlightSpecialists,
  FreeFirstSessionSpecialists,
  NewSpecialists,
  HomeCalorieCalculatorCta,
} from "@/components/home";
import { HomeRankingsCta } from "@/components/home/HomeRankingsCta";
import { HomeRailsLoading } from "@/components/home/HomeRouteLoading";
import { useHydrated } from "@/hooks/useHydrated";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { listPublicSponsoredTrainers } from "@/lib/marketplace-public-catalog";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";

/**
 * Marketplace discovery rails — catalog from the session store.
 * Categories sit above. New Specialists is the next rail, so the sliding
 * cards sit directly under the category row. City rankings follows those
 * cards. Sponsored follows only when someone is paying for a boost. Then
 * Free 1st session, the calorie calculator, and Featured.
 */
export function HomeDiscoveryClient({
  initialCatalog,
  catalogMode: ssrCatalogMode,
}: {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
} = {}) {
  const hydrated = useHydrated();
  const { trainers, catalogMode, catalogHydrated } = usePublicCatalog();
  const resolvedCatalog =
    catalogHydrated && trainers.length > 0
      ? trainers
      : (initialCatalog ?? trainers);
  const resolvedMode = catalogHydrated
    ? catalogMode
    : (ssrCatalogMode ?? catalogMode);

  const hasSponsored = useMemo(
    () =>
      listPublicSponsoredTrainers({
        includeBrowserState: hydrated,
        remoteApproved: resolvedMode === "live" ? resolvedCatalog : undefined,
        catalogMode: resolvedMode,
      }).length > 0,
    [hydrated, resolvedCatalog, resolvedMode]
  );

  if (!catalogHydrated && !(initialCatalog && initialCatalog.length > 0)) {
    return <HomeRailsLoading />;
  }

  return (
    <>
      <NewSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
      <section className="home-rankings-slot" aria-label="City rankings">
        <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
          <HomeRankingsCta
            initialCatalog={resolvedCatalog}
            catalogMode={resolvedMode}
          />
        </div>
      </section>
      {hasSponsored ? (
        <SponsoredSpecialists
          initialCatalog={resolvedCatalog}
          catalogMode={resolvedMode}
        />
      ) : null}
      <FreeFirstSessionSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
      <HomeCalorieCalculatorCta />
      <FeaturedSpotlightSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
    </>
  );
}
