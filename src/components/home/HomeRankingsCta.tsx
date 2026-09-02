"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { TapLink } from "@/components/ui/TapLink";
import { LocationMarkIcon } from "@/components/ui/icons";
import { useHydrated } from "@/hooks/useHydrated";
import {
  useMarketplacePersonalizationCity,
  useMarketplaceUserCoordinates,
  useMarketplaceUserCoordinatesKey,
} from "@/hooks/useMarketplaceGeo";
import { primePublicCatalogFromSSR } from "@/lib/approved-specialist-profiles-store";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { HOME_RANKINGS_HREF } from "@/lib/home-browse-categories";
import { listPublicMarketplaceTrainers } from "@/lib/marketplace-public-catalog";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import { resolveRankingMetro } from "@/lib/ranking-metro";
import { fetchSmoacReviewAggregates } from "@/lib/reviews/specialist-review-aggregates-query";
import {
  reviewAggregatesFromSerialized,
  serializeReviewAggregates,
  type SpecialistReviewAggregate,
} from "@/lib/reviews/specialist-review-types";
import { buildSmoacRankingsBoard } from "@/lib/smoac-rankings";
import type { Trainer } from "@/types/trainer";

function RankingsFace({
  trainer,
  rank,
}: {
  trainer?: Trainer;
  rank: 1 | 2 | 3;
}) {
  const src = trainer?.image?.trim() || "";

  return (
    <span
      className="home-specialty__rankings-face"
      data-rank={rank}
      aria-hidden
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="32px"
          className="home-specialty__rankings-face-img"
        />
      ) : (
        <span className="home-specialty__rankings-face-num">{rank}</span>
      )}
    </span>
  );
}

export function HomeRankingsCta({
  initialCatalog,
  catalogMode = "live",
}: {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
}) {
  const hydrated = useHydrated();
  const placeName = useMarketplacePersonalizationCity();
  const userCoords = useMarketplaceUserCoordinates();
  const coordsKey = useMarketplaceUserCoordinatesKey();
  const [aggregates, setAggregates] = useState<SpecialistReviewAggregate[]>(
    []
  );

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  const trainers = useMemo(
    () =>
      listPublicMarketplaceTrainers({
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
        includeBrowserState: hydrated,
      }),
    [initialCatalog, catalogMode, hydrated]
  );

  useEffect(() => {
    if (!hydrated || catalogMode !== "live" || trainers.length === 0) return;

    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;

    let cancelled = false;
    void fetchSmoacReviewAggregates(
      supabase,
      trainers.map((trainer) => trainer.id)
    ).then((map) => {
      if (cancelled) return;
      setAggregates(serializeReviewAggregates(map));
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, catalogMode, trainers]);

  const metro = useMemo(() => {
    if (!hydrated) return null;
    return resolveRankingMetro({
      placeName,
      latitude: userCoords?.latitude ?? null,
      longitude: userCoords?.longitude ?? null,
    });
  }, [hydrated, placeName, coordsKey, userCoords]);

  const topThree = useMemo(() => {
    const board = buildSmoacRankingsBoard(
      trainers,
      reviewAggregatesFromSerialized(aggregates),
      {
        cityFilter: metro ?? "",
        limit: 3,
      }
    );
    return [board[0]?.trainer, board[1]?.trainer, board[2]?.trainer] as const;
  }, [trainers, aggregates, metro]);

  return (
    <TapLink
      href={HOME_RANKINGS_HREF}
      className="home-specialty__rankings"
      aria-label="Top rankings in your city"
    >
      <span className="home-specialty__rankings-copy">
        <LocationMarkIcon className="home-specialty__rankings-pin" />
        Top rankings in your city
      </span>
      <span className="home-specialty__rankings-cluster" aria-hidden>
        <RankingsFace trainer={topThree[0]} rank={1} />
        <RankingsFace trainer={topThree[1]} rank={2} />
        <RankingsFace trainer={topThree[2]} rank={3} />
        <span className="home-specialty__rankings-face home-specialty__rankings-face--more">
          +
        </span>
      </span>
    </TapLink>
  );
}
