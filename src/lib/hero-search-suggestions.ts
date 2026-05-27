import { trainers } from "@/data/trainers";
import { marketplaceSpecialtyOptions } from "@/data/marketplace-specialties";
import { buildExploreSearchParams } from "@/lib/explore-url";
import { EMPTY_TRAINER_FILTERS } from "@/lib/explore";
import { getPersonalizationCity } from "@/lib/user-location-storage";

export type HeroSuggestionKind =
  | "specialist"
  | "specialty"
  | "city"
  | "neighborhood"
  | "trending";

export interface HeroSearchSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  kind: HeroSuggestionKind;
  /** Value applied to the search field / explore query */
  query: string;
  href: string;
}

const TRENDING_QUERIES = [
  "Personal trainer San Diego",
  "Physical therapy Mission Valley",
  "HYROX coaching",
  "Weight loss specialist",
  "Recovery & mobility",
] as const;

function exploreHrefForQuery(query: string): string {
  const params = buildExploreSearchParams(EMPTY_TRAINER_FILTERS, query);
  return `/explore?${params}`;
}

function buildPools(): HeroSearchSuggestion[] {
  const out: HeroSearchSuggestion[] = [];
  const seen = new Set<string>();

  function push(item: HeroSearchSuggestion) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  }

  for (const query of TRENDING_QUERIES) {
    push({
      id: `trending-${query}`,
      label: query,
      sublabel: "Trending",
      kind: "trending",
      query,
      href: exploreHrefForQuery(query),
    });
  }

  for (const trainer of trainers) {
    push({
      id: `specialist-${trainer.id}`,
      label: trainer.name,
      sublabel: `${trainer.profession} · ${trainer.city}`,
      kind: "specialist",
      query: trainer.name,
      href: `/trainers/${trainer.id}`,
    });
  }

  for (const specialty of marketplaceSpecialtyOptions) {
    const params = buildExploreSearchParams(
      { ...EMPTY_TRAINER_FILTERS, specialty },
      specialty
    );
    push({
      id: `specialty-${specialty}`,
      label: specialty,
      sublabel: "Specialty",
      kind: "specialty",
      query: specialty,
      href: `/explore?${params}`,
    });
  }

  const cities = new Set(trainers.map((t) => t.city).filter(Boolean));
  for (const city of cities) {
    const params = buildExploreSearchParams(
      { ...EMPTY_TRAINER_FILTERS, city },
      city
    );
    push({
      id: `city-${city}`,
      label: city,
      sublabel: "City",
      kind: "city",
      query: city,
      href: `/explore?${params}`,
    });
  }

  const neighborhoods = new Set<string>();
  for (const trainer of trainers) {
    if (trainer.neighborhood) neighborhoods.add(trainer.neighborhood);
    for (const n of trainer.serviceArea ?? []) neighborhoods.add(n);
  }
  for (const neighborhood of neighborhoods) {
    const params = buildExploreSearchParams(
      { ...EMPTY_TRAINER_FILTERS, neighborhood },
      neighborhood
    );
    push({
      id: `neighborhood-${neighborhood}`,
      label: neighborhood,
      sublabel: "Neighborhood",
      kind: "neighborhood",
      query: neighborhood,
      href: `/explore?${params}`,
    });
  }

  return out;
}

const POOL = buildPools();

const KIND_ORDER: Record<HeroSuggestionKind, number> = {
  trending: 0,
  specialist: 1,
  specialty: 2,
  city: 3,
  neighborhood: 4,
};

function personalizationBoost(item: HeroSearchSuggestion): number {
  const city = getPersonalizationCity();
  if (!city) return 0;
  const target = city.toLowerCase();
  const label = item.label.toLowerCase();
  const sub = (item.sublabel ?? "").toLowerCase();
  if (item.kind === "specialist" && sub.includes(target)) return 24;
  if (item.kind === "city" && label === target) return 20;
  if (item.kind === "neighborhood" && sub.includes(target)) return 12;
  return 0;
}

function scoreMatch(item: HeroSearchSuggestion, q: string): number {
  const label = item.label.toLowerCase();
  const sub = (item.sublabel ?? "").toLowerCase();
  if (label.startsWith(q)) return 100;
  if (label.includes(q)) return 80;
  if (sub.includes(q)) return 60;
  if (item.query.toLowerCase().includes(q)) return 50;
  return 0;
}

/** Ranked suggestions for the homepage hero search (empty query → trending + featured). */
export function getHeroSearchSuggestions(
  query: string,
  limit = 8
): HeroSearchSuggestion[] {
  const trimmed = query.trim();
  const q = trimmed.toLowerCase();

  if (!q) {
    const personalizationCity = getPersonalizationCity();
    return POOL.filter((item) => {
      if (item.kind === "trending" || item.kind === "specialist") return true;
      if (!personalizationCity) return false;
      return item.kind === "city" || item.kind === "neighborhood";
    })
      .sort(
        (a, b) =>
          personalizationBoost(b) - personalizationBoost(a) ||
          KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
          a.label.localeCompare(b.label)
      )
      .slice(0, limit);
  }

  return POOL.map((item) => ({
    item,
    score: scoreMatch(item, q) + personalizationBoost(item),
  }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind] ||
        a.item.label.localeCompare(b.item.label)
    )
    .slice(0, limit)
    .map((row) => row.item);
}

export function kindLabel(kind: HeroSuggestionKind): string {
  switch (kind) {
    case "specialist":
      return "Specialist";
    case "specialty":
      return "Specialty";
    case "city":
      return "City";
    case "neighborhood":
      return "Area";
    case "trending":
      return "Trending";
    default:
      return "Search";
  }
}
