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
import { fetchSmoacReviewAggregates } from "@/lib/reviews/specialist-review-aggregates-query";
import {
  serializeReviewAggregates,
  type SpecialistReviewAggregate,
} from "@/lib/reviews/specialist-review-types";

/**
 * Marketplace discovery rails — catalog from the session store.
 * Categories sit above; essence photo strip sits below.
 * New specialists lead so marketplace opens with people, not campaign stills.
 */
export function HomeDiscoveryClient() {
  const { trainers, catalogMode, catalogHydrated } = usePublicCatalog();
  const [aggregates, setAggregates] = useState<SpecialistReviewAggregate[]>(
    []
  );

  useEffect(() => {
    if (!catalogHydrated || catalogMode !== "live" || trainers.length === 0) {
      return;
    }

    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;

    let cancelled = false;
    const ids = trainers.map((t) => t.id);

    void fetchSmoacReviewAggregates(supabase, ids).then((map) => {
      if (cancelled) return;
      setAggregates(serializeReviewAggregates(map));
    });

    return () => {
      cancelled = true;
    };
  }, [catalogHydrated, catalogMode, trainers]);

  if (!catalogHydrated) {
    return <HomeRailsLoading />;
  }

  return (
    <>
      <NewSpecialists initialCatalog={trainers} catalogMode={catalogMode} />
      <FeaturedSpotlightSpecialists
        initialCatalog={trainers}
        catalogMode={catalogMode}
      />
      <SponsoredSpecialists
        initialCatalog={trainers}
        catalogMode={catalogMode}
      />
      <Top50InYourCity
        catalogMode={catalogMode}
        initialCatalog={trainers}
        initialAggregates={aggregates}
      />
    </>
  );
}
