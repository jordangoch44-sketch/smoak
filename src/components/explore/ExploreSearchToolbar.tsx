"use client";

import { useState } from "react";
import type { ActiveFilterChip, ActiveFilterKey } from "@/lib/explore-active-filters";
import { SearchIcon, FilterIcon } from "@/components/ui/icons";
import { ExploreActiveFilterChips } from "./ExploreActiveFilterChips";
import { cn } from "@/lib/utils";

interface ExploreSearchToolbarProps {
  /** Applied query used for filtering and URL */
  searchQuery: string;
  onSearchSubmit: (query: string) => void;
  onClearSearch: () => void;
  activeFilterChips: ActiveFilterChip[];
  onRemoveFilter: (key: ActiveFilterKey) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onClearFilters: () => void;
}

export function ExploreSearchToolbar({
  searchQuery,
  onSearchSubmit,
  onClearSearch,
  activeFilterChips,
  onRemoveFilter,
  activeFilterCount,
  onOpenFilters,
  onClearFilters,
}: ExploreSearchToolbarProps) {
  const [draft, setDraft] = useState(searchQuery);
  const [appliedQuery, setAppliedQuery] = useState(searchQuery);
  const hasChips = activeFilterChips.length > 0;
  const hasDraft = Boolean(draft.trim());

  if (searchQuery !== appliedQuery) {
    setAppliedQuery(searchQuery);
    setDraft(searchQuery);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearchSubmit(draft);
  }

  function handleClear() {
    setDraft("");
    onClearSearch();
  }

  return (
    <div className="explore-toolbar">
      <form onSubmit={handleSubmit} className="explore-search-shell">
        <div className="explore-search-shell__row">
          <div className="explore-search-shell__field">
            <SearchIcon className="explore-search-shell__icon" />
            <input
              id="explore-search-input"
              type="search"
              enterKeyHint="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search by name, specialty, or city"
              aria-label="Search specialists"
              className="smoac-control explore-search-shell__input"
            />
            {hasDraft ? (
              <button
                type="button"
                className="smoac-control explore-search-shell__clear"
                aria-label="Clear search"
                onClick={handleClear}
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      </form>

      <div className="explore-toolbar__controls">
        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            "smoac-control explore-filter-pill",
            activeFilterCount > 0 && "explore-filter-pill--active"
          )}
          aria-label={
            activeFilterCount > 0
              ? `Filters, ${activeFilterCount} active`
              : "Filters"
          }
        >
          <FilterIcon className="explore-filter-pill__icon" />
          <span className="explore-filter-pill__label">Filters</span>
          {activeFilterCount > 0 ? (
            <span
              key={activeFilterCount}
              className="explore-filter-pill__badge"
              aria-hidden
            >
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        {hasChips ? (
          <ExploreActiveFilterChips
            chips={activeFilterChips}
            onRemove={onRemoveFilter}
            onClearAll={onClearFilters}
          />
        ) : null}
      </div>
    </div>
  );
}
