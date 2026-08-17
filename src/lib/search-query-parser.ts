import { getSearchMappingEntries, SEARCH_STOP_WORDS } from "@/data/search-query-mappings";
import { clampExplorePrice } from "@/lib/explore-price-range";
import type { TrainerFilters } from "@/types";

export interface ParsedSearchFilterUpdates {
  city: string;
  neighborhood: string;
  profession: string;
  specialty: string;
  gender: string;
  priceMin: string;
  priceMax: string;
}

export interface ParsedSearchResult {
  /** Full query as typed — shown in search input */
  displayQuery: string;
  /** Remaining terms for text matching after structured tokens are extracted */
  residualQuery: string;
  filterUpdates: ParsedSearchFilterUpdates;
}

const EMPTY_FILTER_UPDATES: ParsedSearchFilterUpdates = {
  city: "",
  neighborhood: "",
  profession: "",
  specialty: "",
  gender: "",
  priceMin: "",
  priceMax: "",
};

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

function priceToken(value: number): string {
  return String(clampExplorePrice(value));
}

/**
 * Pull session-price phrases out of the normalized query.
 * `$` is already stripped by normalizeQuery, so we match bare amounts.
 */
function extractPriceFilters(work: string): {
  work: string;
  priceMin: string;
  priceMax: string;
} {
  let next = work;
  let priceMin = "";
  let priceMax = "";

  const take = (match: RegExpMatchArray, min: string, max: string) => {
    if (min) priceMin = min;
    if (max) priceMax = max;
    next = `${next.slice(0, match.index ?? 0)} ${next.slice(
      (match.index ?? 0) + match[0].length
    )}`;
  };

  const between = next.match(
    /\bbetween\s+(\d{2,3})\s+and\s+(\d{2,3})\b/
  );
  if (between) {
    const a = Number(between[1]);
    const b = Number(between[2]);
    take(between, priceToken(Math.min(a, b)), priceToken(Math.max(a, b)));
  }

  if (!priceMin && !priceMax) {
    const range = next.match(/\b(\d{2,3})\s+to\s+(\d{2,3})\b/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      take(range, priceToken(Math.min(a, b)), priceToken(Math.max(a, b)));
    }
  }

  if (!priceMin && !priceMax) {
    const fromTo = next.match(/\bfrom\s+(\d{2,3})\s+to\s+(\d{2,3})\b/);
    if (fromTo) {
      const a = Number(fromTo[1]);
      const b = Number(fromTo[2]);
      take(fromTo, priceToken(Math.min(a, b)), priceToken(Math.max(a, b)));
    }
  }

  if (!priceMax) {
    const under = next.match(
      /\b(?:under|below|less than|up to|max|at most|cheaper than)\s+(\d{2,3})\b/
    );
    if (under) take(under, "", priceToken(Number(under[1])));
  }

  if (!priceMin) {
    const over = next.match(
      /\b(?:over|above|more than|at least|min(?:imum)?)\s+(\d{2,3})\b/
    );
    if (over) take(over, priceToken(Number(over[1])), "");
  }

  /* Trailing “100 dollars / 100 bucks” after an earlier cue already handled */
  next = next
    .replace(/\b(\d{2,3})\s*(?:dollars?|bucks)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { work: next, priceMin, priceMax };
}

/** Gender words — run after specialty phrases so “women's health” is not stolen. */
function extractGenderFilter(work: string): { work: string; gender: string } {
  const nonBinary = work.match(/\bnon[\s-]?binary\b/);
  if (nonBinary) {
    return {
      gender: "non-binary",
      work: work
        .replace(nonBinary[0], " ")
        .replace(/\s+/g, " ")
        .trim(),
    };
  }

  const female = work.match(/\b(?:female|woman|women)\b/);
  if (female) {
    return {
      gender: "female",
      work: work
        .replace(female[0], " ")
        .replace(/\s+/g, " ")
        .trim(),
    };
  }

  const male = work.match(/\b(?:male|man|men)\b/);
  if (male) {
    return {
      gender: "male",
      work: work
        .replace(male[0], " ")
        .replace(/\s+/g, " ")
        .trim(),
    };
  }

  return { work, gender: "" };
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
    filterUpdates: { ...EMPTY_FILTER_UPDATES },
  };

  if (!displayQuery) return empty;

  let work = normalizeQuery(displayQuery);
  const filterUpdates: ParsedSearchFilterUpdates = {
    ...EMPTY_FILTER_UPDATES,
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

  const priced = extractPriceFilters(work);
  work = priced.work;
  filterUpdates.priceMin = priced.priceMin;
  filterUpdates.priceMax = priced.priceMax;

  const gendered = extractGenderFilter(work);
  work = gendered.work;
  filterUpdates.gender = gendered.gender;

  return {
    displayQuery,
    residualQuery: buildResidual(work),
    filterUpdates,
  };
}

/** Apply parsed tokens onto Explore filter state */
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
    gender: parsed.gender,
    priceMin: parsed.priceMin,
    priceMax: parsed.priceMax,
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
