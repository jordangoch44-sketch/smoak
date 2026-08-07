"use client";

import {
  type SpecialistReview,
  type SpecialistReviewAggregate,
} from "@/lib/reviews/specialist-review-types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { WriteSpecialistReviewModal } from "./WriteSpecialistReviewModal";

interface SmoacReviewsSectionProps {
  specialistId: string;
  specialistName: string;
  aggregate: SpecialistReviewAggregate;
  reviews: SpecialistReview[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  reviewModalOpen: boolean;
  onReviewModalOpenChange: (open: boolean) => void;
  onSubmitted: (review: SpecialistReview) => void;
  canLeaveReview?: boolean;
  scrollToOwnReview?: boolean;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="smoac-review-item__stars" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span
          key={value}
          className={
            value <= rating
              ? "smoac-review-item__star smoac-review-item__star--on"
              : "smoac-review-item__star"
          }
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function SmoacReviewsSection({
  specialistId,
  specialistName,
  reviews,
  hasMore,
  loadingMore,
  onLoadMore,
  reviewModalOpen,
  onReviewModalOpenChange,
  onSubmitted,
  canLeaveReview = false,
}: SmoacReviewsSectionProps) {
  const firstName = specialistName.trim().split(/\s+/)[0] || specialistName;

  return (
    <>
      <ProfileSection
        id="smoac-reviews"
        variant="panel"
        className="profile-section--smoac-reviews"
        aria-label="SMOAC Reviews"
      >
        <ProfileSectionHeader title="SMOAC Reviews" />

        {canLeaveReview ? (
          <button
            type="button"
            className="smoac-leave-review-btn"
            onClick={() => onReviewModalOpenChange(true)}
          >
            Trained with {firstName}? Leave a review
          </button>
        ) : null}

        {reviews.length > 0 ? (
          <ul className="profile-section-body profile-section-body--loose smoac-reviews-list">
            {reviews.map((review) => (
              <li
                key={review.id}
                id={`smoac-review-${review.id}`}
                className="profile-review-item smoac-review-item"
              >
                <div className="smoac-review-item__top">
                  <StarRow rating={review.rating} />
                  <span className="smoac-review-item__author">
                    {review.authorDisplayName}
                  </span>
                </div>
                <p className="profile-body-text mt-3 text-sm">
                  &ldquo;{review.reviewText}&rdquo;
                </p>
                <time className="mt-3 block text-xs text-silver-500">
                  {new Date(review.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="smoac-reviews-empty">
            No SMOAC reviews yet. Be the first to share your experience.
          </p>
        )}

        {hasMore ? (
          <button
            type="button"
            className="smoac-control smoac-reviews-view-all"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? "Loading…" : "View all SMOAK reviews"}
          </button>
        ) : null}
      </ProfileSection>

      <WriteSpecialistReviewModal
        open={reviewModalOpen}
        onClose={() => onReviewModalOpenChange(false)}
        specialistId={specialistId}
        specialistName={specialistName}
        onSubmitted={onSubmitted}
      />
    </>
  );
}
