"use client";

import { useSearchParams } from "next/navigation";
import { useExploreTrainers } from "@/hooks/useExploreTrainers";
import { TrainerFilters as FiltersPanel } from "./TrainerFilters";
import { ExplorePageHeader } from "./ExplorePageHeader";
import { ExploreSearchToolbar } from "./ExploreSearchToolbar";
import { ExploreFiltersDrawer } from "./ExploreFiltersDrawer";
import { ExploreResults } from "./ExploreResults";

export function ExplorePageClient() {
  const searchParams = useSearchParams();
  const {
    filters,
    setFilters,
    displayQuery,
    submitSearch,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    filtered,
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
  });

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
        <div className="explore-page__header-glow" />
        <div className="atmosphere-vignette atmosphere-vignette--soft" />
        <div className="atmosphere-grain" />
      </div>

      <div className="explore-page__content">
        <ExplorePageHeader
          resultCount={filtered.length}
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
          <aside className="explore-page__filters hidden lg:block">
            <div className="explore-filter-panel">
              <FiltersPanel filters={filters} onChange={setFilters} />
            </div>
          </aside>

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
        activeFilterCount={activeFilterCount}
        resultCount={filtered.length}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
