import { getSearchMappingEntries, SEARCH_STOP_WORDS } from "@/data/search-query-mappings";
import type { TrainerFilters } from "@/types";

export interface ParsedSearchFilterUpdates {
  city: string;
  neighborhood: string;
  profession: string;
  specialty: string;
}

export interface ParsedSearchResult {
  /** Full query as typed — shown in search input */
  displayQuery: string;
  /** Remaining terms for text matching after structured tokens are extracted */
  residualQuery: string;
  filterUpdates: ParsedSearchFilterUpdates;
}

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildResidual(remaining: string): string {
  return remaining
    .split(" ")
    .filter((word) => word.length > 1 && !SEARCH_STOP_WORDS.has(word))
    .join(" ")
    .trim();
}

/**
 * Parse natural-language search into filter fields + optional residual text.
 * Longest phrases match first; each filter key is set at most once.
 */
export function parseSearchQuery(rawQuery: string): ParsedSearchResult {
  const displayQuery = rawQuery.trim();
  const empty: ParsedSearchResult = {
    displayQuery,
    residualQuery: displayQuery,
    filterUpdates: {
      city: "",
      neighborhood: "",
      profession: "",
      specialty: "",
    },
  };

  if (!displayQuery) return empty;

  let work = normalizeQuery(displayQuery);
  const filterUpdates: ParsedSearchFilterUpdates = {
    city: "",
    neighborhood: "",
    profession: "",
    specialty: "",
  };

  for (const entry of getSearchMappingEntries()) {
    if (!work.includes(entry.phrase)) continue;

    if (entry.kind === "city" && !filterUpdates.city && entry.city) {
      filterUpdates.city = entry.city;
      work = work.replace(entry.phrase, " ");
    } else if (
      entry.kind === "neighborhood" &&
      !filterUpdates.neighborhood &&
      entry.neighborhood
    ) {
      filterUpdates.neighborhood = entry.neighborhood;
      if (entry.city) filterUpdates.city = entry.city;
      work = work.replace(entry.phrase, " ");
    } else if (
      entry.kind === "profession" &&
      !filterUpdates.profession &&
      entry.profession
    ) {
      filterUpdates.profession = entry.profession;
      work = work.replace(entry.phrase, " ");
    } else if (
      entry.kind === "specialty" &&
      !filterUpdates.specialty &&
      entry.specialty
    ) {
      filterUpdates.specialty = entry.specialty;
      work = work.replace(entry.phrase, " ");
    }
  }

  work = work.replace(/\s+/g, " ").trim();

  return {
    displayQuery,
    residualQuery: buildResidual(work),
    filterUpdates,
  };
}

/** Apply parsed tokens; preserves gender/price and non-search sidebar choices */
export function mergeParsedIntoFilters(
  base: TrainerFilters,
  parsed: ParsedSearchFilterUpdates
): TrainerFilters {
  const hasLocationParse = Boolean(parsed.city || parsed.neighborhood);
  return {
    ...base,
    zipCode: hasLocationParse ? "" : base.zipCode,
    city: parsed.city,
    neighborhood: parsed.city ? parsed.neighborhood : "",
    profession: parsed.profession,
    specialty: parsed.specialty,
  };
}

export function applySearchQueryToExploreState(
  rawQuery: string,
  baseFilters: TrainerFilters
): {
  displayQuery: string;
  residualQuery: string;
  filters: TrainerFilters;
} {
  const parsed = parseSearchQuery(rawQuery);
  return {
    displayQuery: parsed.displayQuery,
    residualQuery: parsed.residualQuery,
    filters: mergeParsedIntoFilters(baseFilters, parsed.filterUpdates),
  };
}
