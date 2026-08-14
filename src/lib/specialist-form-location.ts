import { geocodeUsAddress } from "@/lib/geo/forward-geocode";
import { lookupZipPlace } from "@/lib/geo/zip-place-lookup";
import { zipCodeToCoordinates } from "@/lib/geo/zip-centroids";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";

function hasFiniteCoords(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  return (
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

/**
 * Ensure Edit profile saves always carry marketplace-ready lat/lng:
 * pinned street address when present, otherwise ZIP centroid.
 */
export async function resolveSpecialistFormLocation(
  form: SpecialistProfileEditForm
): Promise<SpecialistProfileEditForm> {
  if (form.serviceType === "virtual") {
    const zip = normalizeZipCode(form.zipCode);
    if (!isValidZipCode(zip)) {
      return {
        ...form,
        workAddress: "",
        locationPrecision: "zip",
        latitude: null,
        longitude: null,
      };
    }
    const place = await lookupZipPlace(zip);
    const fromZip = place
      ? { latitude: place.latitude, longitude: place.longitude }
      : zipCodeToCoordinates(zip);
    return {
      ...form,
      workAddress: "",
      locationPrecision: "zip",
      latitude: fromZip?.latitude ?? null,
      longitude: fromZip?.longitude ?? null,
      ...(place?.city ? { city: form.city.trim() || place.city } : {}),
    };
  }

  const address = form.workAddress.trim();
  const wantsAddress =
    form.locationPrecision === "address" && address.length >= 5;

  if (wantsAddress) {
    if (hasFiniteCoords(form.latitude, form.longitude)) {
      return {
        ...form,
        workAddress: address,
        locationPrecision: "address",
      };
    }
    const geo = await geocodeUsAddress(address);
    if (geo) {
      return {
        ...form,
        workAddress: geo.formattedAddress || address,
        locationPrecision: "address",
        latitude: geo.latitude,
        longitude: geo.longitude,
        zipCode: geo.zip || form.zipCode,
        city: form.city.trim() || geo.city || form.city,
      };
    }
  }

  const zip = normalizeZipCode(form.zipCode);
  if (isValidZipCode(zip)) {
    const place = await lookupZipPlace(zip);
    const fromZip = place
      ? { latitude: place.latitude, longitude: place.longitude }
      : zipCodeToCoordinates(zip);
    return {
      ...form,
      workAddress: "",
      locationPrecision: "zip",
      latitude: fromZip?.latitude ?? null,
      longitude: fromZip?.longitude ?? null,
      ...(place?.city ? { city: form.city.trim() || place.city } : {}),
    };
  }

  return {
    ...form,
    workAddress: "",
    locationPrecision: "zip",
  };
}
