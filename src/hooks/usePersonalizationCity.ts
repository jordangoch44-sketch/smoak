"use client";

import { useSyncExternalStore } from "react";
import {
  getPersonalizationCityServerSnapshot,
  getPersonalizationCitySnapshot,
  subscribeUserLocation,
} from "@/lib/user-location-store";

export function usePersonalizationCity(): string | null {
  return useSyncExternalStore(
    subscribeUserLocation,
    getPersonalizationCitySnapshot,
    getPersonalizationCityServerSnapshot
  );
}
