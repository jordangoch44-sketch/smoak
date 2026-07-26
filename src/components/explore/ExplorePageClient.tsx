"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { useExploreTrainers } from "@/hooks/useExploreTrainers";
import type { ExploreBrowseCategory } from "@/lib/explore-browse-categories";
import type { Trainer } from "@/types/trainer";
import { ExplorePageHeader } from "./ExplorePageHeader";
import {
  ExploreSearchToolbar,
  ExploreFiltersBar,
} from "./ExploreSearchToolbar";
import { ExploreBrowseCategories } from "./ExploreBrowseCategories";
import { ExploreFiltersDrawer } from "./ExploreFiltersDrawer";
import { ExploreResults } from "./ExploreResults";

export function ExplorePageClient({
  initialCatalog,
  catalogMode = "live",
}: {
  initialCatalog?: Trainer[];
  catalogMode?: "live" | "seed";
}) {
  const searchParams = useSearchParams();
  const didFocusSearchRef = useRef(false);
  const resultsRef = useRef<HTMLElement | null>(null);

  const {
    filters,
    setFilters,
    displayQuery,
    submitSearch,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    filtered,
    getExploreMatchCount,
    activeFilterCount,
    activeFilterChips,
    hasSearch,
    clearFilters,
    clearSearch,
    clearAll,
    removeFilter,
  } = useExploreTrainers({
    initialSpecialty: searchParams.get("specialty") ?? "",
    initialQuery: searchParams.get("q") ?? "",
    initialCatalog,
    catalogMode,
  });

  useEffect(() => {
    if (searchParams.get("focus") !== "search" || didFocusSearchRef.current) {
      return;
    }
    didFocusSearchRef.current = true;
    const input = document.getElementById("explore-search-input");
    if (!(input instanceof HTMLInputElement)) return;
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      input.select();
    });
  }, [searchParams]);

  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleSearchSubmit = useCallback(
    (query: string) => {
      submitSearch(query);
      scrollToResults();
    },
    [submitSearch, scrollToResults]
  );

  const handleCategorySelect = useCallback(
    (category: ExploreBrowseCategory) => {
      submitSearch(category.searchQuery);
      scrollToResults();
    },
    [submitSearch, scrollToResults]
  );

  const handleViewAll = useCallback(() => {
    clearSearch();
    clearFilters();
    scrollToResults();
  }, [clearSearch, clearFilters, scrollToResults]);

  return (
    <div className="explore-page explore-page--results">
      <div className="explore-page__canvas" aria-hidden>
        <div className="atmosphere-mesh">
          <div className="atmosphere-blob atmosphere-blob--indigo" />
          <div className="atmosphere-blob atmosphere-blob--blue" />
          <div className="atmosphere-blob atmosphere-blob--violet" />
          <div className="atmosphere-blob atmosphere-blob--magenta" />
          <div className="atmosphere-blob atmosphere-blob--core" />
        </div>
        <AuroraAtmosphere
          intensity="subtle"
          starDensity="none"
          glowPosition="search"
          glowColor="mixed"
          enableMotion
          className="explore-page__cosmic"
        />
        <div className="explore-page__header-glow" />
        <div className="atmosphere-vignette atmosphere-vignette--soft" />
        <div className="atmosphere-grain" />
      </div>

      <div className="explore-page__content">
        <ExplorePageHeader
          filters={filters}
          searchQuery={displayQuery}
        />

        <ExploreSearchToolbar
          searchQuery={displayQuery}
          onSearchSubmit={handleSearchSubmit}
          onClearSearch={clearSearch}
          activeFilterChips={activeFilterChips}
          onRemoveFilter={removeFilter}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => setMobileFiltersOpen(true)}
          onClearFilters={clearFilters}
          showInlineFiltersBar={false}
        />

        <div className="explore-page__layout">
          <ExploreBrowseCategories
            onSelect={handleCategorySelect}
            activeSearchQuery={displayQuery}
          />

          <ExploreFiltersBar
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setMobileFiltersOpen(true)}
          />

          <main
            ref={resultsRef}
            className="explore-page__results"
            id="explore-results"
          >
            <div className="explore-results-heading">
              <h2 className="explore-results-heading__title">
                Top experts near you
              </h2>
              <button
                type="button"
                className="smoac-control explore-results-heading__view-all"
                onClick={handleViewAll}
              >
                View all
              </button>
            </div>

            <ExploreResults
              trainers={filtered}
              activeFilterCount={activeFilterCount}
              hasSearch={hasSearch}
              onClearFilters={clearFilters}
              onClearSearch={clearSearch}
              onClearAll={clearAll}
            />
          </main>
        </div>
      </div>

      <ExploreFiltersDrawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={filters}
        onApply={setFilters}
        getMatchCount={getExploreMatchCount}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
