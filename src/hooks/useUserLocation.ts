"use client";

import { useSyncExternalStore } from "react";
import { useMemo } from "react";
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

function buildDisplayLabel(
  zip: string | null,
  placeName: string | null,
  geoCity: string | null
): { label: string; isPlaceholder: boolean; isUnknownArea: boolean } {
  if (!zip && !placeName && !geoCity) {
    return { label: "Enter ZIP", isPlaceholder: true, isUnknownArea: false };
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
    label: geoCity ?? "Enter ZIP",
    isPlaceholder: !geoCity,
    isUnknownArea: false,
  };
}

export function useUserLocation() {
  const zip = useSyncExternalStore(
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

  const placeName = useMemo(() => {
    if (!zip) return geoCity;
    return getZipPlaceDisplayName(zip);
  }, [zip, geoCity]);

  const { label: pillLabel, isPlaceholder, isUnknownArea } = useMemo(
    () => buildDisplayLabel(zip, zip ? placeName : null, zip ? null : geoCity),
    [zip, placeName, geoCity]
  );

  return {
    zip,
    city: placeName,
    hasLocation: Boolean(zip || geoCity),
    pillLabel,
    isPlaceholder,
    isUnknownArea,
    openEditor: editor.openLocationPanel,
    isEditorOpen: editor.isPanelOpen,
    isPanelOpen: editor.isPanelOpen,
    toggleLocationPanel: editor.toggleLocationPanel,
  };
}
