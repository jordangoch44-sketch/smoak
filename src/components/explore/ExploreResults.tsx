import Link from "next/link";
import { memo } from "react";
import type { Trainer } from "@/types";
import { TrainerList } from "@/components/trainers";

interface ExploreResultsProps {
  trainers: Trainer[];
  activeFilterCount: number;
  hasSearch: boolean;
  /** Filters were relaxed so nearby results still appear */
  resultsBroadened?: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

export const ExploreResults = memo(function ExploreResults({
  trainers,
  activeFilterCount,
  hasSearch,
  resultsBroadened = false,
  onClearFilters,
  onClearSearch,
  onClearAll,
}: ExploreResultsProps) {
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

  return (
    <div className="explore-results-stack">
      {resultsBroadened ? (
        <p className="explore-results-heading__note">
          Showing nearby specialists — closest to you first.
        </p>
      ) : null}
      <TrainerList trainers={trainers} variant="explore" priorityCount={4} />
    </div>
  );
});
