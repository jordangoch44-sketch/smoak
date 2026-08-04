import type { Trainer } from "@/types";
import { TrainerDistanceLabel } from "@/components/trainers/TrainerDistanceLabel";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { SpecialtyChips } from "@/components/trainers/SpecialtyChips";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { formatTrainerRatingLabel } from "@/lib/home-discovery";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { cn } from "@/lib/utils";

export type TrainerCardCompactLayout = "default" | "featured";

interface TrainerCardCompactProps {
  trainer: Trainer;
  priority?: boolean;
  layout?: TrainerCardCompactLayout;
}

/** Horizontal list row — visible only below md (768px). */
export function TrainerCardCompact({
  trainer,
  priority = false,
  layout = "default",
}: TrainerCardCompactProps) {
  const hasReviews = trainer.reviewCount > 0;

  return (
    <article
      className={cn(
        "trainer-card-compact md:hidden",
        layout === "featured" && "trainer-card-compact--featured"
      )}
    >
      <TrainerThumbnail
        src={trainer.image}
        name={trainer.name}
        size="compact"
        priority={priority}
        className="trainer-card-compact__media"
      />
      <div className="trainer-card-compact__body">
        <div className="trainer-card-compact__meta">
          <h3 className="trainer-card-compact__name">{trainer.name}</h3>
          <p className="trainer-card-compact__profession">{trainer.profession}</p>
          <LocationLabel
            provider={trainer}
            className="trainer-card-compact__location"
          />
          <TrainerDistanceLabel
            trainer={trainer}
            className="trainer-card-compact__distance"
          />
        </div>

        <SpecialtyChips
          specialties={trainer.specialty}
          className="trainer-card-compact__chips specialty-chips--row"
        />

        <div className="trainer-card-compact__footer">
          <div className="trainer-card-compact__rating">
            {hasReviews ? (
              <>
                <span className="trainer-card-compact__rating-star" aria-hidden>
                  ★
                </span>
                <span>{formatTrainerRatingLabel(trainer)}</span>
                <span className="trainer-card-compact__rating-count">
                  ({trainer.reviewCount})
                </span>
              </>
            ) : (
              <span>New on SMOAC</span>
            )}
          </div>
          <SessionPrice
            amount={trainer.pricePerSession}
            variant="compact"
            className="trainer-card-compact__price"
          />
        </div>
      </div>
    </article>
  );
}
