import {
  clearSpecialistOnboardingDraft,
  saveSpecialistApplication,
} from "@/lib/specialist-application-storage";
import { saveSpecialistOverridesForId } from "@/lib/specialist-profile-overrides";
import type { Trainer } from "@/types/trainer";
import type {
  SpecialistApplication,
  SpecialistOnboardingState,
} from "@/types/specialist-application";

function slugifyId(email: string): string {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "specialist"}-${Date.now().toString(36)}`;
}

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

function buildSessionExperience(state: SpecialistOnboardingState): string[] {
  const items: string[] = [];
  if (state.inHomeAvailable) items.push("In-home sessions");
  if (state.onlineCoachingAvailable) items.push("Online coaching");
  if (state.gymName.trim()) items.push(`Training at ${state.gymName.trim()}`);
  items.push(...state.availability.daysAvailable);
  items.push(...state.availability.timeBlocks);
  if (state.pricing.groupTrainingAvailable) items.push("Small group training");
  if (state.pricing.freeConsultationAvailable) items.push("Free consultation");
  return [...new Set(items)];
}

/** DEV ONLY — persist application for admin review + profile override draft */
export function submitSpecialistApplication(
  state: SpecialistOnboardingState
): SpecialistApplication {
  const now = new Date().toISOString();
  const id = slugifyId(state.email);
  const application: SpecialistApplication = {
    id,
    profileStatus: "PENDING_APPROVAL",
    submittedAt: now,
    updatedAt: now,
    ...state,
    email: state.email.trim(),
    certifications: state.certifications.filter(
      (cert) => cert.name.trim() && cert.issuer.trim()
    ),
  };

  saveSpecialistApplication(application);

  const pricePerSession = parsePrice(state.pricing.oneOnOnePrice);
  const photoUrls = linesToUrls(state.media.transformationPhotoUrls);
  const galleryUrls = [
    state.media.profilePhotoUrl.trim(),
    ...linesToUrls(state.media.trainingVideoUrls),
  ].filter(Boolean);

  saveSpecialistOverridesForId(id, {
    name: state.displayName.trim() || state.fullName.trim(),
    title: state.headline.trim(),
    gender: state.gender || "non-binary",
    profession: state.professionalType,
    specialty: state.specialties,
    certifications: application.certifications,
    city: state.city.trim(),
    neighborhood: state.neighborhood.trim(),
    serviceArea: state.neighborhood.trim()
      ? [state.neighborhood.trim()]
      : [],
    pricePerSession: pricePerSession || 100,
    bio: state.bio.trim(),
    photoNotes: galleryUrls.join("\n"),
    transformationNotes: photoUrls.join("\n"),
    bookingAvailability: buildSessionExperience(state).join(", "),
  });

  clearSpecialistOnboardingDraft();
  return application;
}

/** Build preview Trainer shape from onboarding state (not yet published) */
export function applicationToPreviewTrainer(
  state: SpecialistOnboardingState,
  id = "preview"
): Trainer {
  const pricePerSession = parsePrice(state.pricing.oneOnOnePrice) || 120;
  const location = [state.neighborhood, state.city].filter(Boolean).join(", ");
  const photo = state.media.profilePhotoUrl.trim() || "/trainers/placeholder.jpg";
  const mediaUrls = linesToUrls(state.media.trainingVideoUrls);

  return {
    id,
    name: state.displayName.trim() || state.fullName.trim() || "Your Name",
    profession: state.professionalType || "Specialist",
    title: state.headline.trim() || "Your headline",
    location: location || "Your city",
    city: state.city.trim() || "City",
    neighborhood: state.neighborhood.trim() || "",
    serviceArea: state.neighborhood.trim() ? [state.neighborhood.trim()] : [],
    specialty: state.specialties,
    gender: state.gender || "non-binary",
    pricePerSession,
    rating: 0,
    reviewCount: 0,
    galleryImages: mediaUrls.length > 0 ? mediaUrls : [photo],
    image: photo,
    heroImage: photo,
    bio: state.bio.trim() || "Your bio will appear here after approval.",
    bestFor: state.bestClientTypes
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4),
    coachingStyle: [state.motivationStyle, state.communicationStyle].filter(
      Boolean
    ),
    whyClientsChoose: state.coachingDifferentiator
      ? [state.coachingDifferentiator]
      : [],
    resultsSnapshot: [],
    sessionExperience: buildSessionExperience(state),
    gallery: linesToUrls(state.media.trainingVideoUrls).map((src, index) => ({
      id: `g-${index}`,
      type: "image" as const,
      src,
      alt: "Training media",
    })),
    clientTransformations: linesToUrls(
      state.media.transformationPhotoUrls
    ).map((src, index) => ({
      id: `t-${index}`,
      src,
      alt: "Client transformation",
    })),
    featured: false,
    certifications: state.certifications.filter((c) => c.name.trim()),
    reviews: [],
    social: {
      instagram: state.social.instagram,
      website: state.social.website,
    },
  };
}
