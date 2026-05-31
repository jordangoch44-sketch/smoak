"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  getCityTop50Listing,
  getRankingsBoardRows,
  sortRankingsBoardByProximity,
} from "@/data/city-rankings";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { useHydrated } from "@/hooks/useHydrated";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { RankingsFilters } from "./RankingsFilters";
import { RankingsRow } from "./RankingsRow";

export function RankingsPageClient() {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();
  const listing = getCityTop50Listing();
  const [cityTouched, setCityTouched] = useState(false);
  const [cityOverride, setCityOverride] = useState("");
  const [profession, setProfession] = useState("");
  const city = cityTouched
    ? cityOverride
    : hydrated
      ? (personalizationCity ?? "")
      : "";

  const rows = useMemo(() => {
    const baseline = getRankingsBoardRows({
      cityFilter: city,
      professionFilter: profession,
    });
    if (!hydrated || !userCoords) {
      return baseline.map((row, index) => ({
        ...row,
        displayRank: index + 1,
      }));
    }
    return sortRankingsBoardByProximity(baseline, userCoords);
  }, [city, profession, hydrated, coordsKey, userCoords]);

  return (
    <div className="rankings-page">
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

      <div className="rankings-page__content">
        <div className="rankings-page__top">
          <Link href="/explore" className="rankings-page__back">
            ← Back to Explore
          </Link>
        </div>

        <header className="rankings-page__header">
          <p className="rankings-page__eyebrow">SMOAC</p>
          <h1 className="rankings-page__title">City Rankings</h1>
          <p className="rankings-page__subtitle">{listing.subtitle}</p>
        </header>

        <RankingsFilters
          city={city}
          profession={profession}
          onCityChange={(value) => {
            setCityTouched(true);
            setCityOverride(value);
          }}
          onProfessionChange={setProfession}
        />

        <div className="rankings-board" aria-live="polite">
          <div className="rankings-board__header" aria-hidden>
            <span className="rankings-board__col rankings-board__col--rank">
              #
            </span>
            <span className="rankings-board__col rankings-board__col--specialist">
              Specialist
            </span>
            <span className="rankings-board__col rankings-board__col--stats">
              Stats
            </span>
            <span className="rankings-board__col rankings-board__col--action">
              Profile
            </span>
          </div>

          {rows.length > 0 ? (
            <div className="rankings-board__list" role="list">
              {rows.map((row, index) => (
                <RankingsRow
                  key={row.trainer.id}
                  row={row}
                  priority={index < 3}
                />
              ))}
            </div>
          ) : (
            <div className="rankings-empty">
              <p className="rankings-empty__title">
                No specialists match these filters yet.
              </p>
              <p className="rankings-empty__text">
                Try another city or profession to explore the board.
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
