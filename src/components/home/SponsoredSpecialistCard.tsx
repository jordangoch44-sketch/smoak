"use client";

import { useRouter } from "next/navigation";
import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardDetails } from "@/components/trainers/TrainerCardDetails";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { TrainerVerifiedCheck } from "@/components/trainers/TrainerVerifiedCheck";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
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
  badgeLabel,
  impressionSurface = "home_sponsored",
}: SponsoredSpecialistCardProps) {
  const router = useRouter();
  const href = `/trainers/${trainer.id}`;
  const chip = badgeLabel?.trim() || null;

  function warm() {
    warmTrainerProfileNavigation(trainer, router);
  }

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
          onPointerDown={warm}
          onClick={warm}
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
            <div className="home-sponsored-card__top-left">
              <TrainerVerifiedCheck trainer={trainer} />
              {chip ? (
                <span className="home-sponsored-card__sponsored">{chip}</span>
              ) : null}
            </div>
          </div>
        </TapLink>

        <div className="home-sponsored-card__body">
          <TapLink
            href={href}
            className="home-sponsored-card__identity"
            onPointerDown={warm}
            onClick={warm}
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
            onPointerDown={warm}
            onClick={warm}
          >
            View Profile
          </TapLink>
        </div>
      </article>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
