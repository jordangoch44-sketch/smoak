"use client";

import { useEffect, useRef, useState } from "react";
import type { ActiveFilterChip, ActiveFilterKey } from "@/lib/explore-active-filters";
import { SearchIcon, FilterIcon } from "@/components/ui/icons";
import { ExploreActiveFilterChips } from "./ExploreActiveFilterChips";
import { ExploreSearchOverlay } from "./ExploreSearchOverlay";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useUserLocation } from "@/hooks/useUserLocation";
import { hasClientSearchLocation } from "@/lib/explore-location-filters";
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
  const [overlayOpen, setOverlayOpen] = useState(false);
  const openFromUserRef = useRef(false);
  const hasChips = activeFilterChips.length > 0;
  const hasDraft = Boolean(draft.trim());

  if (searchQuery !== appliedQuery) {
    setAppliedQuery(searchQuery);
    setDraft(searchQuery);
  }

  function openOverlay() {
    setOverlayOpen(true);
  }

  function closeOverlay() {
    setOverlayOpen(false);
    openFromUserRef.current = false;
  }

  function handleSubmitFromOverlay(query: string) {
    setDraft(query);
    setOverlayOpen(false);
    onSearchSubmit(query);
  }

  function handleClear() {
    setDraft("");
    onClearSearch();
  }

  function handlePointerDown() {
    openFromUserRef.current = true;
  }

  function handleFocus() {
    if (openFromUserRef.current || overlayOpen) {
      openOverlay();
    }
    openFromUserRef.current = false;
  }

  useEffect(() => {
    if (!overlayOpen) return;
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        setOverlayOpen(false);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [overlayOpen]);

  return (
    <div className="explore-toolbar">
      <div className="explore-search-row">
        <div
          className={cn(
            "explore-search-shell",
            overlayOpen && "explore-search-shell--overlay-open"
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
                readOnly
                value={draft}
                onPointerDown={handlePointerDown}
                onFocus={handleFocus}
                onClick={openOverlay}
                placeholder={
                  locationReady && !isPlaceholder
                    ? `Search near ${pillLabel}…`
                    : "Name or keyword…"
                }
                aria-label="Search specialists"
                aria-expanded={overlayOpen}
                aria-controls="explore-search-overlay-input"
                className="smoac-control explore-search-shell__input"
              />
              {hasDraft ? (
                <button
                  type="button"
                  className="smoac-control explore-search-shell__clear"
                  aria-label="Clear search"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleClear();
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
        </div>

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

      <ExploreSearchOverlay
        open={overlayOpen}
        draft={draft}
        onDraftChange={setDraft}
        onClose={closeOverlay}
        onSubmit={handleSubmitFromOverlay}
        showLocationPrompt={!locationReady}
        locationLabel={
          locationReady && !isPlaceholder ? pillLabel : undefined
        }
      />
    </div>
  );
}
