import { resolveTrainerReviewDisplay } from "@/lib/trainer-reviews";
import { formatTrainerRating } from "@/lib/utils";
import type { Trainer } from "@/types";

interface ProfileReviewMetaProps {
  trainer: Trainer;
}

export function ProfileReviewMeta({ trainer }: ProfileReviewMetaProps) {
  const { total, sourceLabels } = resolveTrainerReviewDisplay(trainer);

  return (
    <div className="profile-hero__reviews shrink-0">
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
    </div>
  );
}
