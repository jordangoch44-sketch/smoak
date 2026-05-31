"use client";

import { useSyncExternalStore } from "react";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import {
  getActiveUserCoordinatesKeyServerSnapshot,
  getActiveUserCoordinatesKeySnapshot,
  getActiveUserCoordinatesServerSnapshot,
  getActiveUserCoordinatesSnapshot,
  subscribeUserLocation,
} from "@/lib/user-location-store";

export function useActiveUserCoordinates(): UserGeoPoint | null {
  return useSyncExternalStore(
    subscribeUserLocation,
    getActiveUserCoordinatesSnapshot,
    getActiveUserCoordinatesServerSnapshot
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
