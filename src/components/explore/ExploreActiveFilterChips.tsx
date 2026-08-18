"use client";

import { useRef } from "react";
import type { ActiveFilterChip, ActiveFilterKey } from "@/lib/explore-active-filters";
import { CloseIcon } from "@/components/ui/icons";

interface ExploreActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onRemove: (key: ActiveFilterKey) => void;
  onClearAll?: () => void;
}

/** Ignore click after a horizontal scroll on the chip row. */
const TAP_SLOP_PX = 12;

export function ExploreActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
}: ExploreActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className="explore-filter-chips"
      role="toolbar"
      aria-label="Active filters"
    >
      {chips.map((chip) => (
        <FilterChip
          key={`${chip.key}-${chip.label}`}
          chip={chip}
          onRemove={onRemove}
        />
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

function FilterChip({
  chip,
  onRemove,
}: {
  chip: ActiveFilterChip;
  onRemove: (key: ActiveFilterKey) => void;
}) {
  const originRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <button
      type="button"
      className="smoac-control explore-filter-chip"
      aria-label={`Remove ${chip.label} filter`}
      onPointerDown={(event) => {
        event.stopPropagation();
        originRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerCancel={() => {
        originRef.current = null;
      }}
      onClick={(event) => {
        event.stopPropagation();
        const origin = originRef.current;
        originRef.current = null;
        if (
          origin &&
          Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >
            TAP_SLOP_PX
        ) {
          return;
        }
        onRemove(chip.key);
      }}
    >
      <span className="explore-filter-chip__label">{chip.label}</span>
      <span className="explore-filter-chip__remove" aria-hidden>
        <CloseIcon className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
