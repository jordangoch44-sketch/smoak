"use client";

import Link from "next/link";
import { memo, useMemo, useState } from "react";
import type { Trainer, TrainerFilters } from "@/types";
import { TrainerList } from "@/components/trainers";
import { useActiveUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { resolveExploreMapArea } from "@/lib/explore-location-filters";
import { ExploreMap } from "./ExploreMap";

interface ExploreResultsProps {
  trainers: Trainer[];
  filters: TrainerFilters;
  activeFilterCount: number;
  hasSearch: boolean;
  /** Filters were relaxed so nearby results still appear */
  resultsBroadened?: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

type ExploreViewMode = "list" | "map";

export const ExploreResults = memo(function ExploreResults({
  trainers,
  filters,
  activeFilterCount,
  hasSearch,
  resultsBroadened = false,
  onClearFilters,
  onClearSearch,
  onClearAll,
}: ExploreResultsProps) {
  const isMobile = useMobileViewport(true);
  const userCoords = useActiveUserCoordinates();
  const [viewMode, setViewMode] = useState<ExploreViewMode>("list");

  const areaCenter = useMemo(
    () => resolveExploreMapArea(filters, userCoords),
    [filters, userCoords]
  );

  if (trainers.length === 0) {
    const isUnfilteredEmpty = !hasSearch && activeFilterCount === 0;

    return (
      <div className="explore-empty">
        <p className="explore-empty__title">
          {isUnfilteredEmpty
            ? "Specialists are joining SMOAC"
            : "No specialists found"}
        </p>
        <p className="explore-empty__text">
          {isUnfilteredEmpty
            ? "We’re building the roster carefully. Check back soon — or create an account to get notified as specialists go live near you."
            : "Try adjusting your filters or search query."}
        </p>
        <div className="explore-empty__actions">
          {hasSearch ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="explore-empty__btn explore-empty__btn--primary"
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
          ) : (
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
          )}
        </div>
      </div>
    );
  }

  const broadenedNote = resultsBroadened ? (
    <p className="explore-results-heading__note">
      Showing nearby specialists — closest to you first.
    </p>
  ) : null;

  if (isMobile) {
    return (
      <div className="explore-results-split">
        {broadenedNote}
        <ExploreMap
          trainers={trainers}
          areaCenter={areaCenter}
          locked
          variant="split"
          showNotes={false}
        />
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

      {broadenedNote}

      {viewMode === "map" ? (
        <ExploreMap
          trainers={trainers}
          areaCenter={areaCenter}
          locked
          variant="panel"
        />
      ) : (
        <TrainerList trainers={trainers} variant="explore" priorityCount={4} />
      )}
    </div>
  );
});
