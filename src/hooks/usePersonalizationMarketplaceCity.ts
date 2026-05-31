"use client";

import { useSyncExternalStore } from "react";
import {
  getPersonalizationMarketplaceCityServerSnapshot,
  getPersonalizationMarketplaceCitySnapshot,
  subscribeUserLocation,
} from "@/lib/user-location-store";

/** Nearest configured marketplace metro — for rankings slug / explore city filter */
export function usePersonalizationMarketplaceCity(): string | null {
  return useSyncExternalStore(
    subscribeUserLocation,
    getPersonalizationMarketplaceCitySnapshot,
    getPersonalizationMarketplaceCityServerSnapshot
  );
}
