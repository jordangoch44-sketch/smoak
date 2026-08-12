"use client";

import { useSyncExternalStore } from "react";
import { useMemo } from "react";
import { getProfileZipFromSession } from "@/lib/client-profile-location";
import { UNKNOWN_ZIP_AREA_LABEL } from "@/lib/geo/zip-place-names";
import {
  getPersonalizationCitySnapshot,
  getPersonalizationCityServerSnapshot,
  getUserZipSnapshot,
  getUserZipServerSnapshot,
  subscribeUserLocation,
} from "@/lib/user-location-store";
import { getZipPlaceDisplayName } from "@/lib/user-location-storage";
import { useUserLocationEditor } from "@/contexts/UserLocationContext";
import { useAuthSession } from "@/hooks/useAuthSession";

function buildDisplayLabel(
  zip: string | null,
  placeName: string | null
): { label: string; isPlaceholder: boolean; isUnknownArea: boolean } {
  if (!zip) {
    return {
      label: "Enter ZIP",
      isPlaceholder: true,
      isUnknownArea: false,
    };
  }
  if (zip && placeName) {
    return {
      label: `${placeName} · ${zip}`,
      isPlaceholder: false,
      isUnknownArea: false,
    };
  }
  if (zip) {
    return {
      label: `${UNKNOWN_ZIP_AREA_LABEL} · ${zip}`,
      isPlaceholder: false,
      isUnknownArea: true,
    };
  }
  return {
    label: "Enter ZIP",
    isPlaceholder: true,
    isUnknownArea: false,
  };
}

export function useUserLocation() {
  const { session } = useAuthSession();
  const localZip = useSyncExternalStore(
    subscribeUserLocation,
    getUserZipSnapshot,
    getUserZipServerSnapshot
  );
  const geoCity = useSyncExternalStore(
    subscribeUserLocation,
    getPersonalizationCitySnapshot,
    getPersonalizationCityServerSnapshot
  );
  const editor = useUserLocationEditor();

  /* Profile ZIP from session snapshot + local ZIP from location store only.
   * Do not call loadSavedZipCode() here — that bypasses getServerSnapshot and
   * hydrates a different className/label than SSR (Enter ZIP vs saved ZIP). */
  const zip = useMemo(
    () => getProfileZipFromSession(session) ?? localZip,
    [session, localZip]
  );

  const placeName = useMemo(() => {
    if (!zip) return geoCity;
    return getZipPlaceDisplayName(zip);
  }, [zip, geoCity]);

  const { label: pillLabel, isPlaceholder, isUnknownArea } = useMemo(() => {
    if (zip) return buildDisplayLabel(zip, placeName);
    if (geoCity) {
      return {
        label: geoCity,
        isPlaceholder: false,
        isUnknownArea: false,
      };
    }
    return buildDisplayLabel(null, null);
  }, [zip, placeName, geoCity]);

  return {
    zip,
    city: placeName ?? geoCity,
    hasLocation: Boolean(zip || geoCity),
    pillLabel,
    isPlaceholder,
    isUnknownArea,
    isPanelOpen: editor.isPanelOpen,
    toggleLocationPanel: editor.toggleLocationPanel,
  };
}
