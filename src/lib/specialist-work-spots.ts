import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";
import {
  EMPTY_SPECIALIST_WORK_SPOT,
  type SpecialistWorkSpot,
} from "@/types/specialist-service-area";
import type { Trainer } from "@/types/trainer";
import { formatProviderLocation } from "@/lib/provider-location";

export function hasWorkSpotContent(spot: SpecialistWorkSpot): boolean {
  return Boolean(
    spot.workAddress.trim() ||
      spot.city.trim() ||
      spot.neighborhood.trim() ||
      spot.zipCode.trim()
  );
}

export function primaryWorkSpotFromForm(
  form: Pick<
    SpecialistProfileEditForm,
    | "workAddress"
    | "locationPrecision"
    | "city"
    | "neighborhood"
    | "zipCode"
    | "latitude"
    | "longitude"
  >
): SpecialistWorkSpot {
  return {
    workAddress: form.workAddress,
    locationPrecision: form.locationPrecision,
    city: form.city,
    neighborhood: form.neighborhood,
    zipCode: form.zipCode,
    latitude: form.latitude,
    longitude: form.longitude,
  };
}

export function secondaryWorkSpotFromForm(
  form: Pick<
    SpecialistProfileEditForm,
    | "workAddress2"
    | "locationPrecision2"
    | "city2"
    | "neighborhood2"
    | "zipCode2"
    | "latitude2"
    | "longitude2"
  >
): SpecialistWorkSpot {
  return {
    workAddress: form.workAddress2,
    locationPrecision: form.locationPrecision2,
    city: form.city2,
    neighborhood: form.neighborhood2,
    zipCode: form.zipCode2,
    latitude: form.latitude2,
    longitude: form.longitude2,
  };
}

export function applyPrimaryWorkSpot(
  form: SpecialistProfileEditForm,
  spot: SpecialistWorkSpot
): SpecialistProfileEditForm {
  return {
    ...form,
    workAddress: spot.workAddress,
    locationPrecision: spot.locationPrecision,
    city: spot.city,
    neighborhood: spot.neighborhood,
    zipCode: spot.zipCode,
    latitude: spot.latitude,
    longitude: spot.longitude,
  };
}

export function applySecondaryWorkSpot(
  form: SpecialistProfileEditForm,
  spot: SpecialistWorkSpot
): SpecialistProfileEditForm {
  return {
    ...form,
    workAddress2: spot.workAddress,
    locationPrecision2: spot.locationPrecision,
    city2: spot.city,
    neighborhood2: spot.neighborhood,
    zipCode2: spot.zipCode,
    latitude2: spot.latitude,
    longitude2: spot.longitude,
  };
}

export function clearSecondaryWorkSpot(
  form: SpecialistProfileEditForm
): SpecialistProfileEditForm {
  return applySecondaryWorkSpot(form, { ...EMPTY_SPECIALIST_WORK_SPOT });
}

export function formatWorkSpotPlaceLine(spot: SpecialistWorkSpot): string {
  return formatProviderLocation({
    city: spot.city,
    neighborhood: spot.neighborhood,
    zipCode: spot.zipCode,
  });
}

export function formatDualLocationPreview(
  primary: SpecialistWorkSpot,
  secondary: SpecialistWorkSpot
): string {
  const first = formatWorkSpotPlaceLine(primary);
  if (!hasWorkSpotContent(secondary)) return first;
  const second = formatWorkSpotPlaceLine(secondary);
  if (first && second) return `${first} · also ${second}`;
  return first || second;
}

export function trainerHasSecondaryWorkSpot(
  trainer: Pick<
    Trainer,
    "workAddress2" | "city2" | "neighborhood2" | "zipCode2"
  >
): boolean {
  return Boolean(
    trainer.workAddress2?.trim() ||
      trainer.city2?.trim() ||
      trainer.neighborhood2?.trim() ||
      trainer.zipCode2?.trim()
  );
}
