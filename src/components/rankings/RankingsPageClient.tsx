"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  RANKINGS_CITY_OPTIONS,
  RANKINGS_PROFESSION_OPTIONS,
} from "@/data/city-rankings";
import { useHydrated } from "@/hooks/useHydrated";
import {
  useMarketplacePersonalizationCity,
  useMarketplaceUserCoordinates,
  useMarketplaceUserCoordinatesKey,
} from "@/hooks/useMarketplaceGeo";
import { primePublicCatalogFromSSR } from "@/lib/approved-specialist-profiles-store";
import { listPublicMarketplaceTrainers } from "@/lib/marketplace-public-catalog";
import { SITE_ROUTES } from "@/lib/navigation";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import { resolveRankingsSelectedCity } from "@/lib/ranking-hero";
import { resolveRankingMetro } from "@/lib/ranking-metro";
import { reviewAggregatesFromSerialized } from "@/lib/reviews/specialist-review-types";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";
import { buildSmoacRankingsBoard } from "@/lib/smoac-rankings";
import type { Trainer } from "@/types/trainer";
import { RankingsFilters } from "./RankingsFilters";
import { RankingsHero } from "./RankingsHero";
import { RankingsRow } from "./RankingsRow";

interface RankingsPageClientProps {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
  initialAggregates?: SpecialistReviewAggregate[];
}

export function RankingsPageClient({
  initialCatalog = [],
  catalogMode = "live",
  initialAggregates = [],
}: RankingsPageClientProps) {
  const hydrated = useHydrated();
  const placeName = useMarketplacePersonalizationCity();
  const userCoords = useMarketplaceUserCoordinates();
  const coordsKey = useMarketplaceUserCoordinatesKey();
  const [cityTouched, setCityTouched] = useState(false);
  const [cityOverride, setCityOverride] = useState("");
  const [profession, setProfession] = useState("");

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  const trainers = useMemo(
    () =>
      listPublicMarketplaceTrainers({
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
        includeBrowserState: true,
      }),
    [initialCatalog, catalogMode]
  );

  const aggregates = useMemo(
    () => reviewAggregatesFromSerialized(initialAggregates),
    [initialAggregates]
  );

  const metroFromLocation = useMemo(() => {
    if (!hydrated) return null;
    return resolveRankingMetro({
      placeName,
      latitude: userCoords?.latitude ?? null,
      longitude: userCoords?.longitude ?? null,
    });
  }, [hydrated, placeName, coordsKey, userCoords]);

  const city = resolveRankingsSelectedCity({
    hydrated,
    cityTouched,
    cityOverride,
    metroFromLocation,
  });

  const rows = useMemo(
    () =>
      buildSmoacRankingsBoard(trainers, aggregates, {
        cityFilter: city,
        professionFilter: profession,
      }),
    [trainers, aggregates, city, profession]
  );

  return (
    <div className="rankings-page" data-rankings-ui="hero-v2">
      <div className="rankings-page__canvas" aria-hidden>
        <div className="atmosphere-mesh">
          <div className="atmosphere-blob atmosphere-blob--indigo" />
          <div className="atmosphere-blob atmosphere-blob--blue" />
          <div className="atmosphere-blob atmosphere-blob--violet" />
          <div className="atmosphere-blob atmosphere-blob--magenta" />
          <div className="atmosphere-blob atmosphere-blob--core" />
        </div>
        <div className="rankings-page__header-glow" />
        <div className="atmosphere-vignette atmosphere-vignette--soft" />
        <div className="atmosphere-grain" />
      </div>

      <RankingsHero city={city}>
        <RankingsFilters
          city={city}
          profession={profession}
          cityOptions={[...RANKINGS_CITY_OPTIONS]}
          professionOptions={[...RANKINGS_PROFESSION_OPTIONS]}
          onCityChange={(value) => {
            setCityTouched(true);
            setCityOverride(value);
          }}
          onProfessionChange={setProfession}
        />
      </RankingsHero>

      <div className="rankings-page__content">
        <div className="rankings-page__top">
          <Link href={SITE_ROUTES.home} className="rankings-page__back">
            ← Back to Marketplace
          </Link>
        </div>

        <div className="rankings-board" aria-live="polite">
          {rows.length > 0 ? (
            <div
              className="rankings-board__list"
              role="list"
              aria-label="City rankings"
            >
              {rows.map((row, index) => (
                <RankingsRow
                  key={row.trainer.id}
                  row={row}
                  priority={index < 6}
                />
              ))}
            </div>
          ) : (
            <div className="rankings-empty">
              <p className="rankings-empty__title">
                No ranked specialists yet
              </p>
              <p className="rankings-empty__text">
                Rankings appear once specialists have SMOAC client reviews. Try
                another city or profession, or check back soon.
              </p>
              <button
                type="button"
                className="rankings-empty__reset"
                onClick={() => {
                  setCityTouched(false);
                  setCityOverride("");
                  setProfession("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
