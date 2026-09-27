"use client";

import { useMemo } from "react";
import {
  SponsoredSpecialists,
  FeaturedSpotlightSpecialists,
  FreeFirstSessionSpecialists,
  NewSpecialists,
  HomeCalorieCalculatorCta,
} from "@/components/home";
import { HomeRailsLoading } from "@/components/home/HomeRouteLoading";
import { useHydrated } from "@/hooks/useHydrated";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { listPublicSponsoredTrainers } from "@/lib/marketplace-public-catalog";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";

/**
 * Marketplace discovery rails — catalog from the session store.
 * Categories (and the city-rankings CTA) sit above. The lead rail is
 * Sponsored when anyone is paying for a boost; otherwise New Specialists
 * takes that slot. The calorie calculator sits under the lead rail, then
 * Free 1st session. New stays below Free 1st session only while Sponsored
 * is showing, so the two rails never repeat. Featured follows.
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
      {hasSponsored ? (
        <SponsoredSpecialists
          initialCatalog={resolvedCatalog}
          catalogMode={resolvedMode}
        />
      ) : (
        <NewSpecialists
          initialCatalog={resolvedCatalog}
          catalogMode={resolvedMode}
        />
      )}
      <HomeCalorieCalculatorCta />
      <FreeFirstSessionSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
      {hasSponsored ? (
        <NewSpecialists
          initialCatalog={resolvedCatalog}
          catalogMode={resolvedMode}
        />
      ) : null}
      <FeaturedSpotlightSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
    </>
  );
}
