"use client";

import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import {
  formatTrainerPriceLabel,
  formatTrainerRatingLabel,
} from "@/lib/home-discovery";
import type { Trainer } from "@/types";

interface SponsoredSpecialistCardProps {
  trainer: Trainer;
  priority?: boolean;
}

export function SponsoredSpecialistCard({
  trainer,
  priority = false,
}: SponsoredSpecialistCardProps) {
  const href = `/trainers/${trainer.id}`;

  return (
    <div className="home-sponsored-card" role="listitem">
      <article className="home-sponsored-card__article">
        <TapLink href={href} className="home-sponsored-card__media-link">
          <div className="home-sponsored-card__media">
            <TrainerThumbnail
              src={trainer.image}
              name={trainer.name}
              size="card"
              priority={priority}
              className="home-sponsored-card__thumb"
              imageClassName="home-sponsored-card__thumb-img"
            />
            <div className="home-sponsored-card__media-scrim" aria-hidden />
            <span className="home-sponsored-card__sponsored">Sponsored</span>
          </div>
        </TapLink>

        <div className="home-sponsored-card__body">
          <TapLink href={href} className="home-sponsored-card__identity">
            <h3 className="home-sponsored-card__name">{trainer.name}</h3>
            <p className="home-sponsored-card__profession">
              {trainer.profession}
            </p>
          </TapLink>

          <div className="home-sponsored-card__meta">
            <span className="home-sponsored-card__rating">
              <span aria-hidden>★</span> {formatTrainerRatingLabel(trainer)}
            </span>
            <span className="home-sponsored-card__price">
              {formatTrainerPriceLabel(trainer.pricePerSession)}
            </span>
          </div>

          <TapLink href={href} className="home-sponsored-card__cta">
            View Profile
          </TapLink>
        </div>
      </article>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
