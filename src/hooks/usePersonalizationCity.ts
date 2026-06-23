"use client";

import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import { getEffectiveClientZip } from "@/lib/client-profile-location";
import { getZipPlaceDisplayName } from "@/lib/user-location-storage";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  getPersonalizationCityServerSnapshot,
  getPersonalizationCitySnapshot,
  subscribeUserLocation,
} from "@/lib/user-location-store";

export function usePersonalizationCity(): string | null {
  const { session } = useAuthSession();
  const storageCity = useSyncExternalStore(
    subscribeUserLocation,
    getPersonalizationCitySnapshot,
    getPersonalizationCityServerSnapshot
  );

  return useMemo(() => {
    const zip = getEffectiveClientZip(session);
    if (zip) return getZipPlaceDisplayName(zip);
    return storageCity;
  }, [session, storageCity]);
}
