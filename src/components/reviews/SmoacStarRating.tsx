"use client";

import { formatTrainerRating } from "@/lib/utils";
import { cn } from "@/lib/utils";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoacStarRatingSummary(
  reviewCount: number,
  avgRating: number | null
): string {
  const countLabel =
    reviewCount === 1 ? "(1) review" : `(${reviewCount}) reviews`;
  if (reviewCount > 0 && avgRating != null) {
    return `${formatTrainerRating(avgRating)} average from ${countLabel}`;
  }
  return "0 reviews on SMOAC";
}

interface SmoacStarRatingProps {
  reviewCount: number;
  avgRating: number | null;
  /** Visual density — card is slightly smaller than profile hero */
  size?: "hero" | "card";
  className?: string;
  /** Optional leave-review action (profile sheet only — never on cards) */
  onLeaveReview?: () => void;
}

/**
 * Read-only SMOAC ★ display by default.
 * Dimmed at 0 reviews; yellow fill tracks live average.
 * Pass `onLeaveReview` only on the profile sheet.
 */
export function SmoacStarRating({
  reviewCount,
  avgRating,
  size = "hero",
  className,
  onLeaveReview,
}: SmoacStarRatingProps) {
  const fill =
    reviewCount > 0 && avgRating != null
      ? Math.min(5, Math.max(0, avgRating))
      : 0;
  const countLabel =
    reviewCount === 1 ? "(1) review" : `(${reviewCount}) reviews`;
  const summary = smoacStarRatingSummary(reviewCount, avgRating);

  const body = (
    <>
      <span className="smoac-star-rating__row" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => {
          const portion = clamp01(fill - index);
          return (
            <span key={index} className="smoac-star-rating__star">
              <span className="smoac-star-rating__star-dim">★</span>
              {portion > 0 ? (
                <span
                  className="smoac-star-rating__star-fill"
                  style={{ width: `${portion * 100}%` }}
                >
                  ★
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
      <span className="smoac-star-rating__count">{countLabel}</span>
    </>
  );

  const classes = cn(
    "smoac-star-rating",
    size === "card" && "smoac-star-rating--card",
    onLeaveReview && "smoac-star-rating--action",
    className
  );

  if (onLeaveReview) {
    return (
      <button
        type="button"
        className={cn("smoac-control", classes)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onLeaveReview();
        }}
        aria-label={`Leave a review. ${summary}`}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={classes} aria-label={summary}>
      {body}
    </div>
  );
}
