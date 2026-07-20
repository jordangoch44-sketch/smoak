/**
 * Catalog / demo review display — seed `Trainer.reviewSources`, hero ★, explore cards.
 *
 * Powers: `ProfileReviewMeta`, `TrainerProfilePageClient` source tags, legacy `Reviews`
 * list counts, `computeTrainerReviewCount` in catalog data.
 *
 * Data: static `TRAINER_DEMO_REVIEW_SOURCES` + optional `trainer.reviewSources` on seed
 * trainers. Not live Supabase.
 *
 * Do **not** merge counts with `lib/reviews/specialist-reviews-client.ts` (live SMOAC) or
 * `lib/specialist-reputation.ts` (dashboard mock hub). Hero shows catalog total separately
 * from the SMOAC line in `ProfileReviewMeta`.
 */
import { TRAINER_DEMO_REVIEW_SOURCES } from "@/constants/trainer-reputation-demo";
import type { Trainer, TrainerReviewSources } from "@/types/trainer";

export type { TrainerReviewSources };

export function sumReviewSources(sources: TrainerReviewSources): number {
  return (sources.smoac ?? 0) + (sources.google ?? 0) + (sources.yelp ?? 0) + (sources.other ?? 0);
}

function hasPositiveSourceCounts(sources: TrainerReviewSources): boolean {
  return Object.values(sources).some((value) => typeof value === "number" && value > 0);
}

export function formatReviewSourceBreakdown(sources: TrainerReviewSources): string {
  const parts: string[] = [];
  if (sources.smoac && sources.smoac > 0) parts.push(`SMOAC ${sources.smoac}`);
  if (sources.google && sources.google > 0) parts.push(`Google ${sources.google}`);
  if (sources.yelp && sources.yelp > 0) parts.push(`Yelp ${sources.yelp}`);
  if (sources.other && sources.other > 0) parts.push(`Other ${sources.other}`);
  return parts.join(" · ");
}

/** Compact platform labels for profile hero (no counts) */
export function getReviewSourceLabels(sources: TrainerReviewSources): string[] {
  const labels: string[] = [];
  if (sources.google && sources.google > 0) labels.push("Google");
  if (sources.yelp && sources.yelp > 0) labels.push("Yelp");
  if (sources.smoac && sources.smoac > 0) labels.push("SMOAC");
  if (sources.other && sources.other > 0) labels.push("Other");
  return labels;
}

export function getDemoReviewSourcesForTrainer(
  trainerId: string
): TrainerReviewSources | undefined {
  return TRAINER_DEMO_REVIEW_SOURCES[trainerId];
}

export function resolveTrainerReviewSources(trainer: Trainer): TrainerReviewSources | undefined {
  const sources = trainer.reviewSources ?? getDemoReviewSourcesForTrainer(trainer.id);
  return sources && hasPositiveSourceCounts(sources) ? sources : undefined;
}

export function computeTrainerReviewCount(
  trainer: Pick<Trainer, "reviewCount" | "reviewSources" | "id">
): number {
  const sources = trainer.reviewSources ?? getDemoReviewSourcesForTrainer(trainer.id);
  if (sources && hasPositiveSourceCounts(sources)) {
    return sumReviewSources(sources);
  }
  return trainer.reviewCount;
}

export function resolveTrainerReviewDisplay(trainer: Trainer): {
  total: number;
  breakdown: string | null;
  sourceLabels: string[];
} {
  const sources = resolveTrainerReviewSources(trainer);
  const total = computeTrainerReviewCount(trainer);

  if (!sources) {
    return { total, breakdown: null, sourceLabels: [] };
  }

  return {
    total,
    breakdown: formatReviewSourceBreakdown(sources),
    sourceLabels: getReviewSourceLabels(sources),
  };
}
