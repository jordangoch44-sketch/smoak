"use client";

import { useSyncExternalStore } from "react";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { getIpPersonalizationCity } from "@/lib/geo/ip-location-hint";
import { subscribeUserLocation } from "@/lib/user-location-store";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";

function ipCitySnapshot(): string | null {
  return getIpPersonalizationCity();
}

function ipCityServerSnapshot(): string | null {
  return null;
}

/** Homepage rails: ZIP / GPS first, then coarse IP city label. */
export function useMarketplacePersonalizationCity(): string | null {
  const explicit = usePersonalizationCity();
  const ipCity = useSyncExternalStore(
    subscribeUserLocation,
    ipCitySnapshot,
    ipCityServerSnapshot
  );
  return explicit ?? ipCity;
}

/** ZIP / GPS first, then cached IP coords (stable identity for React). */
export function useMarketplaceUserCoordinates(): UserGeoPoint | null {
  return useActiveUserCoordinates();
}

export function useMarketplaceUserCoordinatesKey(): string | null {
  return useActiveUserCoordinatesKey();
}
