"use client";

import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { DevTrainerDistance } from "@/components/trainers/DevTrainerDistance";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { SpecialtyChips } from "@/components/trainers/SpecialtyChips";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import {
  formatTrainerPriceLabel,
  formatTrainerRatingLabel,
} from "@/lib/home-discovery";
import type { Trainer } from "@/types";

interface SponsoredSpecialistCardProps {
  trainer: Trainer;
  priority?: boolean;
  /** When false, hides the Sponsored chip (organic fillers in profile rails) */
  showSponsoredBadge?: boolean;
}

export function SponsoredSpecialistCard({
  trainer,
  priority = false,
  showSponsoredBadge = true,
}: SponsoredSpecialistCardProps) {
  const href = `/trainers/${trainer.id}`;
  const sponsored =
    showSponsoredBadge && (trainer.sponsored || trainer.featured);

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
            {sponsored ? (
              <span className="home-sponsored-card__sponsored">Sponsored</span>
            ) : null}
          </div>
        </TapLink>

        <div className="home-sponsored-card__body">
          <TapLink href={href} className="home-sponsored-card__identity">
            <h3 className="home-sponsored-card__name">{trainer.name}</h3>
            <p className="home-sponsored-card__profession">
              {trainer.profession}
            </p>
            <LocationLabel
              provider={trainer}
              className="home-sponsored-card__location"
            />
            <DevTrainerDistance
              trainer={trainer}
              className="home-sponsored-card__distance"
            />
          </TapLink>

          <SpecialtyChips
            specialties={trainer.specialty}
            className="home-sponsored-card__chips specialty-chips--row"
          />

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
