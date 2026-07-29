import { trainers as seedTrainers, getTrainerById as getSeedTrainerById } from "@/data/trainers";
import {
  getApprovedSpecialistProfileById,
  getApprovedSpecialistProfilesHydratedSnapshot,
  getApprovedSpecialistProfilesSnapshot,
} from "@/lib/approved-specialist-profiles-store";
import { getHiddenTrainersSnapshot } from "@/lib/hidden-trainers-store";
import { applicationToTrainer } from "@/lib/application-to-trainer";
import {
  getPublicCatalogMode,
  isLivePublicCatalogMode,
  type PublicCatalogMode,
} from "@/lib/public-catalog-mode";
import {
  getSpecialistApplicationById,
  listSpecialistApplications,
} from "@/lib/specialist-application-storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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

function resolveCatalogMode(options: PublicCatalogOptions): PublicCatalogMode {
  if (options.catalogMode) return options.catalogMode;
  return getPublicCatalogMode();
}

/**
 * Resolve approved specialists for the public catalog.
 *
 * Priority:
 * 1. Hydrated remote store (post-Supabase fetch) — source of truth on client
 * 2. Explicit `remoteApproved` from SSR — first paint before hydrate
 * 3. Otherwise empty (live) or unhydrated local only when not in live mode
 */
function resolveApprovedMap(options: PublicCatalogOptions): Record<string, Trainer> {
  const map: Record<string, Trainer> = {};
  const mode = resolveCatalogMode(options);
  const includeBrowser = options.includeBrowserState !== false;

  if (includeBrowser && typeof window !== "undefined") {
    const hydrated = getApprovedSpecialistProfilesHydratedSnapshot();
    if (hydrated) {
      for (const [id, trainer] of Object.entries(
        getApprovedSpecialistProfilesSnapshot()
      )) {
        map[id] = trainer;
      }
      return map;
    }
  }

  for (const trainer of options.remoteApproved ?? []) {
    map[trainer.id] = trainer;
  }

  if (Object.keys(map).length > 0) {
    return map;
  }

  /* Do not let stale localStorage invent a live catalog before hydrate */
  if (isLivePublicCatalogMode(mode)) {
    return map;
  }

  if (includeBrowser) {
    for (const [id, trainer] of Object.entries(
      getApprovedSpecialistProfilesSnapshot()
    )) {
      map[id] = trainer;
    }
  }

  return map;
}

function usesLiveCatalog(options: PublicCatalogOptions): boolean {
  const mode = resolveCatalogMode(options);
  if (isLivePublicCatalogMode(mode)) return true;
  if (mode === "seed") return false;
  /* unknown: Supabase env present → never fall back to seed */
  return isSupabaseConfigured();
}

/** Whether a specialist id should appear on Explore, search, saves, rankings */
export function isPublicMarketplaceTrainerId(
  trainerId: string,
  options: PublicCatalogOptions = {}
): boolean {
  const live = usesLiveCatalog(options);
  /* Live mode: specialist_profiles.status=approved is the hide gate — skip
   * browser-local hide list so admin moderation is multi-device durable. */
  if (!live && options.includeBrowserState !== false) {
    const hiddenSet = new Set(getHiddenTrainersSnapshot());
    if (isTrainerHidden(trainerId, hiddenSet)) return false;
  }

  const approvedMap = resolveApprovedMap(options);
  if (live) {
    return Boolean(approvedMap[trainerId]);
  }

  const app = getSpecialistApplicationById(trainerId);
  if (app) {
    return PUBLIC_SPECIALIST_STATUSES.includes(app.profileStatus);
  }

  const seed = getSeedTrainerById(trainerId);
  if (!seed) return false;

  return !applicationBlocksPublicSeed(trainerId);
}

export function getPublicMarketplaceTrainerBaseById(
  trainerId: string,
  options: PublicCatalogOptions = {}
): Trainer | undefined {
  if (!isPublicMarketplaceTrainerId(trainerId, options)) return undefined;

  const approvedMap = resolveApprovedMap(options);
  if (approvedMap[trainerId]) return approvedMap[trainerId];

  const approved = getApprovedSpecialistProfileById(trainerId);
  if (approved) return approved;

  if (usesLiveCatalog(options)) {
    return undefined;
  }

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
   * When false, ignore localStorage approved/hidden/applications.
   * Pass `remoteApproved` for SSR live catalog.
   */
  includeBrowserState?: boolean;
  /** SSR / primed approved trainers from `specialist_profiles`. */
  remoteApproved?: Trainer[];
  /** Force live vs seed; defaults to primed `getPublicCatalogMode()`. */
  catalogMode?: PublicCatalogMode;
};

/** Approved specialists for Explore, featured, saved resolution */
export function listPublicMarketplaceTrainers(
  options: PublicCatalogOptions = {}
): Trainer[] {
  const includeBrowserState = options.includeBrowserState !== false;
  const hiddenSet = includeBrowserState
    ? new Set(getHiddenTrainersSnapshot())
    : new Set<string>();
  const approvedMap = resolveApprovedMap(options);
  const live = usesLiveCatalog(options);

  /* Live catalog: approved specialist_profiles only — never seed, never local-only apps */
  if (live) {
    const seen = new Set<string>();
    const result: Trainer[] = [];

    for (const trainer of Object.values(approvedMap)) {
      if (seen.has(trainer.id)) continue;
      seen.add(trainer.id);
      result.push(trainer);
    }

    return result;
  }

  /* Seed mode (Supabase not configured) — local demo only */
  if (!includeBrowserState) {
    return seedTrainers.slice();
  }

  const seen = new Set<string>();
  const result: Trainer[] = [];

  for (const seed of seedTrainers) {
    if (seen.has(seed.id)) continue;
    if (isTrainerHidden(seed.id, hiddenSet)) continue;
    if (applicationBlocksPublicSeed(seed.id)) continue;
    seen.add(seed.id);
    result.push(seed);
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

/** Homepage Sponsored boost placements only — Pro membership is not enough. */
export function listPublicSponsoredTrainers(
  options: PublicCatalogOptions = {}
): Trainer[] {
  return listPublicMarketplaceTrainers(options).filter(
    (trainer) => trainer.sponsored === true
  );
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
