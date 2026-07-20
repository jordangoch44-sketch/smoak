/**
 * Specialist dashboard reputation hub — mock multi-source feed (not public profile).
 *
 * Powers: `ReviewsCard`, `ReputationSourceRow`, `ReputationReviewFeedItem` on the
 * specialist dashboard only.
 *
 * Data: `constants/specialist-reputation-mock.ts` (connected Google/Yelp-style sources +
 * sample external reviews). May fold seed `trainer.reviews` into the hub preview.
 *
 * Do **not** use for marketplace hero ★ (`trainer-reviews.ts`) or live SMOAC submit/read
 * (`reviews/specialist-reviews-client.ts`).
 */
import {
  REPUTATION_SOURCE_REGISTRY,
  SPECIALIST_REPUTATION_BY_PROFILE,
} from "@/constants/specialist-reputation-mock";
import type { Trainer } from "@/types";
import type {
  AggregatedReview,
  ReputationSourceDefinition,
  ReputationSourceSummary,
  SpecialistReputationHub,
} from "@/types/specialist-reputation";

const EMPTY_HUB: SpecialistReputationHub = {
  profileId: "",
  totalReviewCount: 0,
  overallRating: 0,
  sources: [],
  latestReviews: [],
};

function roundRating(value: number): number {
  return Math.round(value * 10) / 10;
}

function smoacReviewToAggregated(
  review: Trainer["reviews"][number],
  profileId: string
): AggregatedReview {
  return {
    id: `smoac-${review.id}`,
    profileId,
    source: "smoac",
    reviewerName: review.author,
    rating: review.rating,
    reviewText: review.text,
    reviewDate: `${review.date}T12:00:00.000Z`,
    isVerified: true,
  };
}

function connectedSources(sources: ReputationSourceSummary[]): ReputationSourceSummary[] {
  return sources.filter((source) => source.connectedStatus === "connected");
}

function computeOverallRating(sources: ReputationSourceSummary[]): number {
  const active = connectedSources(sources).filter(
    (source) => source.totalReviews > 0 && source.averageRating != null
  );
  if (active.length === 0) return 0;

  const weighted = active.reduce(
    (acc, source) =>
      acc + source.totalReviews * (source.averageRating as number),
    0
  );
  const count = active.reduce((acc, source) => acc + source.totalReviews, 0);
  return count > 0 ? roundRating(weighted / count) : 0;
}

function computeTotalReviews(sources: ReputationSourceSummary[]): number {
  return connectedSources(sources).reduce(
    (acc, source) => acc + source.totalReviews,
    0
  );
}

function sortReviewsChronologically(reviews: AggregatedReview[]): AggregatedReview[] {
  return [...reviews].sort(
    (a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
  );
}

export function getReputationSourceDefinition(
  sourceId: string
): ReputationSourceDefinition | undefined {
  return REPUTATION_SOURCE_REGISTRY.find((entry) => entry.sourceId === sourceId);
}

export function getReputationSourceDisplayName(sourceId: string): string {
  const fromRegistry = getReputationSourceDefinition(sourceId);
  if (fromRegistry) return fromRegistry.sourceName;
  return sourceId.charAt(0).toUpperCase() + sourceId.slice(1);
}

export function formatReputationRating(rating: number): string {
  if (rating <= 0) return "—";
  return rating % 1 === 0 ? rating.toFixed(1) : rating.toFixed(1);
}

export function buildSpecialistReputationHub(
  profileId: string,
  trainer?: Trainer | null
): SpecialistReputationHub {
  if (!profileId) return EMPTY_HUB;

  const config = SPECIALIST_REPUTATION_BY_PROFILE[profileId];
  const sources = config?.sources ?? [];
  const smoacReviews = (trainer?.reviews ?? []).map((review) =>
    smoacReviewToAggregated(review, profileId)
  );
  const externalReviews = config?.externalReviews ?? [];
  const latestReviews = sortReviewsChronologically([
    ...smoacReviews,
    ...externalReviews,
  ]).slice(0, 5);

  const totalReviewCount = config
    ? computeTotalReviews(sources)
    : trainer?.reviewCount ?? 0;

  const overallRating = config
    ? computeOverallRating(sources)
    : roundRating(trainer?.rating ?? 0);

  return {
    profileId,
    totalReviewCount,
    overallRating,
    sources,
    latestReviews,
  };
}
