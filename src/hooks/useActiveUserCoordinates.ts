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

  /* Storage coords (header / gate ZIP or GPS) win over stale profile ZIP —
   * completeZipEntry writes localStorage immediately on “Update location”. */
  return useMemo(() => {
    if (storageCoords) return storageCoords;
    const profileZip = getProfileZipFromSession(session);
    if (profileZip) {
      const coords =
        lookupLocalZipCoordinates(profileZip) ??
        zipCodeToCoordinates(profileZip);
      if (coords) return coords;
    }
    return null;
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
