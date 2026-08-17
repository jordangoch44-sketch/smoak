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

/** Filter keys that are driven by / mirrored in the search bar */
const SEARCH_BAR_FILTER_KEYS: ActiveFilterKey[] = [
  "zipCode",
  "city",
  "neighborhood",
  "profession",
  "specialty",
  "gender",
  "priceMin",
  "priceMax",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Label shown on a chip for one filter key (mirrors getActiveFilterChips) */
export function getFilterChipLabel(
  filters: TrainerFilters,
  key: ActiveFilterKey
): string {
  if (key === "zipCode") {
    if (!filters.zipCode) return "";
    if (filters.neighborhood) {
      return `${filters.neighborhood} · ${filters.zipCode}`;
    }
    if (filters.city) {
      return `${filters.city} · ${filters.zipCode}`;
    }
    return filters.zipCode;
  }
  if (key === "city") return filters.city;
  if (key === "neighborhood") return filters.neighborhood;
  if (key === "profession") return filters.profession;
  if (key === "specialty") return filters.specialty;
  if (key === "serviceType") {
    if (filters.serviceType === "in-person") return "In-Person";
    if (filters.serviceType === "virtual") return "Online";
    return "";
  }
  if (key === "gender") {
    if (!filters.gender) return "";
    return filters.gender.charAt(0).toUpperCase() + filters.gender.slice(1);
  }
  if (key === "priceMin" || key === "priceMax") {
    if (!filters.priceMin && !filters.priceMax) return "";
    const min = parseExplorePriceBound(
      filters.priceMin,
      EXPLORE_PRICE_RANGE.min
    );
    const max = parseExplorePriceBound(
      filters.priceMax,
      EXPLORE_PRICE_RANGE.max
    );
    return formatExplorePriceRangeLabel(min, max);
  }
  return "";
}

/** Derive removable chips from centralized filter state */
export function getActiveFilterChips(filters: TrainerFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  /* Location lives in the header pill — not as Explore search chips. */
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
    chips.push({
      key: "gender",
      label: getFilterChipLabel(filters, "gender"),
    });
  }
  if (filters.priceMin || filters.priceMax) {
    chips.push({
      key: "priceMax",
      label: getFilterChipLabel(filters, "priceMax"),
    });
  }

  return chips;
}

function foldSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove a chip label phrase from the search bar text */
export function stripChipLabelFromDisplayQuery(
  displayQuery: string,
  label: string
): string {
  const trimmed = label.trim();
  if (!trimmed || !displayQuery.trim()) return displayQuery.trim();

  /* Prefer exact (accented) strip first */
  let remaining = displayQuery
    .replace(new RegExp(escapeRegExp(trimmed), "ig"), " ")
    .replace(/\s+/g, " ")
    .trim();

  const foldedLabel = foldSearchText(trimmed);
  if (!foldedLabel) return remaining;

  /* Also strip diacritic-folded forms (e.g. Penasquitos vs Peñasquitos) */
  remaining = foldSearchText(remaining)
    .replace(new RegExp(escapeRegExp(foldedLabel), "ig"), " ")
    .replace(/\s+/g, " ")
    .trim();

  return remaining;
}

/**
 * Search bar text that matches the clearable search chips (+ residual free text).
 * Profession, specialty, place, gender, and price.
 */
export function buildDisplayQueryFromSearchFilters(
  filters: TrainerFilters,
  residualQuery = ""
): string {
  const parts: string[] = [];
  const genderLabel = getFilterChipLabel(filters, "gender");
  const priceLabel = getFilterChipLabel(filters, "priceMax");
  if (genderLabel) parts.push(genderLabel);
  if (filters.profession.trim()) parts.push(filters.profession.trim());
  if (filters.specialty.trim()) parts.push(filters.specialty.trim());
  const place = filters.neighborhood.trim() || filters.city.trim();
  if (place) parts.push(`in ${place}`);
  if (priceLabel) parts.push(priceLabel);

  let residual = residualQuery.trim();
  if (genderLabel) {
    residual = stripChipLabelFromDisplayQuery(residual, genderLabel);
    residual = stripChipLabelFromDisplayQuery(residual, filters.gender);
  }
  if (filters.profession.trim()) {
    residual = stripChipLabelFromDisplayQuery(residual, filters.profession);
  }
  if (filters.specialty.trim()) {
    residual = stripChipLabelFromDisplayQuery(residual, filters.specialty);
  }
  if (place) {
    residual = stripChipLabelFromDisplayQuery(residual, place);
    residual = stripChipLabelFromDisplayQuery(residual, `in ${place}`);
  }
  if (priceLabel) {
    residual = stripChipLabelFromDisplayQuery(residual, priceLabel);
  }
  if (residual) parts.push(residual);
  return parts.join(" ").trim();
}

/** Free-text leftover after stripping current search-filter chip labels */
export function residualDisplayQueryAfterSearchFilters(
  displayQuery: string,
  filters: TrainerFilters
): string {
  let remaining = displayQuery.trim();
  for (const key of SEARCH_BAR_FILTER_KEYS) {
    const label = getFilterChipLabel(filters, key);
    if (!label) continue;
    /* Zip chips use "Place · 92126" — also strip bare zip / place parts */
    remaining = stripChipLabelFromDisplayQuery(remaining, label);
    if (key === "zipCode") {
      if (filters.zipCode) {
        remaining = stripChipLabelFromDisplayQuery(remaining, filters.zipCode);
      }
      if (filters.neighborhood) {
        remaining = stripChipLabelFromDisplayQuery(
          remaining,
          filters.neighborhood
        );
      }
      if (filters.city) {
        remaining = stripChipLabelFromDisplayQuery(remaining, filters.city);
      }
    }
  }
  return remaining;
}

/**
 * Strip personalization place labels (header ZIP / neighborhood) from a query.
 * Used so location alone never becomes a text filter in Explore.
 */
export function stripLocationLabelsFromQuery(
  query: string,
  location: Pick<TrainerFilters, "zipCode" | "city" | "neighborhood">
): string {
  return residualDisplayQueryAfterSearchFilters(query, {
    zipCode: location.zipCode,
    city: location.city,
    neighborhood: location.neighborhood,
    profession: "",
    specialty: "",
    gender: "",
    priceMin: "",
    priceMax: "",
    serviceType: "",
  });
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

export function isSearchBarFilterKey(key: ActiveFilterKey): boolean {
  return SEARCH_BAR_FILTER_KEYS.includes(key);
}
