"use client";

import { useEffect, useRef, useState } from "react";
import type { ActiveFilterChip, ActiveFilterKey } from "@/lib/explore-active-filters";
import {
  SearchIcon,
  FilterIcon,
  ChevronDownIcon,
  LocationMarkIcon,
} from "@/components/ui/icons";
import { ExploreActiveFilterChips } from "./ExploreActiveFilterChips";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUserLocation } from "@/hooks/useUserLocation";
import { hasClientSearchLocation } from "@/lib/explore-location-filters";
import { completeGeolocationAsync } from "@/lib/user-location-store";
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
  /** When false, only the search field is shown (filters bar lives elsewhere) */
  showInlineFiltersBar?: boolean;
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
  showInlineFiltersBar = true,
}: ExploreSearchToolbarProps) {
  const { session } = useAuthSession();
  const { hasLocation, pillLabel, isPlaceholder } = useUserLocation();
  const locationReady =
    hasLocation || hasClientSearchLocation(session) || !isPlaceholder;
  const [draft, setDraft] = useState(searchQuery);
  const [appliedQuery, setAppliedQuery] = useState(searchQuery);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const blurCloseTimerRef = useRef<number | null>(null);
  /** Only open location suggestion after a real tap/click — not tab autofocus. */
  const openSuggestionsFromUserRef = useRef(false);
  const hasChips = activeFilterChips.length > 0;
  const hasDraft = Boolean(draft.trim());

  if (searchQuery !== appliedQuery) {
    setAppliedQuery(searchQuery);
    setDraft(searchQuery);
  }

  useEffect(() => {
    return () => {
      if (blurCloseTimerRef.current != null) {
        window.clearTimeout(blurCloseTimerRef.current);
      }
    };
  }, []);

  function clearBlurCloseTimer() {
    if (blurCloseTimerRef.current != null) {
      window.clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuggestionsOpen(false);
    onSearchSubmit(draft);
  }

  function handleClear() {
    setDraft("");
    onClearSearch();
  }

  function handlePointerDown() {
    openSuggestionsFromUserRef.current = true;
  }

  function handleFocus() {
    clearBlurCloseTimer();
    setGeoError(null);
    /* Already have a header ZIP / GPS — don’t re-prompt for location. */
    if (locationReady) {
      openSuggestionsFromUserRef.current = false;
      return;
    }
    if (openSuggestionsFromUserRef.current) {
      setSuggestionsOpen(true);
    }
    openSuggestionsFromUserRef.current = false;
  }

  function handleBlur() {
    clearBlurCloseTimer();
    openSuggestionsFromUserRef.current = false;
    blurCloseTimerRef.current = window.setTimeout(() => {
      setSuggestionsOpen(false);
    }, 140);
  }

  function handleUseCurrentLocation() {
    clearBlurCloseTimer();
    setGeoError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Location is unavailable on this device.");
      setSuggestionsOpen(true);
      return;
    }

    setGeoLoading(true);
    setSuggestionsOpen(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          const result = await completeGeolocationAsync(
            position.coords.latitude,
            position.coords.longitude
          );
          setGeoLoading(false);
          if (!result.ok) {
            setGeoError(result.message);
            setSuggestionsOpen(true);
            return;
          }
          setSuggestionsOpen(false);
          document.getElementById("explore-search-input")?.blur();
        })();
      },
      (error) => {
        setGeoLoading(false);
        setSuggestionsOpen(true);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError(
            "Location access was denied. Allow location in your browser settings, or set it from the header."
          );
          return;
        }
        if (error.code === error.TIMEOUT) {
          setGeoError("Location timed out. Try again.");
          return;
        }
        setGeoError("Couldn’t read your location. Try again.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      }
    );
  }

  return (
    <div className="explore-toolbar">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "explore-search-shell",
          suggestionsOpen && "explore-search-shell--suggestions-open"
        )}
      >
        <div className="explore-search-shell__row">
          <div className="explore-search-shell__field">
            <SearchIcon className="explore-search-shell__icon" />
            <input
              id="explore-search-input"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPointerDown={handlePointerDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={
                locationReady && !isPlaceholder
                  ? `Search near ${pillLabel}…`
                  : "Search trainers, coaches, nutritionists..."
              }
              aria-label="Search specialists"
              aria-expanded={suggestionsOpen}
              aria-controls="explore-search-suggestions"
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

        {suggestionsOpen && !locationReady ? (
          <div
            id="explore-search-suggestions"
            className="explore-search-suggestions"
            role="listbox"
            aria-label="Search suggestions"
          >
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="smoac-control explore-search-suggestions__item"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleUseCurrentLocation}
              disabled={geoLoading}
            >
              <span className="explore-search-suggestions__icon" aria-hidden>
                <LocationMarkIcon className="h-4 w-4" />
              </span>
              <span className="explore-search-suggestions__copy">
                <span className="explore-search-suggestions__label">
                  {geoLoading
                    ? "Finding your location…"
                    : "Use your current location"}
                </span>
                <span className="explore-search-suggestions__hint">
                  Show specialists near you
                </span>
              </span>
            </button>
            {geoError ? (
              <p className="explore-search-suggestions__error" role="status">
                {geoError}
              </p>
            ) : null}
          </div>
        ) : null}
      </form>

      {showInlineFiltersBar ? (
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
      ) : hasChips ? (
        <ExploreActiveFilterChips
          chips={activeFilterChips}
          onRemove={onRemoveFilter}
          onClearAll={onClearFilters}
        />
      ) : null}
    </div>
  );
}

interface ExploreFiltersBarProps {
  activeFilterCount: number;
  onOpenFilters: () => void;
}

/** Full-width Filters control matching the Search mockup. */
export function ExploreFiltersBar({
  activeFilterCount,
  onOpenFilters,
}: ExploreFiltersBarProps) {
  return (
    <button
      type="button"
      onClick={onOpenFilters}
      className={cn(
        "smoac-control explore-filters-bar",
        activeFilterCount > 0 && "explore-filters-bar--active"
      )}
      aria-label={
        activeFilterCount > 0
          ? `Filters, ${activeFilterCount} active`
          : "Open filters"
      }
    >
      <span className="explore-filters-bar__leading">
        <FilterIcon className="explore-filters-bar__icon" />
        <span className="explore-filters-bar__label">Filters</span>
        {activeFilterCount > 0 ? (
          <span className="explore-filters-bar__badge" aria-hidden>
            {activeFilterCount}
          </span>
        ) : null}
      </span>
      <ChevronDownIcon className="explore-filters-bar__chevron" />
    </button>
  );
}
