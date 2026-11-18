"use client";

import Image from "next/image";
import { SmoacStarRating } from "@/components/reviews/SmoacStarRating";
import { LOGO_SRC } from "@/lib/brand";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";
import type { Trainer } from "@/types";
import { ProfileGoogleReviewsLink } from "./ProfileGoogleReviewsLink";

interface ProfileReviewMetaProps {
  trainer: Trainer;
  smoacAggregate?: SpecialistReviewAggregate | null;
  hasOwnReview?: boolean;
  onLeaveReview?: () => void;
}

/** SMOAC and Google rows under the profile photo. Counts stay separate. */
export function ProfileReviewMeta({
  trainer,
  smoacAggregate,
  hasOwnReview = false,
  onLeaveReview,
}: ProfileReviewMetaProps) {
  const smoacCount = smoacAggregate?.reviewCount ?? 0;
  const smoacAvg = smoacAggregate?.avgRating ?? null;

  return (
    <div className="profile-hero__reviews">
      <div className="profile-hero__reviews-smoac">
        <span className="profile-hero__reviews-mark-slot" aria-hidden>
          <Image
            src={LOGO_SRC}
            alt=""
            width={14}
            height={14}
            className="profile-hero__reviews-mark"
          />
        </span>
        <SmoacStarRating
          reviewCount={smoacCount}
          avgRating={smoacAvg}
          onLeaveReview={
            onLeaveReview && !hasOwnReview ? onLeaveReview : undefined
          }
        />
      </div>

      <ProfileGoogleReviewsLink trainer={trainer} variant="hero" />
    </div>
  );
}
