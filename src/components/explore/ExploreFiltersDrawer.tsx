"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { TrainerFilters } from "@/types";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/ui/icons";
import { TrainerFilters as FiltersPanel } from "./TrainerFilters";

interface ExploreFiltersDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: TrainerFilters;
  onApply: (filters: TrainerFilters) => void;
  activeFilterCount: number;
  resultCount: number;
  onClearFilters: () => void;
}

function filtersSnapshot(filters: TrainerFilters): string {
  return JSON.stringify(filters);
}

export function ExploreFiltersDrawer({
  open,
  onClose,
  filters,
  onApply,
  activeFilterCount,
  resultCount,
  onClearFilters,
}: ExploreFiltersDrawerProps) {
  const [draft, setDraft] = useState(filters);
  const [syncedKey, setSyncedKey] = useState("");

  const filtersKey = filtersSnapshot(filters);
  if (open && syncedKey !== filtersKey) {
    setSyncedKey(filtersKey);
    setDraft(filters);
  } else if (!open && syncedKey) {
    setSyncedKey("");
  }

  useEffect(() => {
    document.body.classList.toggle("drawer-open", open);
    return () => document.body.classList.remove("drawer-open");
  }, [open]);

  function handleApply() {
    onApply(draft);
    onClose();
  }

  function handleClear() {
    onClearFilters();
    onClose();
  }

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="explore-filters-drawer-root fixed inset-0 z-[var(--z-header-overlay)] lg:hidden"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close filters"
        className="smoac-control explore-filters-drawer__backdrop absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={cn(
          "explore-filters-drawer absolute right-0 bottom-0 left-0 flex max-h-[min(88dvh,640px)] flex-col rounded-t-3xl"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Filter specialists"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/6 px-4 py-4">
          <h2 className="text-base font-medium text-white">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="smoac-control inline-flex h-11 w-11 items-center justify-center rounded-full text-silver-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="explore-filters-drawer__body">
          <FiltersPanel
            filters={draft}
            onChange={setDraft}
            compact
            hideHeader
          />
        </div>

        <div className="explore-filters-drawer__footer">
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="smoac-control explore-clear-btn min-w-[7rem]"
            >
              Clear all
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleApply}
            className="smoac-control explore-filters-drawer__apply"
          >
            Apply · {resultCount} result{resultCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
