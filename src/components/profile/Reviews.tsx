import type { Review } from "@/types";
import { formatTrainerRating } from "@/lib/utils";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ReviewsProps {
  reviews: Review[];
  rating: number;
  reviewCount: number;
  className?: string;
  /** When set, labels this block as Google Reviews (separate from SMOAC). */
  sourceLabel?: "google" | "general";
}

export function Reviews({
  reviews,
  rating,
  reviewCount,
  className,
  sourceLabel = "general",
}: ReviewsProps) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const isGoogle = sourceLabel === "google";
  const title = isGoogle ? "Google Reviews" : "Reviews";
  const ariaLabel = isGoogle ? "Google Reviews" : "Reviews";
  const safeCount = Math.max(0, reviewCount);
  const safeRating = safeCount > 0 ? rating : 0;

  const ratingSummary = (
    <div className="flex shrink-0 items-center gap-1.5 text-sm">
      <span className="text-white">★</span>
      <span className="font-medium text-white">
        {safeCount > 0 ? formatTrainerRating(safeRating) : "—"}
      </span>
      <span className="text-silver-400">({safeCount})</span>
    </div>
  );

  return (
    <ProfileSection
      variant="panel"
      className={className}
      aria-label={ariaLabel}
    >
      <ProfileSectionHeader title={title} trailing={ratingSummary} />
      {safeReviews.length > 0 ? (
        <ul className="profile-section-body profile-section-body--loose">
          {safeReviews.map((review) => (
            <li key={review.id} className="profile-review-item">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-white">{review.author}</span>
                <div className="flex gap-0.5 text-[11px]">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={
                        i < review.rating ? "text-white" : "text-white/20"
                      }
                      aria-hidden
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <p className="profile-body-text mt-3 text-sm">{review.text}</p>
              <time className="mt-3 block text-xs text-silver-500">
                {new Date(review.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="smoac-reviews-empty profile-google-reviews-empty">
          {isGoogle
            ? "No Google reviews connected yet."
            : "No reviews yet."}
        </p>
      )}
    </ProfileSection>
  );
}
