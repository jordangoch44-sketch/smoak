"use client";

import type { Trainer } from "@/types";
import { TrainerCardDetails } from "@/components/trainers/TrainerCardDetails";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { cn } from "@/lib/utils";

interface TrainerCardGridProps {
  trainer: Trainer;
  priority?: boolean;
  sponsored?: boolean;
}

/** Vertical premium card — visible from md (768px) and above only. */
export function TrainerCardGrid({
  trainer,
  priority = false,
  sponsored = false,
}: TrainerCardGridProps) {
  return (
    <article
      className={cn(
        "trainer-card-grid hidden md:flex",
        sponsored && "smoac-sponsored-ring"
      )}
    >
      <div className="trainer-card-grid__media">
        <TrainerThumbnail
          src={trainer.image}
          name={trainer.name}
          size="card"
          priority={priority}
          className="trainer-card-grid__thumb"
          imageClassName="trainer-card-grid__thumb-img"
        />
        <div className="trainer-card-grid__scrim" aria-hidden />
      </div>
      <TrainerCardDetails
        trainer={trainer}
        className="trainer-card-grid__body"
        nameClassName="trainer-card-grid__name"
        professionClassName="trainer-card-grid__profession"
        locationClassName="trainer-card-grid__location"
        distanceClassName="trainer-card-grid__distance"
        ratingClassName="trainer-card-grid__smoac-stars"
        priceClassName="trainer-card-grid__price"
        metaLayout="stack"
      />
    </article>
  );
}
