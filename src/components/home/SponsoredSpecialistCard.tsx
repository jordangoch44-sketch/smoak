"use client";

import { ProfileSheetLink } from "@/components/trainers/ProfileSheetLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardDetails } from "@/components/trainers/TrainerCardDetails";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { TrainerVerifiedCheck } from "@/components/trainers/TrainerVerifiedCheck";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
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
  /**
   * Profile-sheet picks: swap the current specialist (replace + no prefetch)
   * so X / back still returns to Explore / Home / Saved.
   */
  replaceCurrentProfile?: boolean;
}

export function SponsoredSpecialistCard({
  trainer,
  priority = false,
  badgeLabel,
  impressionSurface = "home_sponsored",
  replaceCurrentProfile = false,
}: SponsoredSpecialistCardProps) {
  const chip = badgeLabel?.trim() || null;

  return (
    <div className="home-sponsored-card relative" role="listitem">
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface={impressionSurface}
      />
      <ProfileSheetLink
        trainer={trainer}
        replace={replaceCurrentProfile}
        prefetch={replaceCurrentProfile ? false : undefined}
        className="home-sponsored-card__link"
      >
        <article className="home-sponsored-card__article">
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
            <div className="home-sponsored-card__top-left">
              <TrainerVerifiedCheck trainer={trainer} />
              {chip ? (
                <span className="home-sponsored-card__sponsored">{chip}</span>
              ) : null}
            </div>
          </div>

          <div className="home-sponsored-card__body">
            <div className="home-sponsored-card__identity">
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
            </div>
            <span className="home-sponsored-card__cta">View Profile</span>
          </div>
        </article>
      </ProfileSheetLink>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
