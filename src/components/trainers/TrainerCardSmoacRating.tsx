"use client";

import { SmoacStarRating } from "@/components/reviews/SmoacStarRating";
import { useSmoacReviewAggregate } from "@/hooks/useSmoacReviewAggregate";

/** Read-only SMOAC ★ on marketplace cards (leave-review is profile-sheet only). */
export function TrainerCardSmoacRating({
  trainerId,
  className,
  avgRating: avgRatingOverride,
  reviewCount: reviewCountOverride,
}: {
  trainerId: string;
  className?: string;
  /** Prefetched aggregate (e.g. Top 50) — skips a redundant fetch when provided */
  avgRating?: number | null;
  reviewCount?: number;
}) {
  const smoac = useSmoacReviewAggregate(trainerId);
  const reviewCount = reviewCountOverride ?? smoac.reviewCount;
  const avgRating =
    avgRatingOverride !== undefined ? avgRatingOverride : smoac.avgRating;

  return (
    <SmoacStarRating
      size="card"
      reviewCount={reviewCount}
      avgRating={avgRating}
      className={className}
    />
  );
}
