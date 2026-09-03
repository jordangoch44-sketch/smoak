"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  formatReviewRelativeTime,
  type SpecialistReview,
  type SpecialistReviewAggregate,
  type SpecialistReviewSort,
} from "@/lib/reviews/specialist-review-types";
import { cn, getInitials } from "@/lib/utils";
import { WriteSpecialistReviewModal } from "./WriteSpecialistReviewModal";

interface SmoacReviewsSectionProps {
  specialistId: string;
  specialistName: string;
  aggregate: SpecialistReviewAggregate;
  reviews: SpecialistReview[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  sort?: SpecialistReviewSort;
  onSortChange?: (sort: SpecialistReviewSort) => void;
  reviewModalOpen: boolean;
  onReviewModalOpenChange: (open: boolean) => void;
  onSubmitted: (review: SpecialistReview) => void;
  canLeaveReview?: boolean;
  scrollToOwnReview?: boolean;
}

const SORT_OPTIONS: { id: SpecialistReviewSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "highest", label: "Highest" },
  { id: "lowest", label: "Lowest" },
];

const AVATAR_COLORS = [
  "#1e8e3e",
  "#e37400",
  "#1a73e8",
  "#c5221f",
  "#9334e6",
  "#007b83",
  "#188038",
  "#d93025",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function avatarLetter(name: string): string {
  const initials = getInitials(name);
  return (initials[0] || "S").toUpperCase();
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="smoac-review-card__stars" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span
          key={value}
          className={
            value <= rating
              ? "smoac-review-card__star smoac-review-card__star--on"
              : "smoac-review-card__star"
          }
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewBody({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div className="smoac-review-card__body">
      <p
        ref={ref}
        className={cn(
          "smoac-review-card__text",
          !expanded && "smoac-review-card__text--clamp"
        )}
      >
        {text}
      </p>
      {overflows && !expanded ? (
        <button
          type="button"
          className="smoac-control smoac-review-card__more"
          onClick={() => setExpanded(true)}
        >
          More
        </button>
      ) : null}
    </div>
  );
}

function SmoacReviewCard({ review }: { review: SpecialistReview }) {
  const letter = avatarLetter(review.authorDisplayName);
  const relative = formatReviewRelativeTime(review.createdAt);
  const absolute = new Date(review.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <li id={`smoac-review-${review.id}`} className="smoac-review-card">
      <div className="smoac-review-card__head">
        <span
          className="smoac-review-card__avatar"
          style={{ backgroundColor: avatarColor(review.authorDisplayName) }}
          aria-hidden
        >
          {letter}
        </span>
        <div className="smoac-review-card__who">
          <p className="smoac-review-card__name">{review.authorDisplayName}</p>
          <p className="smoac-review-card__meta">SMOAC client</p>
        </div>
      </div>
      <div className="smoac-review-card__rating">
        <StarRow rating={review.rating} />
        <time className="smoac-review-card__when" dateTime={review.createdAt} title={absolute}>
          {relative}
        </time>
      </div>
      <ReviewBody text={review.reviewText} />
    </li>
  );
}

export function SmoacReviewsSection({
  specialistId,
  specialistName,
  reviews,
  hasMore,
  loadingMore,
  onLoadMore,
  sort = "newest",
  onSortChange,
  reviewModalOpen,
  onReviewModalOpenChange,
  onSubmitted,
  canLeaveReview = false,
}: SmoacReviewsSectionProps) {
  const sortId = useId();
  const firstName = specialistName.trim().split(/\s+/)[0] || specialistName;
  const showSort = reviews.length > 0 && Boolean(onSortChange);

  return (
    <>
      <section
        id="smoac-reviews"
        className="smoac-reviews-feed"
        aria-label="SMOAC Reviews"
      >
        {canLeaveReview ? (
          <button
            type="button"
            className="smoac-leave-review-btn"
            onClick={() => onReviewModalOpenChange(true)}
          >
            Trained with {firstName}? Leave a review
          </button>
        ) : null}

        {showSort ? (
          <div className="smoac-reviews-sort">
            <p className="smoac-reviews-sort__label" id={sortId}>
              Sort by
            </p>
            <div className="smoac-reviews-sort__chips" role="group" aria-labelledby={sortId}>
              {SORT_OPTIONS.map((option) => {
                const selected = sort === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      "smoac-control smoac-reviews-sort__chip",
                      selected && "smoac-reviews-sort__chip--active"
                    )}
                    onClick={() => onSortChange?.(option.id)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {reviews.length > 0 ? (
          <ul className="smoac-reviews-feed__list">
            {reviews.map((review) => (
              <SmoacReviewCard key={review.id} review={review} />
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
            {loadingMore ? "Loading…" : "More reviews"}
          </button>
        ) : null}
      </section>

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
