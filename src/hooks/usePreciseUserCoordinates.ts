"use client";

import { useSyncExternalStore } from "react";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import {
  getPreciseUserCoordinatesKeyServerSnapshot,
  getPreciseUserCoordinatesKeySnapshot,
  getPreciseUserCoordinatesServerSnapshot,
  getPreciseUserCoordinatesSnapshot,
  subscribeUserLocation,
} from "@/lib/user-location-store";

/** Device GPS only — null when the user only has ZIP / city (no purple map dot). */
export function usePreciseUserCoordinates(): UserGeoPoint | null {
  return useSyncExternalStore(
    subscribeUserLocation,
    getPreciseUserCoordinatesSnapshot,
    getPreciseUserCoordinatesServerSnapshot
  );
}

export function usePreciseUserCoordinatesKey(): string | null {
  return useSyncExternalStore(
    subscribeUserLocation,
    getPreciseUserCoordinatesKeySnapshot,
    getPreciseUserCoordinatesKeyServerSnapshot
  );
}
