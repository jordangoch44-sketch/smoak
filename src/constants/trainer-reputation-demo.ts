import type { TrainerReviewSources } from "@/types/trainer";

/**
 * Public trainer profile demo overrides (DEV / seed data).
 *
 * Single source for optional per-trainer review source breakdown on `/trainers/[id]`.
 * Wired in `src/data/trainers.ts` → `reviewSources` + `computeTrainerReviewCount()`.
 *
 * Omit a trainer to show `reviewCount` from seed records only (no fabricated breakdown).
 */
export const TRAINER_DEMO_REVIEW_SOURCES: Record<string, TrainerReviewSources> = {
  "anthony-brooks": { smoac: 18, google: 62, yelp: 13 },
};
