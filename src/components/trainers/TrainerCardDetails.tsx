"use client";

import type { Trainer } from "@/types";
import { TrainerDistanceLabel } from "@/components/trainers/TrainerDistanceLabel";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { TrainerCardSmoacRating } from "@/components/trainers/TrainerCardSmoacRating";
import { TrainerProfessionLabel } from "@/components/trainers/TrainerProfessionLabel";
import { formatTrainerPriceLabel } from "@/lib/home-discovery";
import { cn } from "@/lib/utils";

export type TrainerCardMetaLayout = "stack" | "inline";

/**
 * Listing-card copy stack:
 * Name → category → location → distance → reviews → price
 * `inline` keeps reviews · price on one bottom row (portrait / sponsored rails).
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
    <span className={cn("trainer-card-details__price", priceClassName)}>
      {formatTrainerPriceLabel(trainer.pricePerSession)}
    </span>
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
