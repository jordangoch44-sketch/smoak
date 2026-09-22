"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExploreRouteLoading } from "@/components/explore/ExploreRouteLoading";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { HomeBoostRibbon } from "@/components/home/HomeBoostRibbon";
import { useExploreTrainers } from "@/hooks/useExploreTrainers";
import { usePublicCatalog } from "@/hooks/usePublicCatalog";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { peekDesktopProfilePopup } from "@/lib/desktop-profile-popup";
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

export function ExplorePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMobileViewport(true);
  const isCompactLayout = useTabletViewport(true);
  const isDesktopSplit = !isMobile && !isCompactLayout;
  const preciseUserLocation = usePreciseUserCoordinates();
  const pendingMapAreaRef = useRef<ExploreSearchArea | null>(null);
  const searchIdleTimerRef = useRef<number | null>(null);
  const { trainers, catalogMode, catalogHydrated } = usePublicCatalog();
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

  useLayoutEffect(() => {
    const href = peekDesktopProfilePopup();
    if (!href) return;
    router.push(href, { scroll: false });
  }, [router]);

  const clearSearchIdleTimer = useCallback(() => {
    if (searchIdleTimerRef.current == null) return;
    window.clearTimeout(searchIdleTimerRef.current);
    searchIdleTimerRef.current = null;
  }, []);

  useEffect(() => () => clearSearchIdleTimer(), [clearSearchIdleTimer]);

  const handleMapSearchStart = useCallback(() => {
    setMapSearchLoading(true);
  }, []);

  const handlePendingSearchAreaChange = useCallback(
    (area: ExploreSearchArea | null) => {
      pendingMapAreaRef.current = area;
      clearSearchIdleTimer();
      if (!area) {
        setMapSearchLoading(false);
        return;
      }
      setMapSearchLoading(true);
      searchIdleTimerRef.current = window.setTimeout(() => {
        searchIdleTimerRef.current = null;
        const next = pendingMapAreaRef.current;
        if (!next) {
          setMapSearchLoading(false);
          return;
        }
        applyMapSearchArea(next);
        pendingMapAreaRef.current = null;
        setMapSearchLoading(false);
      }, 520);
    },
    [applyMapSearchArea, clearSearchIdleTimer]
  );

  const handleRecenterSearch = useCallback(() => {
    pendingMapAreaRef.current = null;
    clearSearchIdleTimer();
    setMapSearchLoading(false);
    resetMapSearchArea();
  }, [clearSearchIdleTimer, resetMapSearchArea]);

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
      <HomeBoostRibbon className="home-boost-card--explore" />
      <div className="explore-results-heading">
        <div className="explore-results-heading__copy">
          <h2 className="explore-results-heading__title">Top experts near you</h2>
          {mapSearchLoading && isDesktopSplit ? (
            <p className="explore-results-heading__searching" aria-live="polite">
              Searching this area…
            </p>
          ) : null}
        </div>
        <FastActivateButton
          className="smoac-control explore-results-heading__view-all"
          onActivate={handleViewAll}
        >
          View all
        </FastActivateButton>
      </div>
      {(filters.profession || filters.specialty) &&
      !filtered.some((t) => t.sponsored) &&
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
        isMobile && "explore-page--map-hero explore-page--map-shell",
        isDesktopSplit && "explore-page--desktop-split"
      )}
    >
      <div
        className={cn(
          "explore-page__content",
          isMobile && "explore-page__content--map-hero",
          isDesktopSplit && "explore-page__content--desktop-split"
        )}
      >
        {!isMobile && !isDesktopSplit ? <ExplorePageHeader /> : null}

        {isMobile ? (
          <section className="explore-map-hero" aria-label="Search map">
            <ExploreMap
              trainers={filtered}
              areaCenter={searchOrigin}
              userLocationDot={preciseUserLocation}
              activeSearchArea={activeSearchArea}
              onMapSearchStart={handleMapSearchStart}
              onPendingSearchAreaChange={handlePendingSearchAreaChange}
              onRecenterSearch={handleRecenterSearch}
              searchLoading={mapSearchLoading}
              locked={false}
              variant="hero"
              showNotes={false}
            />
            <div className="explore-map-hero__controls">
              {searchToolbar}
            </div>
          </section>
        ) : isDesktopSplit ? null : (
          searchToolbar
        )}

        {isMobile ? (
          <ExploreResultsSheet
            resultCount={filtered.length}
            searchLoading={mapSearchLoading}
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
                  onMapSearchStart={handleMapSearchStart}
                  onPendingSearchAreaChange={handlePendingSearchAreaChange}
                  onRecenterSearch={handleRecenterSearch}
                  searchLoading={mapSearchLoading}
                  locked={false}
                  variant="column"
                  showNotes={false}
                />
                <div className="explore-page__map-rail-controls">
                  {searchToolbar}
                </div>
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
    </div>
  );
}
