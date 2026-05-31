import { trainers as seedTrainers, getTrainerById as getSeedTrainerById } from "@/data/trainers";
import {
  getApprovedSpecialistProfileById,
  getApprovedSpecialistProfilesSnapshot,
} from "@/lib/approved-specialist-profiles-store";
import { getHiddenTrainersSnapshot } from "@/lib/hidden-trainers-store";
import { applicationToTrainer } from "@/lib/application-to-trainer";
import {
  getSpecialistApplicationById,
  listSpecialistApplications,
} from "@/lib/specialist-application-storage";
import { applySpecialistProfileOverrides } from "@/lib/specialist-profile-overrides";
import { loadAllSpecialistOverrides } from "@/lib/specialist-profile-overrides";
import type { ProfileStatus } from "@/types/specialist-application";
import type { Trainer } from "@/types/trainer";

const PUBLIC_SPECIALIST_STATUSES: ProfileStatus[] = ["APPROVED"];

function applicationBlocksPublicSeed(trainerId: string): boolean {
  const app = getSpecialistApplicationById(trainerId);
  if (!app) return false;
  return !PUBLIC_SPECIALIST_STATUSES.includes(app.profileStatus);
}

function isTrainerHidden(trainerId: string, hiddenSet: Set<string>): boolean {
  return hiddenSet.has(trainerId);
}

/** Whether a specialist id should appear on Explore, search, saves, rankings */
export function isPublicMarketplaceTrainerId(trainerId: string): boolean {
  const hiddenSet = new Set(getHiddenTrainersSnapshot());
  if (isTrainerHidden(trainerId, hiddenSet)) return false;

  const app = getSpecialistApplicationById(trainerId);
  if (app) {
    return PUBLIC_SPECIALIST_STATUSES.includes(app.profileStatus);
  }

  const approvedOnly = getApprovedSpecialistProfileById(trainerId);
  if (approvedOnly) return true;

  const seed = getSeedTrainerById(trainerId);
  if (!seed) return false;

  return !applicationBlocksPublicSeed(trainerId);
}

export function getPublicMarketplaceTrainerBaseById(
  trainerId: string
): Trainer | undefined {
  if (!isPublicMarketplaceTrainerId(trainerId)) return undefined;

  const seed = getSeedTrainerById(trainerId);
  if (seed) return seed;

  const approved = getApprovedSpecialistProfileById(trainerId);
  if (approved) return approved;

  const app = getSpecialistApplicationById(trainerId);
  if (app && PUBLIC_SPECIALIST_STATUSES.includes(app.profileStatus)) {
    return applicationToTrainer(app);
  }

  return undefined;
}

/** Approved specialists for Explore, featured, saved resolution */
export function listPublicMarketplaceTrainers(): Trainer[] {
  const hiddenSet = new Set(getHiddenTrainersSnapshot());
  const seen = new Set<string>();
  const result: Trainer[] = [];

  for (const seed of seedTrainers) {
    if (seen.has(seed.id)) continue;
    if (isTrainerHidden(seed.id, hiddenSet)) continue;
    if (applicationBlocksPublicSeed(seed.id)) continue;
    seen.add(seed.id);
    result.push(seed);
  }

  const approvedProfiles = getApprovedSpecialistProfilesSnapshot();
  for (const id of Object.keys(approvedProfiles)) {
    if (seen.has(id)) continue;
    if (isTrainerHidden(id, hiddenSet)) continue;
    seen.add(id);
    result.push(approvedProfiles[id]);
  }

  if (typeof window !== "undefined") {
    for (const app of listSpecialistApplications()) {
      if (seen.has(app.id)) continue;
      if (!PUBLIC_SPECIALIST_STATUSES.includes(app.profileStatus)) continue;
      if (isTrainerHidden(app.id, hiddenSet)) continue;
      seen.add(app.id);
      result.push(applicationToTrainer(app));
    }
  }

  return result;
}

export function listPublicFeaturedTrainers(): Trainer[] {
  return listPublicMarketplaceTrainers().filter((trainer) => trainer.featured);
}
