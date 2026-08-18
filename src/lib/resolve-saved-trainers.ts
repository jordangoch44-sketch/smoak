import { getTrainerById as getSeedTrainerById } from "@/data/trainers";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { getApprovedSpecialistProfileById } from "@/lib/approved-specialist-profiles-store";
import { getPublicMarketplaceTrainerBaseById } from "@/lib/marketplace-public-catalog";
import { isLivePublicCatalogMode } from "@/lib/public-catalog-mode";
import {
  applySpecialistProfileOverrides,
  loadSpecialistOverridesForId,
} from "@/lib/specialist-profile-overrides";
import { getTrainerCardPlaceholder } from "@/lib/trainer-placeholders";
import type { Trainer } from "@/types";

function applyOverridesIfNeeded(trainer: Trainer): Trainer {
  if (isLivePublicCatalogMode() || isMarketplaceSupabaseActive()) {
    return trainer;
  }
  const overrides = loadSpecialistOverridesForId(trainer.id);
  return overrides ? applySpecialistProfileOverrides(trainer, overrides) : trainer;
}

/** Minimal card when a saved id no longer resolves in catalog/seed. */
export function buildUnavailableSavedTrainer(trainerId: string): Trainer {
  const image = getTrainerCardPlaceholder(trainerId);
  return {
    id: trainerId,
    name: "Specialist unavailable",
    profession: "Specialist",
    title: "No longer listed on SMOAC",
    location: "",
    city: "",
    neighborhood: "",
    serviceArea: [],
    zipCode: "",
    latitude: 0,
    longitude: 0,
    specialty: [],
    gender: "",
    pricePerSession: 0,
    rating: 0,
    reviewCount: 0,
    galleryImages: [image],
    image,
    heroImage: image,
    bio: "This specialist is no longer available in the marketplace. You can remove them from your shortlist.",
    bestFor: [],
    coachingStyle: [],
    whyClientsChoose: [],
    sessionExperience: [],
    gallery: [],
    clientTransformations: [],
    featured: false,
    certifications: [],
    reviews: [],
    social: {},
  };
}

/**
 * Resolve saved specialist ids in shortlist order.
 * Does not filter through Explore catalog alone — that dropped seed/legacy
 * saves and also raced catalog hydration (badge count ≠ empty list).
 */
export function resolveSavedTrainers(
  savedIds: readonly string[]
): Trainer[] {
  const result: Trainer[] = [];

  for (const id of savedIds) {
    const trimmed = id.trim();
    if (!trimmed) continue;

    const fromPublic = getPublicMarketplaceTrainerBaseById(trimmed);
    if (fromPublic) {
      result.push(applyOverridesIfNeeded(fromPublic));
      continue;
    }

    const approved = getApprovedSpecialistProfileById(trimmed);
    if (approved) {
      result.push(applyOverridesIfNeeded(approved));
      continue;
    }

    /* Legacy / demo saves still show until the client unsaves them */
    const seed = getSeedTrainerById(trimmed);
    if (seed) {
      result.push(applyOverridesIfNeeded(seed));
      continue;
    }

    result.push(buildUnavailableSavedTrainer(trimmed));
  }

  return result;
}
