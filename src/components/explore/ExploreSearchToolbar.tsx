"use client";

import { useEffect, useRef, useState } from "react";
import type { ActiveFilterChip, ActiveFilterKey } from "@/lib/explore-active-filters";
import {
  SearchIcon,
  FilterIcon,
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
          try {
            const result = await completeGeolocationAsync(
              position.coords.latitude,
              position.coords.longitude
            );
            if (!result.ok) {
              setGeoError(result.message);
              setSuggestionsOpen(true);
              return;
            }
            setSuggestionsOpen(false);
            document.getElementById("explore-search-input")?.blur();
          } catch {
            setGeoError("Couldn’t finish locating you. Try again.");
            setSuggestionsOpen(true);
          } finally {
            setGeoLoading(false);
          }
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
      <div className="explore-search-row">
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

        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            "smoac-control explore-filters-icon-btn",
            activeFilterCount > 0 && "explore-filters-icon-btn--active"
          )}
          aria-label={
            activeFilterCount > 0
              ? `Filters, ${activeFilterCount} active`
              : "Open filters"
          }
        >
          <FilterIcon className="explore-filters-icon-btn__icon" />
          {activeFilterCount > 0 ? (
            <span className="explore-filters-icon-btn__badge" aria-hidden>
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {hasChips ? (
        <ExploreActiveFilterChips
          chips={activeFilterChips}
          onRemove={onRemoveFilter}
          onClearAll={onClearFilters}
        />
      ) : null}
    </div>
  );
}
