import type { Review } from "@/types";
import { formatTrainerRating } from "@/lib/utils";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ReviewsProps {
  reviews: Review[];
  rating: number;
  reviewCount: number;
}

export function Reviews({ reviews, rating, reviewCount }: ReviewsProps) {
  const ratingSummary = (
    <div className="flex shrink-0 items-center gap-1.5 text-sm">
      <span className="text-white">★</span>
      <span className="font-medium text-white">{formatTrainerRating(rating)}</span>
      <span className="text-silver-400">({reviewCount})</span>
    </div>
  );

  return (
    <ProfileSection variant="panel" aria-label="Reviews">
      <ProfileSectionHeader title="Reviews" trailing={ratingSummary} />
      <ul className="profile-section-body profile-section-body--loose">
        {reviews.map((review) => (
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
            <p className="profile-body-text mt-3 text-sm">
              {review.text}
            </p>
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
    </ProfileSection>
  );
}
