import { haversineMiles } from "@/lib/geo/haversine";
import { DEFAULT_EXPLORE_RADIUS_MILES } from "@/lib/explore";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";

/** Map / radius search frame used for Explore pins + list. */
export type ExploreSearchArea = {
  latitude: number;
  longitude: number;
  radiusMiles: number;
};

/** Quick radius control on the Search map */
export const EXPLORE_MAP_RADIUS_PRESETS_MILES = [5, 12, 25] as const;

export function defaultExploreSearchArea(
  origin: UserGeoPoint | null
): ExploreSearchArea | null {
  if (!origin) return null;
  return {
    latitude: origin.latitude,
    longitude: origin.longitude,
    radiusMiles: DEFAULT_EXPLORE_RADIUS_MILES,
  };
}

/** Approximate visible radius from map center → north-east corner. */
export function searchAreaFromMapViewport(
  centerLat: number,
  centerLng: number,
  northEastLat: number,
  northEastLng: number
): ExploreSearchArea {
  const radiusMiles = haversineMiles(
    centerLat,
    centerLng,
    northEastLat,
    northEastLng
  );
  return {
    latitude: centerLat,
    longitude: centerLng,
    radiusMiles: Math.max(1, Math.min(100, radiusMiles)),
  };
}

export function exploreSearchAreasDiffer(
  a: ExploreSearchArea,
  b: ExploreSearchArea
): boolean {
  const centerShift = haversineMiles(
    a.latitude,
    a.longitude,
    b.latitude,
    b.longitude
  );
  const radiusDelta = Math.abs(a.radiusMiles - b.radiusMiles);
  const radiusTolerance = Math.max(0.85, a.radiusMiles * 0.12);
  return centerShift > 0.4 || radiusDelta > radiusTolerance;
}
