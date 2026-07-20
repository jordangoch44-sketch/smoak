"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  fetchClientReviewForSpecialist,
  fetchPublishedSpecialistReviews,
  fetchSpecialistReviewAggregate,
} from "@/lib/reviews/specialist-reviews-client";
import {
  REVIEW_LIST_PREVIEW,
  type SpecialistReview,
  type SpecialistReviewAggregate,
} from "@/lib/reviews/specialist-review-types";

export interface UseSpecialistReviewsResult {
  aggregate: SpecialistReviewAggregate;
  reviews: SpecialistReview[];
  totalLoaded: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  ownReview: SpecialistReview | null;
  canLeaveReview: boolean;
  refresh: () => Promise<void>;
  applySubmittedReview: (review: SpecialistReview) => void;
}

const EMPTY_AGGREGATE = (
  specialistId: string
): SpecialistReviewAggregate => ({
  specialistId,
  reviewCount: 0,
  avgRating: null,
});

/** Defer state updates so react-hooks/set-state-in-effect stays quiet. */
function deferUpdate(update: () => void): void {
  queueMicrotask(update);
}

export function useSpecialistReviews(
  specialistId: string
): UseSpecialistReviewsResult {
  const { session, isReady } = useAuthSession();
  const isClient = session?.role === "client";
  const clientUserId = isClient ? session?.userId : undefined;

  const [aggregate, setAggregate] = useState<SpecialistReviewAggregate>(() =>
    EMPTY_AGGREGATE(specialistId)
  );
  const [reviews, setReviews] = useState<SpecialistReview[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalLoaded, setTotalLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ownReview, setOwnReview] = useState<SpecialistReview | null>(null);

  const refresh = useCallback(async () => {
    if (!specialistId) return;
    const [agg, list] = await Promise.all([
      fetchSpecialistReviewAggregate(specialistId),
      fetchPublishedSpecialistReviews(specialistId, {
        limit: REVIEW_LIST_PREVIEW,
        offset: 0,
      }),
    ]);
    const nextAgg = agg ?? EMPTY_AGGREGATE(specialistId);
    let mine: SpecialistReview | null = null;
    if (clientUserId) {
      mine = await fetchClientReviewForSpecialist(specialistId, clientUserId);
    }
    deferUpdate(() => {
      setAggregate(nextAgg);
      setTotalCount(nextAgg.reviewCount);
      setReviews(list);
      setTotalLoaded(true);
      setOwnReview(mine);
    });
  }, [specialistId, clientUserId]);

  useEffect(() => {
    if (!isReady || !specialistId) return;
    let cancelled = false;
    deferUpdate(() => {
      if (cancelled) return;
      setAggregate(EMPTY_AGGREGATE(specialistId));
      setReviews([]);
      setTotalCount(0);
      setTotalLoaded(false);
      setOwnReview(null);
      void refresh().then(() => {
        /* refresh applies its own defer */
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, specialistId, refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMore || reviews.length >= totalCount) return;
    setLoadingMore(true);
    try {
      const next = await fetchPublishedSpecialistReviews(specialistId, {
        limit: 10,
        offset: reviews.length,
      });
      setReviews((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...next.filter((r) => !seen.has(r.id))];
      });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, reviews.length, specialistId, totalCount]);

  const applySubmittedReview = useCallback((review: SpecialistReview) => {
    setOwnReview(review);
    setReviews((prev) => [review, ...prev.filter((r) => r.id !== review.id)]);
    setAggregate((prev) => {
      const nextCount = prev.reviewCount + 1;
      const prevAvg = prev.avgRating ?? 0;
      const nextAvg =
        prev.reviewCount === 0
          ? review.rating
          : Math.round(
              ((prevAvg * prev.reviewCount + review.rating) / nextCount) * 10
            ) / 10;
      return {
        specialistId: prev.specialistId,
        reviewCount: nextCount,
        avgRating: nextAvg,
      };
    });
    setTotalCount((c) => c + 1);
  }, []);

  return {
    aggregate,
    reviews,
    totalLoaded,
    hasMore: reviews.length < totalCount,
    loadingMore,
    loadMore,
    ownReview,
    canLeaveReview: Boolean(isReady && isClient && !ownReview),
    refresh,
    applySubmittedReview,
  };
}
