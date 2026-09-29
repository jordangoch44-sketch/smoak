import {
  CITY_NEIGHBORHOODS,
  MARKETPLACE_CITIES,
  type MarketplaceCity,
} from "@/data/locations";
import { formatProviderLocation } from "@/lib/provider-location";
import { toRankingMetroCity } from "@/lib/ranking-metro";
import { cityToSlug } from "@/lib/seo/marketplace-slugs";
import type { Trainer } from "@/types/trainer";

const PLACE_MAX = 48;

function fold(value: string): string {
  return value.trim().toLowerCase();
}

function knownPlaceNames(): string[] {
  const names: string[] = [...MARKETPLACE_CITIES];
  for (const city of MARKETPLACE_CITIES) {
    names.push(...CITY_NEIGHBORHOODS[city]);
  }
  return names;
}

const KNOWN_PLACES = knownPlaceNames();
const KNOWN_BY_FOLD = new Map(KNOWN_PLACES.map((name) => [fold(name), name]));

/** Neighborhood label → marketplace city, e.g. Bay Park → San Diego. */
export function parentMarketplaceCityForPlace(
  placeName: string
): MarketplaceCity | null {
  const key = fold(placeName);
  if (!key) return null;
  for (const city of MARKETPLACE_CITIES) {
    if (CITY_NEIGHBORHOODS[city].some((neighborhood) => fold(neighborhood) === key)) {
      return city;
    }
  }
  return null;
}

function canonicalPlaceName(raw: string): string | null {
  const value = raw.replace(/\s+/g, " ").trim();
  if (value.length < 2 || value.length > PLACE_MAX) return null;
  if (/[.!?]/.test(value) || value.includes(",")) return null;
  return KNOWN_BY_FOLD.get(fold(value)) ?? value;
}

function mentionsPlace(blob: string, place: string): boolean {
  const escaped = place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(blob);
}

/**
 * Places a specialist published on their profile: city, neighborhood,
 * service area, and the metro those roll up to. Order is specific first.
 */
export function publishedSearchPlaces(trainer: Trainer): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | null | undefined) => {
    const name = raw ? canonicalPlaceName(raw) : null;
    if (!name) return;
    const key = fold(name);
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(name);
    const parent = parentMarketplaceCityForPlace(name);
    if (parent) add(parent);
    const metro = toRankingMetroCity(name);
    if (metro) add(metro);
  };

  add(trainer.city);
  add(trainer.neighborhood);
  add(trainer.city2);
  add(trainer.neighborhood2);
  for (const area of trainer.serviceArea ?? []) add(area);

  const blob = [
    trainer.city,
    trainer.neighborhood,
    trainer.city2,
    trainer.neighborhood2,
    trainer.state,
    ...(trainer.serviceArea ?? []),
    trainer.serviceAreaDescription,
    trainer.workAddress,
    trainer.workAddress2,
    trainer.location,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" \n ");

  for (const known of KNOWN_PLACES) {
    if (mentionsPlace(blob, known)) add(known);
  }

  return ordered;
}

export function primarySearchPlaces(trainer: Trainer, limit = 6): string[] {
  return publishedSearchPlaces(trainer).slice(0, limit);
}

/** True when this profile should appear for a Google-style “in {place}” query. */
export function trainerServesSearchPlace(
  trainer: Trainer,
  placeName: string
): boolean {
  const target = fold(canonicalPlaceName(placeName) ?? placeName);
  if (!target) return false;
  return publishedSearchPlaces(trainer).some((place) => fold(place) === target);
}

/**
 * Visible location line with the containing city when the specialist
 * entered a neighborhood or suburb (Bay Park → Bay Park, San Diego).
 */
export function formatIndexableProviderLocation(trainer: Trainer): string {
  const base = formatProviderLocation(trainer);
  const city = trainer.city?.trim() ?? "";
  const neighborhood = trainer.neighborhood?.trim() ?? "";
  const metro =
    toRankingMetroCity(city) ||
    toRankingMetroCity(neighborhood) ||
    parentMarketplaceCityForPlace(city) ||
    parentMarketplaceCityForPlace(neighborhood);
  if (!metro) return base;

  const haystack = `${base} ${city} ${neighborhood}`.toLowerCase();
  if (haystack.includes(metro.toLowerCase())) return base;
  if (!base) return metro;

  const zip = trainer.zipCode?.trim() ?? "";
  if (zip && base.endsWith(zip)) {
    const withoutZip = base
      .slice(0, base.length - zip.length)
      .replace(/[\s·,]+$/g, "");
    return withoutZip ? `${withoutZip}, ${metro} · ${zip}` : `${metro} · ${zip}`;
  }

  return `${base}, ${metro}`;
}

export function indexableLocality(trainer: Trainer): string {
  const city = trainer.city?.trim() ?? "";
  const neighborhood = trainer.neighborhood?.trim() ?? "";
  const fromCity = city ? toRankingMetroCity(city) : null;
  if (fromCity && fold(fromCity) !== fold(city)) return fromCity;
  const parent =
    parentMarketplaceCityForPlace(city) ||
    parentMarketplaceCityForPlace(neighborhood);
  if (parent && fold(parent) !== fold(city)) return parent;
  return city || neighborhood || publishedSearchPlaces(trainer)[0] || "";
}

/** Display name for a /find/[slug] path, from known places or live profiles. */
export function resolveSearchPlaceName(
  slug: string,
  trainers: readonly Trainer[]
): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  for (const known of KNOWN_PLACES) {
    if (cityToSlug(known) === normalized) return known;
  }

  for (const trainer of trainers) {
    for (const place of publishedSearchPlaces(trainer)) {
      if (cityToSlug(place) === normalized) return place;
    }
  }

  return null;
}
