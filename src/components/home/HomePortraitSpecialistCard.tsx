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

interface HomePortraitSpecialistCardProps {
  trainer: Trainer;
  priority?: boolean;
  impressionSurface: SpecialistEngagementSurface;
  badgeLabel?: string | null;
  avgRating?: number | null;
  reviewCount?: number;
}

/** Shared marketplace portrait card — New, Featured, Sponsored, Top rated rails. */
export function HomePortraitSpecialistCard({
  trainer,
  priority = false,
  impressionSurface,
  badgeLabel = null,
  avgRating,
  reviewCount,
}: HomePortraitSpecialistCardProps) {
  const router = useRouter();
  const href = `/trainers/${trainer.id}`;

  function warm() {
    warmTrainerProfileNavigation(trainer, router);
  }

  return (
    <div className="home-portrait-card relative" role="listitem">
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface={impressionSurface}
      />
      <TapLink
        href={href}
        className="home-portrait-card__link"
        onPointerDown={warm}
        onClick={warm}
      >
        <article className="home-portrait-card__article">
          <div className="home-portrait-card__media">
            <TrainerThumbnail
              src={trainer.image}
              name={trainer.name}
              size="card"
              priority={priority}
              className="home-portrait-card__thumb"
              imageClassName="home-portrait-card__thumb-img"
            />
            <div className="home-portrait-card__scrim" aria-hidden />
            <div className="home-portrait-card__badges">
              <TrainerVerifiedCheck
                trainer={trainer}
                className="home-portrait-card__verified"
              />
              {badgeLabel ? (
                <span className="home-portrait-card__chip">{badgeLabel}</span>
              ) : null}
            </div>
          </div>
          <div className="home-portrait-card__body">
            <TrainerCardDetails
              trainer={trainer}
              avgRating={avgRating}
              reviewCount={reviewCount}
              nameClassName="home-portrait-card__name"
              professionClassName="home-portrait-card__profession"
              locationClassName="home-portrait-card__location"
              distanceClassName="home-portrait-card__distance"
              footerClassName="home-portrait-card__meta"
              metaLayout="inline"
            />
          </div>
        </article>
      </TapLink>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
