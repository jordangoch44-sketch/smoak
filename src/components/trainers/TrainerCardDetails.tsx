"use client";

import type { Trainer } from "@/types";
import { TrainerDistanceLabel } from "@/components/trainers/TrainerDistanceLabel";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { TrainerCardSmoacRating } from "@/components/trainers/TrainerCardSmoacRating";
import { TrainerProfessionLabel } from "@/components/trainers/TrainerProfessionLabel";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { cn } from "@/lib/utils";

export type TrainerCardMetaLayout = "stack" | "inline";

/**
 * Listing-card copy stack:
 * Name → category → location → distance → reviews → price
 * `inline` stacks reviews above price on portrait rails so they never overlap.
 */
export function TrainerCardDetails({
  trainer,
  className,
  nameClassName,
  professionClassName,
  locationClassName,
  distanceClassName,
  footerClassName,
  ratingClassName,
  priceClassName,
  avgRating,
  reviewCount,
  metaLayout = "stack",
}: {
  trainer: Trainer;
  className?: string;
  nameClassName?: string;
  professionClassName?: string;
  locationClassName?: string;
  distanceClassName?: string;
  footerClassName?: string;
  ratingClassName?: string;
  priceClassName?: string;
  avgRating?: number | null;
  reviewCount?: number;
  metaLayout?: TrainerCardMetaLayout;
}) {
  const rating = (
    <TrainerCardSmoacRating
      trainerId={trainer.id}
      className={cn("trainer-card-details__rating", ratingClassName)}
      avgRating={avgRating}
      reviewCount={reviewCount}
    />
  );
  const price = (
    <SessionPrice
      amount={trainer.pricePerSession}
      variant={metaLayout === "inline" ? "compact" : "grid"}
      className={cn("trainer-card-details__price", priceClassName)}
    />
  );

  return (
    <div
      className={cn(
        "trainer-card-details",
        metaLayout === "stack" && "trainer-card-details--stack",
        metaLayout === "inline" && "trainer-card-details--inline",
        className
      )}
    >
      <h3 className={cn("trainer-card-details__name", nameClassName)}>
        {trainer.name}
      </h3>
      <TrainerProfessionLabel
        trainer={trainer}
        className={cn("trainer-card-details__profession", professionClassName)}
      />
      <LocationLabel
        provider={trainer}
        className={cn("trainer-card-details__location", locationClassName)}
      />
      <TrainerDistanceLabel
        trainer={trainer}
        className={cn("trainer-card-details__distance", distanceClassName)}
      />
      {metaLayout === "stack" ? (
        <>
          {rating}
          {price}
        </>
      ) : (
        <div className={cn("trainer-card-details__footer", footerClassName)}>
          {rating}
          {price}
        </div>
      )}
    </div>
  );
}
