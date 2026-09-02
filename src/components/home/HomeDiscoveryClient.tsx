"use client";

import { useEffect, useState } from "react";
import {
  SponsoredSpecialists,
  FeaturedSpotlightSpecialists,
  Top50InYourCity,
  NewSpecialists,
} from "@/components/home";
import { HomeRailsLoading } from "@/components/home/HomeRouteLoading";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import { fetchSmoacReviewAggregates } from "@/lib/reviews/specialist-review-aggregates-query";
import {
  serializeReviewAggregates,
  type SpecialistReviewAggregate,
} from "@/lib/reviews/specialist-review-types";
import type { Trainer } from "@/types/trainer";

/**
 * Marketplace discovery rails — catalog from the session store.
 * Categories (and the city-rankings CTA) sit above; essence photo strip sits below.
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
  const [aggregates, setAggregates] = useState<SpecialistReviewAggregate[]>(
    []
  );
  const resolvedCatalog =
    catalogHydrated && trainers.length > 0
      ? trainers
      : (initialCatalog ?? trainers);
  const resolvedMode = catalogHydrated
    ? catalogMode
    : (ssrCatalogMode ?? catalogMode);

  useEffect(() => {
    if (resolvedMode !== "live" || resolvedCatalog.length === 0) {
      return;
    }

    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;

    let cancelled = false;
    const ids = resolvedCatalog.map((t) => t.id);

    void fetchSmoacReviewAggregates(supabase, ids).then((map) => {
      if (cancelled) return;
      setAggregates(serializeReviewAggregates(map));
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedMode, resolvedCatalog]);

  if (!catalogHydrated && !(initialCatalog && initialCatalog.length > 0)) {
    return <HomeRailsLoading />;
  }

  return (
    <>
      <SponsoredSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
      <NewSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
      <FeaturedSpotlightSpecialists
        initialCatalog={resolvedCatalog}
        catalogMode={resolvedMode}
      />
      <Top50InYourCity
        catalogMode={resolvedMode}
        initialCatalog={resolvedCatalog}
        initialAggregates={aggregates}
      />
    </>
  );
}
