/**
 * Apple MapKit JS helpers for Explore.
 * Token: Apple Developer → Maps → MapKit JS → Create a Maps Token
 * (static domain-bound token). Set NEXT_PUBLIC_APPLE_MAPS_TOKEN.
 */

import { load, type MapKit } from "@apple/mapkit-loader";

export type AppleMapKit = MapKit;

let mapkitPromise: Promise<AppleMapKit> | null = null;

export function getAppleMapsToken(): string | undefined {
  const token =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_APPLE_MAPS_TOKEN?.trim()
      : undefined;
  return token || undefined;
}

export function isAppleMapsConfigured(): boolean {
  return Boolean(getAppleMapsToken());
}

/** Load MapKit once per page (map + annotations). */
export function loadAppleMapKit(): Promise<AppleMapKit> {
  const token = getAppleMapsToken();
  if (!token) {
    return Promise.reject(new Error("NEXT_PUBLIC_APPLE_MAPS_TOKEN is not set"));
  }
  if (!mapkitPromise) {
    mapkitPromise = load({
      token,
      language: "en-US",
      libraries: ["map", "annotations"],
    }).catch((error) => {
      mapkitPromise = null;
      throw error;
    });
  }
  return mapkitPromise;
}

export function regionForRadiusMiles(
  mapkit: AppleMapKit,
  center: { latitude: number; longitude: number },
  radiusMiles: number
) {
  const latDelta = Math.max(0.02, (radiusMiles * 2) / 69);
  const cos = Math.max(0.2, Math.cos((center.latitude * Math.PI) / 180));
  const lngDelta = latDelta / cos;
  return new mapkit.CoordinateRegion(
    new mapkit.Coordinate(center.latitude, center.longitude),
    new mapkit.CoordinateSpan(latDelta, lngDelta)
  );
}
