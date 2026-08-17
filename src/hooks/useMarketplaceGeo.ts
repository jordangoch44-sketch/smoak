"use client";

import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import {
  getIpPersonalizationCity,
  getIpUserCoordinates,
} from "@/lib/geo/ip-location-hint";
import { subscribeUserLocation } from "@/lib/user-location-store";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";

function ipCitySnapshot(): string | null {
  return getIpPersonalizationCity();
}

function ipCityServerSnapshot(): string | null {
  return null;
}

function ipCoordsSnapshot(): UserGeoPoint | null {
  return getIpUserCoordinates();
}

function ipCoordsServerSnapshot(): UserGeoPoint | null {
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

export function useMarketplaceUserCoordinates(): UserGeoPoint | null {
  const explicit = useActiveUserCoordinates();
  const ipCoords = useSyncExternalStore(
    subscribeUserLocation,
    ipCoordsSnapshot,
    ipCoordsServerSnapshot
  );
  return explicit ?? ipCoords;
}

export function useMarketplaceUserCoordinatesKey(): string | null {
  const explicitKey = useActiveUserCoordinatesKey();
  const ipCoords = useMarketplaceUserCoordinates();
  return useMemo(() => {
    if (explicitKey) return explicitKey;
    if (!ipCoords) return null;
    return `ip:${ipCoords.latitude.toFixed(4)},${ipCoords.longitude.toFixed(4)}`;
  }, [explicitKey, ipCoords]);
}
