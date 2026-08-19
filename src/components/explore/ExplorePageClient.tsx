"use client";

import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { ExploreRouteLoading } from "@/components/explore/ExploreRouteLoading";
import { BoostVisibilityModal } from "@/components/dashboard/shared/BoostVisibilityModal";
import { useExploreTrainers } from "@/hooks/useExploreTrainers";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { DEFAULT_EXPLORE_RADIUS_MILES } from "@/lib/explore";
import type { ExploreSearchArea } from "@/lib/explore-map-area";
import type { ExploreBrowseCategory } from "@/lib/explore-browse-categories";
import { usePreciseUserCoordinates } from "@/hooks/usePreciseUserCoordinates";
import { cn } from "@/lib/utils";
import { ExplorePageHeader } from "./ExplorePageHeader";
import { ExploreSearchToolbar } from "./ExploreSearchToolbar";
import { ExploreFiltersDrawer } from "./ExploreFiltersDrawer";
import { ExploreMap } from "./ExploreMap";
import { ExploreResults } from "./ExploreResults";
import { ExploreResultsSheet } from "./ExploreResultsSheet";
import { SitePromoSlot } from "@/components/promo/SitePromoSlot";

export function ExplorePageClient() {
  const searchParams = useSearchParams();
  const isMobile = useMobileViewport(true);
  const isCompactAtmosphere = useTabletViewport(true);
  const isDesktopSplit = !isMobile && !isCompactAtmosphere;
  const preciseUserLocation = usePreciseUserCoordinates();
  const pendingMapAreaRef = useRef<ExploreSearchArea | null>(null);
  const { trainers, catalogMode, catalogHydrated } = usePublicCatalog();
  const [boostOpen, setBoostOpen] = useState(false);
  const [pendingMapArea, setPendingMapArea] =
    useState<ExploreSearchArea | null>(null);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);

  const {
    filters,
    setFilters,
    displayQuery,
    submitSearch,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    filtered,
    nearbyExpanded,
    areaEmpty,
    suggestedTrainers,
    searchOrigin,
    activeSearchArea,
    mapSearchActive,
    applyMapSearchArea,
    resetMapSearchArea,
    expandNearbyResults,
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

  pendingMapAreaRef.current = pendingMapArea;

  const handlePendingSearchAreaChange = useCallback(
    (area: ExploreSearchArea | null) => {
      setPendingMapArea(area);
    },
    []
  );

  const handleSearchHere = useCallback(() => {
    const area = pendingMapAreaRef.current;
    if (!area) return;
    setMapSearchLoading(true);
    applyMapSearchArea(area);
    setPendingMapArea(null);
    window.setTimeout(() => setMapSearchLoading(false), 280);
  }, [applyMapSearchArea]);

  const handleRecenterSearch = useCallback(() => {
    setPendingMapArea(null);
    setMapSearchLoading(false);
    resetMapSearchArea();
  }, [resetMapSearchArea]);

  const handleCategorySelect = useCallback(
    (category: ExploreBrowseCategory) => {
      submitSearch(category.searchQuery);
    },
    [submitSearch]
  );

  const handleViewAll = useCallback(() => {
    clearSearch();
    clearFilters();
  }, [clearSearch, clearFilters]);

  if (!catalogHydrated) {
    return <ExploreRouteLoading mapShell={isMobile} />;
  }

  const searchToolbar = (
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
  );

  const resultsMain = (
    <main className="explore-page__results" id="explore-results">
      <SitePromoSlot
        slotId="explore_results_rail"
        variant="compact"
        onOpenBoost={() => setBoostOpen(true)}
      />
      <div className="explore-results-heading">
        <h2 className="explore-results-heading__title">Top experts near you</h2>
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
        suggestedTrainers={suggestedTrainers}
        areaCenter={searchOrigin}
        userLocationDot={preciseUserLocation}
        searchRadiusMiles={
          activeSearchArea?.radiusMiles ?? DEFAULT_EXPLORE_RADIUS_MILES
        }
        activeFilterCount={activeFilterCount}
        hasSearch={hasSearch}
        areaEmpty={areaEmpty}
        mapSearchEmpty={mapSearchActive && filtered.length === 0}
        nearbyExpanded={nearbyExpanded}
        showMap={!isMobile && !isDesktopSplit}
        layout={isDesktopSplit ? "split" : "toggle"}
        onClearFilters={clearFilters}
        onClearSearch={clearSearch}
        onClearAll={clearAll}
        onExpandNearby={expandNearbyResults}
      />
    </main>
  );

  return (
    <div
      className={cn(
        "explore-page explore-page--results",
        isMobile && "explore-page--map-hero explore-page--map-shell"
      )}
    >
      {!isMobile ? (
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
      ) : null}

      <div
        className={cn(
          "explore-page__content",
          isMobile && "explore-page__content--map-hero"
        )}
      >
        {!isMobile ? <ExplorePageHeader /> : null}

        {isMobile ? (
          <section className="explore-map-hero" aria-label="Search map">
            <ExploreMap
              trainers={filtered}
              areaCenter={searchOrigin}
              userLocationDot={preciseUserLocation}
              activeSearchArea={activeSearchArea}
              onPendingSearchAreaChange={handlePendingSearchAreaChange}
              onRecenterSearch={handleRecenterSearch}
              locked={false}
              variant="hero"
              showNotes={false}
            />
            <div className="explore-map-hero__controls">
              {searchToolbar}
            </div>
          </section>
        ) : (
          searchToolbar
        )}

        {isMobile ? (
          <ExploreResultsSheet
            resultCount={filtered.length}
            showSearchHere={Boolean(pendingMapArea)}
            searchHereLoading={mapSearchLoading}
            onSearchHere={handleSearchHere}
          >
            {resultsMain}
          </ExploreResultsSheet>
        ) : isDesktopSplit ? (
          <div className="explore-page__layout explore-page__layout--split">
            <aside className="explore-page__map-rail" aria-label="Search map">
              <div className="explore-page__map-rail-inner">
                <ExploreMap
                  trainers={filtered}
                  areaCenter={searchOrigin}
                  userLocationDot={preciseUserLocation}
                  activeSearchArea={activeSearchArea}
                  onPendingSearchAreaChange={handlePendingSearchAreaChange}
                  onRecenterSearch={handleRecenterSearch}
                  showSearchHere={Boolean(pendingMapArea)}
                  searchHereLoading={mapSearchLoading}
                  onSearchHere={handleSearchHere}
                  locked={false}
                  variant="column"
                  showNotes={false}
                />
              </div>
            </aside>
            <div className="explore-page__results-rail">{resultsMain}</div>
          </div>
        ) : (
          <div className="explore-page__layout">{resultsMain}</div>
        )}
      </div>

      <ExploreFiltersDrawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={filters}
        onApply={setFilters}
        getMatchCount={getExploreMatchCount}
        onClearFilters={clearFilters}
        onSelectCategory={handleCategorySelect}
        activeSearchQuery={displayQuery}
      />

      <BoostVisibilityModal
        open={boostOpen}
        onClose={() => setBoostOpen(false)}
      />
    </div>
  );
}
