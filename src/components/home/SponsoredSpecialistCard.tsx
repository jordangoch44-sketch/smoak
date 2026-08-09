"use client";

import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardDetails } from "@/components/trainers/TrainerCardDetails";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
import { openOptimisticProfileSheet } from "@/lib/primed-trainer-profile";
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
        <TapLink
          href={href}
          className="home-sponsored-card__media-link"
          onClick={() => openOptimisticProfileSheet(trainer)}
        >
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
          <TapLink
            href={href}
            className="home-sponsored-card__identity"
            onClick={() => openOptimisticProfileSheet(trainer)}
          >
            <TrainerCardDetails
              trainer={trainer}
              nameClassName="home-sponsored-card__name"
              professionClassName="home-sponsored-card__profession"
              locationClassName="home-sponsored-card__location"
              distanceClassName="home-sponsored-card__distance"
              footerClassName="home-sponsored-card__meta"
              ratingClassName="home-sponsored-card__smoac-stars"
              priceClassName="home-sponsored-card__price"
              metaLayout="inline"
            />
          </TapLink>

          <TapLink
            href={href}
            className="home-sponsored-card__cta"
            onClick={() => openOptimisticProfileSheet(trainer)}
          >
            View Profile
          </TapLink>
        </div>
      </article>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
