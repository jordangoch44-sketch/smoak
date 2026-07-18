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

  const approved = getApprovedSpecialistProfileById(trainerId);
  if (approved) return approved;

  const seed = getSeedTrainerById(trainerId);
  if (seed) return seed;

  const app = getSpecialistApplicationById(trainerId);
  if (app && PUBLIC_SPECIALIST_STATUSES.includes(app.profileStatus)) {
    return applicationToTrainer(app);
  }

  return undefined;
}

export type PublicCatalogOptions = {
  /**
   * When false, return seed trainers only (no localStorage approved profiles,
   * hidden ids, or specialist applications). Use for SSR / pre-hydration so
   * server HTML matches the client's first paint.
   */
  includeBrowserState?: boolean;
};

/** Approved specialists for Explore, featured, saved resolution */
export function listPublicMarketplaceTrainers(
  options: PublicCatalogOptions = {}
): Trainer[] {
  const includeBrowserState = options.includeBrowserState !== false;

  if (!includeBrowserState) {
    return seedTrainers.slice();
  }

  const hiddenSet = new Set(getHiddenTrainersSnapshot());
  const seen = new Set<string>();
  const result: Trainer[] = [];
  const approvedProfiles = getApprovedSpecialistProfilesSnapshot();

  for (const seed of seedTrainers) {
    if (seen.has(seed.id)) continue;
    if (isTrainerHidden(seed.id, hiddenSet)) continue;
    if (applicationBlocksPublicSeed(seed.id)) continue;
    seen.add(seed.id);
    /* Prefer durable approved/DB profile over seed when both exist */
    result.push(approvedProfiles[seed.id] ?? seed);
  }

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
      result.push(approvedProfiles[app.id] ?? applicationToTrainer(app));
    }
  }

  return result;
}

/** Sponsored / premium placements for homepage discovery rail */
export function listPublicSponsoredTrainers(
  options: PublicCatalogOptions = {}
): Trainer[] {
  const all = listPublicMarketplaceTrainers(options);
  const sponsored = all.filter((trainer) => trainer.sponsored);
  if (sponsored.length > 0) return sponsored;
  return all.filter((trainer) => trainer.featured);
}

/**
 * Newest-feeling specialists for homepage — fewer reviews as a proxy until
 * durable join dates exist on public catalog rows.
 */
export function listPublicNewTrainers(
  options: PublicCatalogOptions = {}
): Trainer[] {
  return [...listPublicMarketplaceTrainers(options)].sort((a, b) => {
    if (a.reviewCount !== b.reviewCount) return a.reviewCount - b.reviewCount;
    return b.rating - a.rating;
  });
}
