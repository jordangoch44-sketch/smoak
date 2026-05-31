import { parseTravelRadiusMiles } from "@/lib/specialist-service-area";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import type {
  SpecialistApplication,
  SpecialistOnboardingState,
} from "@/types/specialist-application";

function extractZipCodesFromText(text: string): string[] {
  const matches = text.match(/\b\d{5}\b/g) ?? [];
  return [...new Set(matches.map((zip) => normalizeZipCode(zip)).filter(isValidZipCode))];
}

export function buildServiceAreaZipCodes(
  state: Pick<
    SpecialistOnboardingState,
    "zipCode" | "serviceAreaDescription"
  >
): string[] {
  const zips = new Set<string>();
  const primary = normalizeZipCode(state.zipCode.trim());
  if (isValidZipCode(primary)) {
    zips.add(primary);
  }
  for (const zip of extractZipCodesFromText(state.serviceAreaDescription)) {
    zips.add(zip);
  }
  return [...zips];
}

export function deriveWillingToTravel(travelRadius: string): boolean {
  if (!travelRadius.trim()) return false;
  const miles = parseTravelRadiusMiles(travelRadius);
  return miles > 0;
}

export function enrichSpecialistApplicationFields<
  T extends SpecialistOnboardingState | SpecialistApplication,
>(state: T): T & {
  willingToTravel: boolean;
  serviceAreaZipCodes: string[];
  businessName: string;
  membershipTier: "free" | "premium";
} {
  const willingToTravel = deriveWillingToTravel(state.travelRadius);
  const serviceAreaZipCodes = buildServiceAreaZipCodes(state);
  const businessName =
    state.displayName.trim() || state.fullName.trim() || "";
  const membershipTier =
    "membershipTier" in state && state.membershipTier
      ? state.membershipTier
      : "free";

  return {
    ...state,
    willingToTravel,
    serviceAreaZipCodes,
    businessName,
    membershipTier,
  };
}
