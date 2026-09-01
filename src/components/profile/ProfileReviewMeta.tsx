"use client";

import Image from "next/image";
import { SmoacStarRating } from "@/components/reviews/SmoacStarRating";
import { LOGO_SRC } from "@/lib/brand";
import { resolvePublicGoogleReviewsDisplay } from "@/lib/google-reviews-display";
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

/** Compact Google “G” mark — separate from SMOAC logo line. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
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
  const google = resolvePublicGoogleReviewsDisplay(trainer);

  const googleRow = (
    <>
      <GoogleMark className="profile-hero__reviews-mark profile-hero__reviews-mark--google" />
      <SmoacStarRating
        reviewCount={google.reviewCount}
        avgRating={google.rating}
        sourceName="Google"
        className="profile-hero__google-stars"
      />
    </>
  );

  function scrollToSmoacReviews() {
    const target = document.getElementById("smoac-reviews");
    if (!target) return;
    const scroller = target.closest(".profile-sheet__body");
    if (scroller instanceof HTMLElement) {
      const nextTop =
        target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        12;
      scroller.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

      <div className="profile-hero__reviews-box">
        <button
          type="button"
          className="smoac-control profile-hero__reviews-smoac"
          aria-label="View SMOAC reviews"
          onClick={scrollToSmoacReviews}
        >
          <Image
            src={LOGO_SRC}
            alt=""
            width={14}
            height={14}
            className="profile-hero__reviews-mark"
          />
          <span aria-hidden>
            <SmoacStarRating
              reviewCount={smoacCount}
              avgRating={smoacAvg}
            />
          </span>
        </button>

        {google.locked ? (
          <div
            className="profile-hero__reviews-google profile-hero__reviews-google--locked"
            aria-label="Google Reviews — unlock with SMOAC Pro"
            title="Google Reviews — unlock with SMOAC Pro"
          >
            {googleRow}
          </div>
        ) : google.mapsHref && google.connected ? (
          <a
            href={google.mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="profile-hero__reviews-google"
            aria-label="Open Google reviews for this specialist"
            onClick={(event) => event.stopPropagation()}
          >
            {googleRow}
          </a>
        ) : (
          <div
            className="profile-hero__reviews-google profile-hero__reviews-google--muted"
            aria-label="Google Reviews not connected yet"
          >
            {googleRow}
          </div>
        )}
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
