"use client";

import Image from "next/image";
import { LOGO_SRC } from "@/lib/brand";
import {
  trainerFirstName,
  type SpecialistReviewAggregate,
} from "@/lib/reviews/specialist-review-types";
import { resolveTrainerReviewDisplay } from "@/lib/trainer-reviews";
import { formatTrainerRating } from "@/lib/utils";
import type { Trainer } from "@/types";

interface ProfileReviewMetaProps {
  trainer: Trainer;
  smoacAggregate?: SpecialistReviewAggregate | null;
  canLeaveReview?: boolean;
  hasOwnReview?: boolean;
  onLeaveReview?: () => void;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** SMOAC ★ row — dimmed at 0 reviews; yellow fill tracks live average. */
function SmoacReviewStars({
  reviewCount,
  avgRating,
  interactive,
  onLeaveReview,
}: {
  reviewCount: number;
  avgRating: number | null;
  interactive?: boolean;
  onLeaveReview?: () => void;
}) {
  const fill =
    reviewCount > 0 && avgRating != null
      ? Math.min(5, Math.max(0, avgRating))
      : 0;
  const countLabel =
    reviewCount === 1 ? "(1) review" : `(${reviewCount}) reviews`;
  const ratingSummary =
    reviewCount > 0 && avgRating != null
      ? `${formatTrainerRating(avgRating)} average from ${countLabel}`
      : "0 reviews on SMOAC";

  const stars = (
    <>
      <span className="profile-hero__smoac-stars-row" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => {
          const portion = clamp01(fill - index);
          return (
            <span key={index} className="profile-hero__smoac-star">
              <span className="profile-hero__smoac-star-dim">★</span>
              {portion > 0 ? (
                <span
                  className="profile-hero__smoac-star-fill"
                  style={{ width: `${portion * 100}%` }}
                >
                  ★
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
      <span className="profile-hero__smoac-stars-count">{countLabel}</span>
    </>
  );

  if (interactive && onLeaveReview) {
    return (
      <button
        type="button"
        className="smoac-control profile-hero__smoac-stars profile-hero__smoac-stars--action"
        onClick={onLeaveReview}
        aria-label={`Leave a review. ${ratingSummary}`}
      >
        {stars}
      </button>
    );
  }

  return (
    <div className="profile-hero__smoac-stars" aria-label={ratingSummary}>
      {stars}
    </div>
  );
}

export function ProfileReviewMeta({
  trainer,
  smoacAggregate,
  canLeaveReview = false,
  hasOwnReview = false,
  onLeaveReview,
}: ProfileReviewMetaProps) {
  const { total, sourceLabels } = resolveTrainerReviewDisplay(trainer);
  const smoacCount = smoacAggregate?.reviewCount ?? 0;
  const smoacAvg = smoacAggregate?.avgRating ?? null;
  const firstName = trainerFirstName(trainer.name);
  const hasClassicReviews = total > 0;

  return (
    <div className="profile-hero__reviews shrink-0">
      {hasClassicReviews ? (
        <>
          <div className="profile-hero__reviews-rating">
            <span className="profile-hero__reviews-star" aria-hidden>
              ★
            </span>
            <span className="profile-hero__reviews-score">
              {formatTrainerRating(trainer.rating)}
            </span>
          </div>
          <p className="profile-hero__reviews-total">
            {total} total review{total === 1 ? "" : "s"}
          </p>
          {sourceLabels.length > 0 ? (
            <p className="profile-hero__reviews-sources">
              {sourceLabels.map((label, index) => (
                <span key={label} className="profile-hero__reviews-source-item">
                  {index > 0 ? (
                    <span className="profile-hero__reviews-sources-dot" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <span className="profile-hero__reviews-source-tag">{label}</span>
                </span>
              ))}
            </p>
          ) : null}
        </>
      ) : null}

      <div className="profile-hero__reviews-smoac">
        <Image
          src={LOGO_SRC}
          alt=""
          width={14}
          height={14}
          className="profile-hero__reviews-mark"
        />
        <SmoacReviewStars
          reviewCount={smoacCount}
          avgRating={smoacAvg}
          interactive={Boolean(onLeaveReview && !hasOwnReview)}
          onLeaveReview={onLeaveReview}
        />
      </div>

      {canLeaveReview && onLeaveReview ? (
        <button
          type="button"
          className="smoac-control profile-hero__leave-review"
          onClick={onLeaveReview}
        >
          Trained with {firstName}? Leave a review
        </button>
      ) : null}

      {hasOwnReview ? (
        <p className="profile-hero__reviewed-status">
          You reviewed this specialist
        </p>
      ) : null}
    </div>
  );
}
