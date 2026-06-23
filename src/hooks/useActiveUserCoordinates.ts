"use client";

import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import { getEffectiveUserCoordinates } from "@/lib/client-profile-location";
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

  return useMemo(
    () => getEffectiveUserCoordinates(session) ?? storageCoords,
    [session, storageCoords]
  );
}

/** Stable string dependency for proximity useMemo (avoids object identity churn) */
export function useActiveUserCoordinatesKey(): string | null {
  return useSyncExternalStore(
    subscribeUserLocation,
    getActiveUserCoordinatesKeySnapshot,
    getActiveUserCoordinatesKeyServerSnapshot
  );
}
