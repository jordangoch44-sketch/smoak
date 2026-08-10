"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { ExploreRouteLoading } from "@/components/explore/ExploreRouteLoading";
import { BoostVisibilityModal } from "@/components/dashboard/shared/BoostVisibilityModal";
import { useExploreTrainers } from "@/hooks/useExploreTrainers";
import { useAuthSession } from "@/hooks/useAuthSession";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { useUserLocationEditor } from "@/contexts/UserLocationContext";
import { hasClientSearchLocation } from "@/lib/explore-location-filters";
import { USER_LOCATION_CHANGE_EVENT } from "@/lib/user-location-storage";
import type { ExploreBrowseCategory } from "@/lib/explore-browse-categories";
import { ExplorePageHeader } from "./ExplorePageHeader";
import {
  ExploreSearchToolbar,
  ExploreFiltersBar,
} from "./ExploreSearchToolbar";
import { ExploreBrowseCategories } from "./ExploreBrowseCategories";
import { ExploreFiltersDrawer } from "./ExploreFiltersDrawer";
import { ExploreResults } from "./ExploreResults";
import { SitePromoSlot } from "@/components/promo/SitePromoSlot";

export function ExplorePageClient() {
  const searchParams = useSearchParams();
  const { session } = useAuthSession();
  const isCompactAtmosphere = useTabletViewport(true);
  const { openLocationPanel } = useUserLocationEditor();
  const pendingSearchRef = useRef<string | null>(null);
  const { trainers, catalogMode, catalogHydrated } = usePublicCatalog();
  const [boostOpen, setBoostOpen] = useState(false);

  const {
    filters,
    setFilters,
    displayQuery,
    submitSearch,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    filtered,
    resultsBroadened,
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
    initialCatalog: trainers,
    catalogMode,
  });

  const runSearchOrAskLocation = useCallback(
    (query: string) => {
      if (!hasClientSearchLocation(session)) {
        pendingSearchRef.current = query;
        openLocationPanel();
        return;
      }
      pendingSearchRef.current = null;
      submitSearch(query);
    },
    [session, openLocationPanel, submitSearch]
  );

  useEffect(() => {
    function flushPendingSearch() {
      const pending = pendingSearchRef.current;
      if (!pending) return;
      if (!hasClientSearchLocation(session)) return;
      pendingSearchRef.current = null;
      submitSearch(pending);
    }

    window.addEventListener(USER_LOCATION_CHANGE_EVENT, flushPendingSearch);
    return () => {
      window.removeEventListener(USER_LOCATION_CHANGE_EVENT, flushPendingSearch);
    };
  }, [session, submitSearch]);

  const handleCategorySelect = useCallback(
    (category: ExploreBrowseCategory) => {
      runSearchOrAskLocation(category.searchQuery);
    },
    [runSearchOrAskLocation]
  );

  const handleViewAll = useCallback(() => {
    clearSearch();
    clearFilters();
  }, [clearSearch, clearFilters]);

  if (!catalogHydrated) {
    return <ExploreRouteLoading />;
  }

  return (
    <div className="explore-page explore-page--results">
      <div className="explore-page__canvas" aria-hidden>
        {isCompactAtmosphere ? (
          <>
            <div className="explore-page__header-glow" />
            <div className="atmosphere-vignette atmosphere-vignette--soft" />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="explore-page__content">
        <ExplorePageHeader />

        <ExploreSearchToolbar
          searchQuery={displayQuery}
          onSearchSubmit={runSearchOrAskLocation}
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

          <main className="explore-page__results" id="explore-results">
            <SitePromoSlot
              slotId="explore_results_rail"
              variant="compact"
              onOpenBoost={() => setBoostOpen(true)}
            />
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
            {(filters.profession || filters.specialty) &&
            filtered.some((t) => t.categorySpotlight) ? (
              <p className="explore-results-heading__note">
                Category spotlight specialists appear first in these results.
              </p>
            ) : null}

            <ExploreResults
              trainers={filtered}
              filters={filters}
              activeFilterCount={activeFilterCount}
              hasSearch={hasSearch}
              resultsBroadened={resultsBroadened}
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

      <BoostVisibilityModal
        open={boostOpen}
        onClose={() => setBoostOpen(false)}
      />
    </div>
  );
}
