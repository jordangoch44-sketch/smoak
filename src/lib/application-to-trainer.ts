import { getDefaultZipForMarketplaceCity } from "@/lib/marketplace-city-default-zip";
import { zipCodeToCoordinates } from "@/lib/geo/zip-centroids";
import { enrichSpecialistApplicationFields } from "@/lib/specialist-application-fields";
import { parseTravelRadiusMiles } from "@/lib/specialist-service-area";
import { normalizeProfileStyle } from "@/lib/specialist-profile-style";
import type {
  SpecialistApplication,
  SpecialistOnboardingState,
} from "@/types/specialist-application";
import type { SpecialistProfileOverrides } from "@/types/specialist-profile-edit";
import type { Trainer } from "@/types/trainer";

function parsePrice(value: string): number {
  const digits = value.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function linesToUrls(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildSessionExperience(
  state: SpecialistOnboardingState | SpecialistApplication
): string[] {
  const items: string[] = [];
  if (state.inHomeAvailable) items.push("In-home sessions");
  if (state.onlineCoachingAvailable) items.push("Online coaching");
  if (state.gymName.trim()) items.push(`Training at ${state.gymName.trim()}`);
  const days = Array.isArray(state.availability?.daysAvailable)
    ? state.availability.daysAvailable
    : [];
  const blocks = Array.isArray(state.availability?.timeBlocks)
    ? state.availability.timeBlocks
    : [];
  items.push(...days);
  items.push(...blocks);
  if (state.pricing.groupTrainingAvailable) items.push("Small group training");
  if (state.pricing.freeConsultationAvailable) items.push("Free consultation");
  return [...new Set(items)];
}

/** Full marketplace Trainer from an approved application */
export function applicationToTrainer(
  app: SpecialistApplication,
  id = app.id
): Trainer {
  const enriched = enrichSpecialistApplicationFields(app);
  const pricePerSession = parsePrice(app.pricing.oneOnOnePrice) || 120;
  const location = [app.neighborhood, app.city, app.state]
    .filter(Boolean)
    .join(", ");
  const zipCode =
    app.zipCode.trim() ||
    getDefaultZipForMarketplaceCity(app.city.trim()) ||
    "92101";
  const centroid =
    app.latitude != null && app.longitude != null
      ? { latitude: app.latitude, longitude: app.longitude }
      : zipCodeToCoordinates(zipCode) ?? {
          latitude: 32.7157,
          longitude: -117.1611,
        };
  const serviceType =
    app.serviceType ||
    (app.inHomeAvailable && app.onlineCoachingAvailable
      ? "both"
      : app.onlineCoachingAvailable
        ? "virtual"
        : "in-person");
  const travelRadiusMiles =
    parseTravelRadiusMiles(app.travelRadius) || (enriched.willingToTravel ? 25 : 0);
  const photo =
    app.media.profilePhotoUrl.trim() || "/trainers/placeholder.jpg";
  const mediaUrls = linesToUrls(app.media.trainingVideoUrls);

  return {
    id,
    name: app.displayName.trim() || app.fullName.trim() || "Specialist",
    profession: app.professionalType || "Specialist",
    title: app.headline.trim() || "Specialist",
    location: location || "Your city",
    city: app.city.trim() || "City",
    state: app.state.trim() || "CA",
    neighborhood: app.neighborhood.trim() || "",
    serviceArea: app.neighborhood.trim() ? [app.neighborhood.trim()] : [],
    serviceAreaZipCodes: enriched.serviceAreaZipCodes,
    serviceAreaDescription: app.serviceAreaDescription.trim(),
    zipCode,
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    willingToTravel: enriched.willingToTravel,
    serviceRadiusMiles: travelRadiusMiles,
    travelRadius: app.travelRadius,
    serviceType,
    sponsored: false,
    verified: app.profileStatus === "APPROVED",
    specialty: app.specialties,
    gender: app.gender || "non-binary",
    pricePerSession,
    rating: 0,
    reviewCount: 0,
    galleryImages: mediaUrls.length > 0 ? mediaUrls : [photo],
    image: photo,
    heroImage: photo,
    bio: app.bio.trim() || "",
    bestFor: app.bestClientTypes
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8),
    coachingStyle: app.coachingPhilosophy.trim()
      ? app.coachingPhilosophy
          .split(/[,;\n·]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [app.motivationStyle, app.communicationStyle].filter(Boolean),
    whyClientsChoose: app.coachingDifferentiator
      ? [app.coachingDifferentiator]
      : [],
    resultsSnapshot: [],
    sessionExperience: buildSessionExperience(app),
    gallery: linesToUrls(app.media.trainingVideoUrls).map((src, index) => ({
      id: `g-${index}`,
      type: "image" as const,
      src,
      alt: "Training media",
    })),
    clientTransformations: linesToUrls(app.media.transformationPhotoUrls).map(
      (src, index) => ({
        id: `t-${index}`,
        src,
        alt: "Client transformation",
      })
    ),
    featured: false,
    certifications: app.certifications.filter((c) => c.name.trim()),
    reviews: [],
    social: {
      instagram: app.social.instagram,
      website: app.social.website,
      tiktok: app.social.tiktok,
    },
    profileStyle: app.profileStyle
      ? normalizeProfileStyle(app.profileStyle)
      : undefined,
  };
}

/** Preview Trainer from onboarding state (not yet published) */
export function applicationToPreviewTrainer(
  state: SpecialistOnboardingState,
  id = "preview"
): Trainer {
  const now = new Date().toISOString();
  const draftApp = enrichSpecialistApplicationFields({
    id,
    profileStatus: "DRAFT",
    submittedAt: null,
    updatedAt: now,
    ...state,
    email: state.email.trim(),
    certifications: state.certifications.filter(
      (cert) => cert.name.trim() && cert.issuer.trim()
    ),
  }) as SpecialistApplication;

  return applicationToTrainer(draftApp, id);
}

/** Map application → dashboard override shape (localStorage profile edits). */
export function applicationToProfileOverrides(
  app: SpecialistApplication
): SpecialistProfileOverrides {
  const pricePerSession = parsePrice(app.pricing.oneOnOnePrice);
  const zip = app.zipCode.trim();
  const coords =
    app.latitude != null && app.longitude != null
      ? { latitude: app.latitude, longitude: app.longitude }
      : zipCodeToCoordinates(zip);

  const trainingStyle = [
    app.coachingPhilosophy.trim(),
    app.communicationStyle.trim(),
    app.motivationStyle.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    name: app.displayName.trim() || app.fullName.trim(),
    title: app.headline.trim(),
    gender: app.gender || "non-binary",
    profession: app.professionalType,
    specialty: app.specialties,
    certifications: app.certifications,
    city: app.city.trim(),
    state: app.state.trim(),
    neighborhood: app.neighborhood.trim(),
    zipCode: zip,
    serviceType: app.serviceType || undefined,
    travelRadius: app.travelRadius,
    serviceRadiusMiles: parseTravelRadiusMiles(app.travelRadius) || undefined,
    latitude: coords?.latitude,
    longitude: coords?.longitude,
    serviceArea: app.neighborhood.trim() ? [app.neighborhood.trim()] : [],
    serviceAreaDescription: app.serviceAreaDescription.trim(),
    pricePerSession: pricePerSession || 100,
    bio: app.bio.trim(),
    profilePhotoUrl: app.media.profilePhotoUrl.trim(),
    phone: app.phone.trim(),
    email: app.email.trim(),
    instagram: app.social.instagram?.trim() ?? "",
    website: app.social.website?.trim() ?? "",
    tiktok: app.social.tiktok?.trim() ?? "",
    experienceYears: app.yearsExperience.trim(),
    trainingStyle,
    servicesOffered: app.bestClientTypes.trim(),
    transformationNotes: app.media.transformationPhotoUrls.trim(),
    photoNotes: app.media.trainingVideoUrls.trim(),
    bookingAvailability: buildSessionExperience(app).join(", "),
    profileStyle: app.profileStyle
      ? normalizeProfileStyle(app.profileStyle)
      : undefined,
  };
}
