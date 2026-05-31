import type { TrainerFilters } from "@/types";

const FILTER_KEYS = [
  "zipCode",
  "city",
  "neighborhood",
  "profession",
  "specialty",
  "gender",
  "priceMax",
] as const;

export function filtersFromSearchParams(
  params: URLSearchParams
): TrainerFilters {
  const legacyLocation = params.get("location") ?? "";
  return {
    zipCode: params.get("zipCode") ?? params.get("zip") ?? "",
    city: params.get("city") ?? legacyLocation,
    neighborhood: params.get("neighborhood") ?? "",
    profession: params.get("profession") ?? "",
    specialty: params.get("specialty") ?? "",
    gender: params.get("gender") ?? "",
    priceMax: params.get("priceMax") ?? "",
  };
}

/** @param displayQuery Full typed query stored in URL `q` param */
export function buildExploreSearchParams(
  filters: TrainerFilters,
  displayQuery: string
): string {
  const params = new URLSearchParams();
  const q = displayQuery.trim();
  if (q) params.set("q", q);
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params.toString();
}

function searchParamsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const left = new URLSearchParams(a);
  const right = new URLSearchParams(b);
  const keys = new Set([...left.keys(), ...right.keys()]);
  for (const key of keys) {
    if (left.get(key) !== right.get(key)) return false;
  }
  return true;
}

export function exploreParamsEqual(
  current: string,
  filters: TrainerFilters,
  displayQuery: string
): boolean {
  return searchParamsMatch(
    current,
    buildExploreSearchParams(filters, displayQuery)
  );
}

const FILTER_PARAM_KEYS = [
  "zipCode",
  "zip",
  "city",
  "neighborhood",
  "profession",
  "specialty",
  "gender",
  "priceMax",
] as const;

/** True when URL carries explicit filter params (not only free-text q) */
export function hasExplicitFilterParams(params: URLSearchParams): boolean {
  return FILTER_PARAM_KEYS.some((key) => Boolean(params.get(key)));
}
