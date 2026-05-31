import type { Trainer } from "@/types";
import { DevTrainerDistance } from "@/components/trainers/DevTrainerDistance";
import { formatProviderLocation } from "@/lib/provider-location";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { formatTrainerRating } from "@/lib/utils";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { cn } from "@/lib/utils";

export type TrainerCardCompactLayout = "default" | "featured";

interface TrainerCardCompactProps {
  trainer: Trainer;
  priority?: boolean;
  layout?: TrainerCardCompactLayout;
}

const MAX_VISIBLE_SPECIALTIES = 2;

/** Horizontal list row — visible only below md (768px). */
export function TrainerCardCompact({
  trainer,
  priority = false,
  layout = "default",
}: TrainerCardCompactProps) {
  const visibleTags = trainer.specialty.slice(0, MAX_VISIBLE_SPECIALTIES);
  const extraCount = Math.max(
    0,
    trainer.specialty.length - MAX_VISIBLE_SPECIALTIES
  );

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
          <p className="trainer-card-compact__location">
            {formatProviderLocation(trainer)}
          </p>
          <DevTrainerDistance
            trainer={trainer}
            className="trainer-card-compact__distance"
          />
        </div>

        {(visibleTags.length > 0 || extraCount > 0) && (
          <div className="trainer-card-compact__chips">
            {visibleTags.map((tag) => (
              <span key={tag} className="trainer-card-compact__chip">
                {tag}
              </span>
            ))}
            {extraCount > 0 ? (
              <span className="trainer-card-compact__chip-more">
                +{extraCount} more
              </span>
            ) : null}
          </div>
        )}

        <div className="trainer-card-compact__footer">
          <div className="trainer-card-compact__rating">
            <span className="trainer-card-compact__rating-star" aria-hidden>
              ★
            </span>
            <span>{formatTrainerRating(trainer.rating)}</span>
            <span className="trainer-card-compact__rating-count">
              ({trainer.reviewCount})
            </span>
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
