import { geocodeUsAddress } from "@/lib/geo/forward-geocode";
import { lookupZipPlace } from "@/lib/geo/zip-place-lookup";
import { zipCodeToCoordinates } from "@/lib/geo/zip-centroids";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import type { SpecialistWorkSpot } from "@/types/specialist-service-area";
import {
  applyPrimaryWorkSpot,
  applySecondaryWorkSpot,
  hasWorkSpotContent,
  primaryWorkSpotFromForm,
  secondaryWorkSpotFromForm,
} from "@/lib/specialist-work-spots";

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

async function resolveWorkSpot(
  spot: SpecialistWorkSpot,
  options: { clearStreet: boolean }
): Promise<SpecialistWorkSpot> {
  if (options.clearStreet) {
    const zip = normalizeZipCode(spot.zipCode);
    if (!isValidZipCode(zip)) {
      return {
        ...spot,
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
      ...spot,
      workAddress: "",
      locationPrecision: "zip",
      latitude: fromZip?.latitude ?? null,
      longitude: fromZip?.longitude ?? null,
      ...(place?.city ? { city: spot.city.trim() || place.city } : {}),
    };
  }

  const address = spot.workAddress.trim();
  const wantsAddress =
    spot.locationPrecision === "address" && address.length >= 5;

  if (wantsAddress) {
    if (hasFiniteCoords(spot.latitude, spot.longitude)) {
      return {
        ...spot,
        workAddress: address,
        locationPrecision: "address",
      };
    }
    const geo = await geocodeUsAddress(address);
    if (geo) {
      return {
        ...spot,
        workAddress: geo.formattedAddress || address,
        locationPrecision: "address",
        latitude: geo.latitude,
        longitude: geo.longitude,
        zipCode: geo.zip || spot.zipCode,
        city: spot.city.trim() || geo.city || spot.city,
      };
    }
  }

  const zip = normalizeZipCode(spot.zipCode);
  if (isValidZipCode(zip)) {
    const place = await lookupZipPlace(zip);
    const fromZip = place
      ? { latitude: place.latitude, longitude: place.longitude }
      : zipCodeToCoordinates(zip);
    return {
      ...spot,
      workAddress: "",
      locationPrecision: "zip",
      latitude: fromZip?.latitude ?? null,
      longitude: fromZip?.longitude ?? null,
      ...(place?.city ? { city: spot.city.trim() || place.city } : {}),
    };
  }

  return {
    ...spot,
    workAddress: "",
    locationPrecision: "zip",
  };
}

/**
 * Ensure Edit profile saves always carry marketplace-ready lat/lng:
 * pinned street address when present, otherwise ZIP centroid.
 * Resolves the optional second studio the same way.
 */
export async function resolveSpecialistFormLocation(
  form: SpecialistProfileEditForm
): Promise<SpecialistProfileEditForm> {
  const virtual = form.serviceType === "virtual";
  const primary = await resolveWorkSpot(primaryWorkSpotFromForm(form), {
    clearStreet: virtual,
  });
  const next = applyPrimaryWorkSpot(form, primary);

  const secondaryDraft = secondaryWorkSpotFromForm(form);
  if (!hasWorkSpotContent(secondaryDraft)) {
    return applySecondaryWorkSpot(next, {
      workAddress: "",
      locationPrecision: "zip",
      city: "",
      neighborhood: "",
      zipCode: "",
      latitude: null,
      longitude: null,
    });
  }

  const secondary = await resolveWorkSpot(secondaryDraft, {
    clearStreet: virtual,
  });
  return applySecondaryWorkSpot(next, secondary);
}
