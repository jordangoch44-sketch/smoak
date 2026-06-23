"use client";

import { useSyncExternalStore } from "react";
import { useMemo } from "react";
import { getEffectiveClientZip } from "@/lib/client-profile-location";
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
      label: `${zip} · ${placeName}`,
      isPlaceholder: false,
      isUnknownArea: false,
    };
  }
  if (zip) {
    return {
      label: `${zip} · ${UNKNOWN_ZIP_AREA_LABEL}`,
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

  const zip = useMemo(
    () => getEffectiveClientZip(session) ?? localZip,
    [session, localZip]
  );

  const placeName = useMemo(() => {
    if (!zip) return geoCity;
    return getZipPlaceDisplayName(zip);
  }, [zip, geoCity]);

  const { label: pillLabel, isPlaceholder, isUnknownArea } = useMemo(
    () => buildDisplayLabel(zip, zip ? placeName : null),
    [zip, placeName]
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
