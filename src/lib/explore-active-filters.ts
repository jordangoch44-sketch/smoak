import { priceRanges } from "@/data/trainers";
import type { TrainerFilters } from "@/types";

export type ActiveFilterKey = keyof TrainerFilters;

export interface ActiveFilterChip {
  key: ActiveFilterKey;
  label: string;
}

/** Derive removable chips from centralized filter state */
export function getActiveFilterChips(filters: TrainerFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.zipCode) {
    const zipLabel = filters.neighborhood
      ? `${filters.neighborhood} · ${filters.zipCode}`
      : filters.city
        ? `${filters.city} · ${filters.zipCode}`
        : filters.zipCode;
    chips.push({ key: "zipCode", label: zipLabel });
  } else {
    if (filters.city) {
      chips.push({ key: "city", label: filters.city });
    }
    if (filters.neighborhood) {
      chips.push({ key: "neighborhood", label: filters.neighborhood });
    }
  }
  if (filters.profession) {
    chips.push({
      key: "profession",
      label: filters.profession,
    });
  }
  if (filters.specialty) {
    chips.push({ key: "specialty", label: filters.specialty });
  }
  if (filters.gender) {
    const label =
      filters.gender.charAt(0).toUpperCase() + filters.gender.slice(1);
    chips.push({ key: "gender", label });
  }
  if (filters.priceMax) {
    const range = priceRanges.find((r) => r.value === filters.priceMax);
    chips.push({
      key: "priceMax",
      label: range?.label ?? `Under $${filters.priceMax}`,
    });
  }

  return chips;
}

/** Remove one filter; clearing city also clears neighborhood */
export function removeFilterFromState(
  filters: TrainerFilters,
  key: ActiveFilterKey
): TrainerFilters {
  if (key === "zipCode" || key === "city") {
    return {
      ...filters,
      zipCode: "",
      city: "",
      neighborhood: "",
    };
  }
  return { ...filters, [key]: "" };
}
