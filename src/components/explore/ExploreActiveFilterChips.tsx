"use client";

import type { ActiveFilterChip, ActiveFilterKey } from "@/lib/explore-active-filters";
import { CloseIcon } from "@/components/ui/icons";

interface ExploreActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onRemove: (key: ActiveFilterKey) => void;
  onClearAll?: () => void;
}

export function ExploreActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
}: ExploreActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="explore-filter-chips" role="list" aria-label="Active filters">
      {chips.map((chip) => (
        <span key={`${chip.key}-${chip.label}`} className="explore-filter-chip" role="listitem">
          <span className="explore-filter-chip__label">{chip.label}</span>
          <button
            type="button"
            className="smoac-control explore-filter-chip__remove"
            onClick={() => onRemove(chip.key)}
            aria-label={`Remove ${chip.label} filter`}
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      {chips.length > 1 && onClearAll ? (
        <button
          type="button"
          className="smoac-control explore-filter-chips__clear-all"
          onClick={onClearAll}
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
