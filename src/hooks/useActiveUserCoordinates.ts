"use client";

import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import { getProfileZipFromSession } from "@/lib/client-profile-location";
import {
  lookupLocalZipCoordinates,
  zipCodeToCoordinates,
} from "@/lib/geo/zip-centroids";
import { useAuthSession } from "@/hooks/useAuthSession";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import {
  getActiveUserCoordinatesKeyServerSnapshot,
  getActiveUserCoordinatesKeySnapshot,
  getActiveUserCoordinatesServerSnapshot,
  getActiveUserCoordinatesSnapshot,
  subscribeUserLocation,
} from "@/lib/user-location-store";

export function useActiveUserCoordinates(): UserGeoPoint | null {
  const { session } = useAuthSession();
  const storageCoords = useSyncExternalStore(
    subscribeUserLocation,
    getActiveUserCoordinatesSnapshot,
    getActiveUserCoordinatesServerSnapshot
  );

  /* Profile ZIP coords from session snapshot + storage coords from the
   * location store only. Do not call getActiveUserCoordinates() here — that
   * reads localStorage during render and hydrates distance labels the SSR
   * tree did not include (dev-trainer-distance). */
  return useMemo(() => {
    const profileZip = getProfileZipFromSession(session);
    if (profileZip) {
      const coords =
        lookupLocalZipCoordinates(profileZip) ??
        zipCodeToCoordinates(profileZip);
      if (coords) return coords;
    }
    return storageCoords;
  }, [session, storageCoords]);
}

/** Stable string dependency for proximity useMemo (avoids object identity churn) */
export function useActiveUserCoordinatesKey(): string | null {
  return useSyncExternalStore(
    subscribeUserLocation,
    getActiveUserCoordinatesKeySnapshot,
    getActiveUserCoordinatesKeyServerSnapshot
  );
}
