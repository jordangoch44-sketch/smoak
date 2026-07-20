"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { useExploreTrainers } from "@/hooks/useExploreTrainers";
import type { Trainer } from "@/types/trainer";
import { ExplorePageHeader } from "./ExplorePageHeader";
import { ExploreSearchToolbar } from "./ExploreSearchToolbar";
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

  return (
    <div className="explore-page">
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
          onSearchSubmit={submitSearch}
          onClearSearch={clearSearch}
          activeFilterChips={activeFilterChips}
          onRemoveFilter={removeFilter}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => setMobileFiltersOpen(true)}
          onClearFilters={clearFilters}
        />

        <div className="explore-page__layout">
          <main className="explore-page__results">
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
