import { resolveTrainerReviewDisplay } from "@/lib/trainer-reviews";
import type { Trainer } from "@/types";

interface ProfileReviewMetaProps {
  trainer: Trainer;
}

export function ProfileReviewMeta({ trainer }: ProfileReviewMetaProps) {
  const { total, breakdown } = resolveTrainerReviewDisplay(trainer);

  return (
    <div className="profile-hero__reviews shrink-0">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-white">★</span>
        <span className="font-medium text-white">{trainer.rating}</span>
      </div>
      <p className="profile-hero__reviews-total">
        {total} total review{total === 1 ? "" : "s"}
      </p>
      {breakdown ? (
        <p className="profile-hero__reviews-breakdown">{breakdown}</p>
      ) : null}
    </div>
  );
}
