"use client";

import type { Trainer } from "@/types";
import { TrainerDistanceLabel } from "@/components/trainers/TrainerDistanceLabel";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { TrainerCardSmoacRating } from "@/components/trainers/TrainerCardSmoacRating";
import { TrainerProfessionLabel } from "@/components/trainers/TrainerProfessionLabel";
import { formatTrainerPriceLabel } from "@/lib/home-discovery";
import { cn } from "@/lib/utils";

/**
 * Canonical listing-card copy stack (matches New Specialists):
 * Name → category → location → distance → ★ reviews · From $
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
}) {
  return (
    <div className={cn("trainer-card-details", className)}>
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
      <div className={cn("trainer-card-details__footer", footerClassName)}>
        <TrainerCardSmoacRating
          trainerId={trainer.id}
          className={cn("trainer-card-details__rating", ratingClassName)}
          avgRating={avgRating}
          reviewCount={reviewCount}
        />
        <span className={cn("trainer-card-details__price", priceClassName)}>
          {formatTrainerPriceLabel(trainer.pricePerSession)}
        </span>
      </div>
    </div>
  );
}
