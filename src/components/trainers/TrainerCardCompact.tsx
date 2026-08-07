"use client";

import type { Trainer } from "@/types";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardDetails } from "@/components/trainers/TrainerCardDetails";
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
      <TrainerCardDetails
        trainer={trainer}
        className="trainer-card-compact__body"
        nameClassName="trainer-card-compact__name"
        professionClassName="trainer-card-compact__profession"
        locationClassName="trainer-card-compact__location"
        distanceClassName="trainer-card-compact__distance"
        footerClassName="trainer-card-compact__footer"
        ratingClassName="trainer-card-compact__smoac-stars"
        priceClassName="trainer-card-compact__price"
      />
    </article>
  );
}
