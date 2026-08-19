"use client";

import Link from "next/link";
import { memo, useState } from "react";
import type { Trainer } from "@/types";
import { TrainerList } from "@/components/trainers";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { DEFAULT_EXPLORE_RADIUS_MILES } from "@/lib/explore";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import { ExploreMap } from "./ExploreMap";
import { ExploreSuggestedSpecialists } from "./ExploreSuggestedSpecialists";

interface ExploreResultsProps {
  trainers: Trainer[];
  suggestedTrainers?: Trainer[];
  areaCenter?: UserGeoPoint | null;
  /** Precise GPS only — purple map dot; null when ZIP-only / no device location */
  userLocationDot?: UserGeoPoint | null;
  /** Active default / map search radius for empty-state + expanded copy */
  searchRadiusMiles?: number;
  activeFilterCount: number;
  hasSearch: boolean;
  /** Primary list is empty because nothing is inside the ZIP radius */
  areaEmpty?: boolean;
  /** Map “Search here” returned no specialists in the visible area */
  mapSearchEmpty?: boolean;
  /** User expanded beyond the default ZIP radius */
  nearbyExpanded?: boolean;
  /** When false, map is rendered by the page (mobile map-hero layout) */
  showMap?: boolean;
  /** Desktop ≥1024px: side-by-side map rail — list only, no List/Map tabs */
  layout?: "toggle" | "split";
  onClearFilters: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
  onExpandNearby?: () => void;
}

type ExploreViewMode = "list" | "map";

export const ExploreResults = memo(function ExploreResults({
  trainers,
  suggestedTrainers = [],
  areaCenter = null,
  userLocationDot = null,
  searchRadiusMiles = DEFAULT_EXPLORE_RADIUS_MILES,
  activeFilterCount,
  hasSearch,
  areaEmpty = false,
  mapSearchEmpty = false,
  nearbyExpanded = false,
  showMap = true,
  layout = "toggle",
  onClearFilters,
  onClearSearch,
  onClearAll,
  onExpandNearby,
}: ExploreResultsProps) {
  const isMobile = useMobileViewport(true);
  const [viewMode, setViewMode] = useState<ExploreViewMode>("list");
  const radiusLabel = Math.round(searchRadiusMiles);

  if (trainers.length === 0) {
    const isUnfilteredEmpty =
      !hasSearch && activeFilterCount === 0 && !areaEmpty && !mapSearchEmpty;

    return (
      <div className="explore-results-empty-stack">
        <div className="explore-empty">
          <p className="explore-empty__title">
            {mapSearchEmpty
              ? "0 results in this map area"
              : areaEmpty
                ? "No specialists in that area"
                : isUnfilteredEmpty
                  ? "Specialists are joining SMOAC"
                  : "No specialists found"}
          </p>
          <p className="explore-empty__text">
            {mapSearchEmpty
              ? "No specialists match this part of the map. Pan or zoom to another area and tap Search here, or Recenter to your default search area."
              : areaEmpty
                ? `Nothing matched within about ${radiusLabel} miles of your search location. Broaden to find nearby specialists, or browse suggestions below.`
                : isUnfilteredEmpty
                  ? "We’re building the roster carefully. Check back soon — or create an account to get notified as specialists go live near you."
                  : "Try adjusting your filters or search query."}
          </p>
          <div className="explore-empty__actions">
            {areaEmpty && !mapSearchEmpty && onExpandNearby ? (
              <button
                type="button"
                onClick={onExpandNearby}
                className="explore-empty__btn explore-empty__btn--primary"
              >
                Broaden filters to find nearby specialists
              </button>
            ) : null}
            {hasSearch ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="explore-empty__btn explore-empty__btn--ghost"
              >
                Clear search
              </button>
            ) : null}
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="explore-empty__btn explore-empty__btn--ghost"
              >
                Clear filters
              </button>
            ) : null}
            {isUnfilteredEmpty ? (
              <Link
                href="/create-account?role=client"
                className="explore-empty__btn explore-empty__btn--primary"
              >
                Create client account
              </Link>
            ) : !areaEmpty && !mapSearchEmpty ? (
              <Link
                href="/explore"
                onClick={(e) => {
                  if (hasSearch || activeFilterCount > 0) {
                    e.preventDefault();
                    onClearAll();
                  }
                }}
                className="explore-empty__btn explore-empty__btn--ghost"
              >
                View all specialists
              </Link>
            ) : null}
          </div>
        </div>

        {mapSearchEmpty ? null : (
          <ExploreSuggestedSpecialists trainers={suggestedTrainers} />
        )}
      </div>
    );
  }

  const expandedNote = nearbyExpanded ? (
    <p className="explore-results-heading__note">
      Showing nearby specialists beyond the default {radiusLabel}-mile area —
      closest first.
    </p>
  ) : null;

  if (isMobile) {
    return (
      <div className="explore-results-split">
        {expandedNote}
        {showMap ? (
          <ExploreMap
            trainers={trainers}
            areaCenter={areaCenter}
            userLocationDot={userLocationDot}
            locked
            variant="split"
            showNotes={false}
          />
        ) : null}
        <div className="explore-results-split__list">
          <p className="explore-results-split__count">
            {trainers.length} specialist{trainers.length === 1 ? "" : "s"} in
            this area
          </p>
          <TrainerList trainers={trainers} variant="explore" priorityCount={4} />
        </div>
      </div>
    );
  }

  if (layout === "split") {
    return (
      <div className="explore-results-stack explore-results-stack--split">
        {expandedNote}
        <TrainerList
          trainers={trainers}
          variant="explore"
          priorityCount={4}
          className="trainer-card-list--split-rail"
        />
      </div>
    );
  }

  return (
    <div className="explore-results-stack">
      <div
        className="explore-view-toggle"
        role="tablist"
        aria-label="Results view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "list"}
          className={
            viewMode === "list"
              ? "explore-view-toggle__btn explore-view-toggle__btn--active"
              : "explore-view-toggle__btn"
          }
          onClick={() => setViewMode("list")}
        >
          List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "map"}
          className={
            viewMode === "map"
              ? "explore-view-toggle__btn explore-view-toggle__btn--active"
              : "explore-view-toggle__btn"
          }
          onClick={() => setViewMode("map")}
        >
          Map
        </button>
      </div>

      {expandedNote}

      {viewMode === "map" ? (
        <ExploreMap
          trainers={trainers}
          areaCenter={areaCenter}
          userLocationDot={userLocationDot}
          locked
          variant="panel"
        />
      ) : (
        <TrainerList trainers={trainers} variant="explore" priorityCount={4} />
      )}
    </div>
  );
});
