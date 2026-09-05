import { parseGender } from "@/lib/gender";
import { travelToClientsFromLegacyRadius } from "@/lib/specialist-service-area";
import { parseTravelToClients } from "@/types/specialist-service-area";
import {
  groupTrainingAvailableFromOptions,
  parseTrainingOptions,
} from "@/types/specialist-training-options";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import {
  INITIAL_SPECIALIST_ONBOARDING_STATE,
  type SpecialistApplication,
  type SpecialistOnboardingState,
} from "@/types/specialist-application";

function extractZipCodesFromText(text: string): string[] {
  const matches = text.match(/\b\d{5}\b/g) ?? [];
  return [...new Set(matches.map((zip) => normalizeZipCode(zip)).filter(isValidZipCode))];
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

/**
 * Deep-merge nested application blobs from Supabase / localStorage.
 * Partial `pricing` / `media` used to wipe defaults and crash go-live checks
 * (e.g. `oneOnOnePrice.replace` on undefined).
 */
export function normalizeSpecialistApplicationShape(
  app: SpecialistApplication
): SpecialistApplication {
  const pricing = asObject(app.pricing);
  const availability = asObject(app.availability);
  const social = asObject(app.social);
  const media = asObject(app.media);
  const defaults = INITIAL_SPECIALIST_ONBOARDING_STATE;

  const certifications = Array.isArray(app.certifications)
    ? app.certifications.map((cert) => ({
        name: asString(cert?.name),
        issuer: asString(cert?.issuer),
        year:
          typeof cert?.year === "number" && Number.isFinite(cert.year)
            ? cert.year
            : new Date().getFullYear(),
      }))
    : defaults.certifications;

  const trainingOptions = parseTrainingOptions(app.trainingOptions, {
    groupTrainingAvailable: Boolean(
      pricing?.groupTrainingAvailable ?? defaults.pricing.groupTrainingAvailable
    ),
  });

  return {
    ...defaults,
    ...app,
    email: asString(app.email),
    password: asString(app.password),
    professionalType: asString(app.professionalType),
    fullName: asString(app.fullName),
    displayName: asString(app.displayName),
    headline: asString(app.headline),
    phone: asString(app.phone),
    gender: parseGender(app.gender),
    yearsExperience: asString(app.yearsExperience),
    ageRangesWorkedWith: asStringArray(app.ageRangesWorkedWith),
    city: asString(app.city),
    state: asString(app.state),
    neighborhood: asString(app.neighborhood),
    zipCode: asString(app.zipCode),
    serviceType: asString(app.serviceType) as SpecialistApplication["serviceType"],
    travelRadius: asString(app.travelRadius),
    travelToClients: parseTravelToClients(app.travelToClients),
    serviceAreaDescription: asString(app.serviceAreaDescription),
    gymName: asString(app.gymName),
    trainingOptions,
    facilityAddress: asString(app.facilityAddress),
    specialties: asStringArray(app.specialties),
    certifications,
    collegeAttended: asString(app.collegeAttended),
    degree: asString(app.degree),
    coachingPhilosophy: asString(app.coachingPhilosophy),
    bestClientTypes: asString(app.bestClientTypes),
    coachingDifferentiator: asString(app.coachingDifferentiator),
    communicationStyle: asString(app.communicationStyle),
    motivationStyle: asString(app.motivationStyle),
    bio: asString(app.bio),
    rejectionReason: asString(app.rejectionReason),
    pricing: {
      ...defaults.pricing,
      ...(pricing ?? {}),
      oneOnOnePrice: asString(
        pricing?.oneOnOnePrice,
        defaults.pricing.oneOnOnePrice
      ),
      onlineCoachingPrice: asString(
        pricing?.onlineCoachingPrice,
        defaults.pricing.onlineCoachingPrice
      ),
      packageOptions: asString(
        pricing?.packageOptions,
        defaults.pricing.packageOptions
      ),
      sessionDuration: asString(
        pricing?.sessionDuration,
        defaults.pricing.sessionDuration
      ),
      subscriptionOptions: asString(
        pricing?.subscriptionOptions,
        defaults.pricing.subscriptionOptions
      ),
      introOffer: asString(pricing?.introOffer, defaults.pricing.introOffer),
      groupTrainingAvailable: groupTrainingAvailableFromOptions(trainingOptions),
      freeConsultationAvailable: Boolean(
        pricing?.freeConsultationAvailable ??
          defaults.pricing.freeConsultationAvailable
      ),
    },
    availability: {
      ...defaults.availability,
      ...(availability ?? {}),
      daysAvailable: asStringArray(
        availability?.daysAvailable ?? defaults.availability.daysAvailable
      ),
      timeBlocks: asStringArray(
        availability?.timeBlocks ?? defaults.availability.timeBlocks
      ),
      clientCapacity: asString(
        availability?.clientCapacity,
        defaults.availability.clientCapacity
      ),
      acceptingNewClients: Boolean(
        availability?.acceptingNewClients ??
          defaults.availability.acceptingNewClients
      ),
    },
    social: {
      ...defaults.social,
      ...(social ?? {}),
      instagram: asString(social?.instagram, defaults.social.instagram ?? ""),
      tiktok: asString(social?.tiktok, defaults.social.tiktok ?? ""),
      website: asString(social?.website, defaults.social.website ?? ""),
      googleReviewsUrl: asString(
        social?.googleReviewsUrl,
        defaults.social.googleReviewsUrl ?? ""
      ),
      googlePlaceId: asString(
        social?.googlePlaceId,
        defaults.social.googlePlaceId ?? ""
      ),
    },
    media: {
      ...defaults.media,
      ...(media ?? {}),
      profilePhotoUrl: asString(
        media?.profilePhotoUrl,
        defaults.media.profilePhotoUrl
      ),
      profilePhotoOriginalUrl: asString(
        media?.profilePhotoOriginalUrl || media?.profilePhotoUrl,
        defaults.media.profilePhotoOriginalUrl
      ),
      profilePhotoCrop:
        media?.profilePhotoCrop === null || media?.profilePhotoCrop === undefined
          ? null
          : (media.profilePhotoCrop as SpecialistApplication["media"]["profilePhotoCrop"]),
      transformationPhotoUrls: asString(
        media?.transformationPhotoUrls,
        defaults.media.transformationPhotoUrls
      ),
      certificationUploadUrls: asString(
        media?.certificationUploadUrls,
        defaults.media.certificationUploadUrls
      ),
      trainingVideoUrls: asString(
        media?.trainingVideoUrls,
        defaults.media.trainingVideoUrls
      ),
      slideshowFramesJson: asString(
        media?.slideshowFramesJson,
        defaults.media.slideshowFramesJson ?? ""
      ),
    },
  };
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

export function deriveWillingToTravel(
  travelToClients: string,
  travelRadius: string
): boolean {
  const listed = parseTravelToClients(travelToClients);
  if (listed === "yes") return true;
  if (listed === "no" || listed === "n/a") return false;
  return travelToClientsFromLegacyRadius(travelRadius) === "yes";
}

export function enrichSpecialistApplicationFields<
  T extends SpecialistOnboardingState | SpecialistApplication,
>(state: T): T & {
  willingToTravel: boolean;
  serviceAreaZipCodes: string[];
  businessName: string;
  membershipTier: "free" | "premium";
} {
  const travelRadius = asString(state.travelRadius);
  const travelToClients =
    parseTravelToClients(
      "travelToClients" in state ? state.travelToClients : ""
    ) || travelToClientsFromLegacyRadius(travelRadius);
  const displayName = asString(state.displayName);
  const fullName = asString(state.fullName);
  const willingToTravel = deriveWillingToTravel(travelToClients, travelRadius);
  const serviceAreaZipCodes = buildServiceAreaZipCodes({
    zipCode: asString(state.zipCode),
    serviceAreaDescription: asString(state.serviceAreaDescription),
  });
  const businessName = displayName.trim() || fullName.trim() || "";
  const membershipTier =
    "membershipTier" in state && state.membershipTier
      ? state.membershipTier
      : "free";

  return {
    ...state,
    travelRadius,
    travelToClients,
    displayName,
    fullName,
    willingToTravel,
    serviceAreaZipCodes,
    businessName,
    membershipTier,
  };
}
