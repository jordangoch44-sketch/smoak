"use client";

import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { DevTrainerDistance } from "@/components/trainers/DevTrainerDistance";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { SpecialtyChips } from "@/components/trainers/SpecialtyChips";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
import {
  formatTrainerPriceLabel,
  formatTrainerRatingLabel,
} from "@/lib/home-discovery";
import { getHomepageFeaturedSpecialties } from "@/lib/specialty-display";
import type { SpecialistEngagementSurface } from "@/lib/specialist-engagement-tracking";
import type { Trainer } from "@/types";

interface SponsoredSpecialistCardProps {
  trainer: Trainer;
  priority?: boolean;
  /** When false, hides the placement chip (organic fillers in profile rails) */
  showSponsoredBadge?: boolean;
  /** Override chip label — Sponsored / Featured / Boosted / Category spotlight */
  badgeLabel?: string;
  impressionSurface?: SpecialistEngagementSurface;
}

export function SponsoredSpecialistCard({
  trainer,
  priority = false,
  showSponsoredBadge = true,
  badgeLabel,
  impressionSurface = "home_sponsored",
}: SponsoredSpecialistCardProps) {
  const href = `/trainers/${trainer.id}`;
  const chip =
    badgeLabel ??
    (showSponsoredBadge && trainer.sponsored === true ? "Sponsored" : null);

  return (
    <div className="home-sponsored-card relative" role="listitem">
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface={impressionSurface}
      />
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
            {chip ? (
              <span className="home-sponsored-card__sponsored">{chip}</span>
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
            specialties={getHomepageFeaturedSpecialties(trainer)}
            maxVisible={2}
            className="home-sponsored-card__chips specialty-chips--row"
          />

          <div className="home-sponsored-card__meta">
            <span className="home-sponsored-card__rating">
              {trainer.reviewCount > 0 ? (
                <>
                  <span aria-hidden>★</span> {formatTrainerRatingLabel(trainer)}
                </>
              ) : (
                formatTrainerRatingLabel(trainer)
              )}
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
