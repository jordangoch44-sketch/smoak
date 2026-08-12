"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
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
  const [overlayTop, setOverlayTop] = useState(0);
  const openFromUserRef = useRef(false);
  const searchRowRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
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
    inputRef.current?.blur();
  }

  function handleSubmitFromOverlay(query: string) {
    setDraft(query);
    setOverlayOpen(false);
    onSearchSubmit(query);
    inputRef.current?.blur();
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    handleSubmitFromOverlay(draft);
  }

  useLayoutEffect(() => {
    if (!overlayOpen) return;

    function measure() {
      const el = searchRowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setOverlayTop(rect.bottom + 10);
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", measure);
    visualViewport?.addEventListener("scroll", measure);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      visualViewport?.removeEventListener("resize", measure);
      visualViewport?.removeEventListener("scroll", measure);
    };
  }, [overlayOpen, hasChips, draft]);

  useEffect(() => {
    if (!overlayOpen) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [overlayOpen]);

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
    <div
      className={cn(
        "explore-toolbar",
        overlayOpen && "explore-toolbar--search-open"
      )}
    >
      <div className="explore-search-row" ref={searchRowRef}>
        <form
          onSubmit={handleSubmit}
          className={cn(
            "explore-search-shell",
            overlayOpen && "explore-search-shell--overlay-open"
          )}
        >
          <div className="explore-search-shell__row">
            <div className="explore-search-shell__field">
              <SearchIcon className="explore-search-shell__icon" />
              <input
                ref={inputRef}
                id="explore-search-input"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onPointerDown={handlePointerDown}
                onFocus={handleFocus}
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
        </form>

        {overlayOpen ? (
          <button
            type="button"
            onClick={closeOverlay}
            className="smoac-control explore-search-cancel"
          >
            Cancel
          </button>
        ) : (
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
        )}
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
        contentTop={overlayTop}
        onClose={closeOverlay}
        onSubmit={handleSubmitFromOverlay}
        showLocationPrompt={!locationReady}
      />
    </div>
  );
}
