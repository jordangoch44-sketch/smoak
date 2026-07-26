import {
  EXPLORE_PRICE_RANGE,
  formatExplorePriceRangeLabel,
  parseExplorePriceBound,
} from "@/lib/explore-price-range";
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
  if (filters.serviceType === "in-person") {
    chips.push({ key: "serviceType", label: "In-Person" });
  } else if (filters.serviceType === "virtual") {
    chips.push({ key: "serviceType", label: "Online" });
  }
  if (filters.gender) {
    const label =
      filters.gender.charAt(0).toUpperCase() + filters.gender.slice(1);
    chips.push({ key: "gender", label });
  }
  if (filters.priceMin || filters.priceMax) {
    const min = parseExplorePriceBound(
      filters.priceMin,
      EXPLORE_PRICE_RANGE.min
    );
    const max = parseExplorePriceBound(
      filters.priceMax,
      EXPLORE_PRICE_RANGE.max
    );
    chips.push({
      key: "priceMax",
      label: formatExplorePriceRangeLabel(min, max),
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
  if (key === "priceMin" || key === "priceMax") {
    return { ...filters, priceMin: "", priceMax: "" };
  }
  return { ...filters, [key]: "" };
}
