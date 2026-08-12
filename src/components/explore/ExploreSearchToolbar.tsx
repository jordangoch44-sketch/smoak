"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ActiveFilterChip, ActiveFilterKey } from "@/lib/explore-active-filters";
import { SearchIcon, FilterIcon } from "@/components/ui/icons";
import { ExploreActiveFilterChips } from "./ExploreActiveFilterChips";
import {
  ExploreSearchOverlay,
  type ExploreSearchOverlayAnchor,
} from "./ExploreSearchOverlay";
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
  const [anchor, setAnchor] = useState<ExploreSearchOverlayAnchor | null>(null);
  const openFromUserRef = useRef(false);
  const searchRowRef = useRef<HTMLDivElement | null>(null);
  const hasChips = activeFilterChips.length > 0;
  const hasDraft = Boolean(draft.trim());

  if (searchQuery !== appliedQuery) {
    setAppliedQuery(searchQuery);
    setDraft(searchQuery);
  }

  function measureAnchor() {
    const el = searchRowRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: Math.max(0, rect.top),
      insetInline: Math.max(0, rect.left),
    };
  }

  function openOverlay() {
    const next = measureAnchor();
    if (next) setAnchor(next);
    setOverlayOpen(true);
  }

  function closeOverlay() {
    setOverlayOpen(false);
    setAnchor(null);
    openFromUserRef.current = false;
  }

  function handleSubmitFromOverlay(query: string) {
    setDraft(query);
    setOverlayOpen(false);
    setAnchor(null);
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

  useLayoutEffect(() => {
    if (!overlayOpen) return;

    function sync() {
      const next = measureAnchor();
      if (!next) return;
      setAnchor((prev) => {
        if (
          prev &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.insetInline - next.insetInline) < 0.5
        ) {
          return prev;
        }
        return next;
      });
    }

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", sync);
    visualViewport?.addEventListener("scroll", sync);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      visualViewport?.removeEventListener("resize", sync);
      visualViewport?.removeEventListener("scroll", sync);
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!overlayOpen) return;
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        closeOverlay();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [overlayOpen]);

  return (
    <div className="explore-toolbar">
      <div
        className={cn(
          "explore-search-row",
          overlayOpen && "explore-search-row--ghost"
        )}
        ref={searchRowRef}
      >
        <div className="explore-search-shell">
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
                tabIndex={overlayOpen ? -1 : 0}
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
                aria-controls="explore-search-overlay-panel"
                className="smoac-control explore-search-shell__input"
              />
              {hasDraft && !overlayOpen ? (
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
          tabIndex={overlayOpen ? -1 : 0}
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

      {hasChips && !overlayOpen ? (
        <ExploreActiveFilterChips
          chips={activeFilterChips}
          onRemove={onRemoveFilter}
          onClearAll={onClearFilters}
        />
      ) : null}

      <ExploreSearchOverlay
        open={overlayOpen}
        anchor={anchor}
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
