"use client";

import Image from "next/image";
import { SmoacStarRating } from "@/components/reviews/SmoacStarRating";
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
        <SmoacStarRating
          reviewCount={smoacCount}
          avgRating={smoacAvg}
          onLeaveReview={
            onLeaveReview && !hasOwnReview ? onLeaveReview : undefined
          }
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
