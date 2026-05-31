import Link from "next/link";
import { memo } from "react";
import type { Trainer } from "@/types";
import { TrainerList } from "@/components/trainers";

interface ExploreResultsProps {
  trainers: Trainer[];
  activeFilterCount: number;
  hasSearch: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

export const ExploreResults = memo(function ExploreResults({
  trainers,
  activeFilterCount,
  hasSearch,
  onClearFilters,
  onClearSearch,
  onClearAll,
}: ExploreResultsProps) {
  if (trainers.length === 0) {
    return (
      <div className="explore-empty">
        <p className="explore-empty__title">No specialists found</p>
        <p className="explore-empty__text">
          Try adjusting your filters or search query.
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
        </div>
      </div>
    );
  }

  return (
    <TrainerList trainers={trainers} variant="explore" priorityCount={4} />
  );
});
