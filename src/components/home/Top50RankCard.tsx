"use client";

import { useRouter } from "next/navigation";
import { TapLink } from "@/components/ui/TapLink";
import type { Trainer } from "@/types";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardDetails } from "@/components/trainers/TrainerCardDetails";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { TrainerVerifiedCheck } from "@/components/trainers/TrainerVerifiedCheck";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
import { cn } from "@/lib/utils";

interface Top50RankCardProps {
  rank: number;
  trainer: Trainer;
  priority?: boolean;
  /** SMOAC review average — preferred over catalog/Google ★ */
  smoacRating?: number;
  smoacReviewCount?: number;
}

export function Top50RankCard({
  rank,
  trainer,
  priority = false,
  smoacRating,
  smoacReviewCount,
}: Top50RankCardProps) {
  const router = useRouter();
  const href = `/trainers/${trainer.id}`;
  const isPodium = rank <= 3;

  function warm() {
    warmTrainerProfileNavigation(trainer, router);
  }

  return (
    <div
      className={cn(
        "top50-card relative",
        isPodium && "top50-card--podium",
        rank === 1 && "top50-card--first"
      )}
      role="listitem"
    >
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface="home_top50"
      />
      <TapLink
        href={href}
        className="top50-card__link"
        onPointerDown={warm}
        onClick={warm}
      >
        <article className="top50-card__article">
          <div className="top50-card__rank" aria-label={`Rank ${rank}`}>
            <span className="top50-card__rank-hash">#</span>
            <span className="top50-card__rank-num">{rank}</span>
          </div>

          <div className="top50-card__media">
            <TrainerThumbnail
              src={trainer.image}
              name={trainer.name}
              size="card"
              priority={priority}
              className="top50-card__thumb"
              imageClassName="top50-card__thumb-img"
            />
            <div className="top50-card__media-scrim" aria-hidden />
            <TrainerVerifiedCheck
              trainer={trainer}
              className="top50-card__verified"
            />
          </div>

          <div className="top50-card__body">
            <TrainerCardDetails
              trainer={trainer}
              nameClassName="top50-card__name"
              professionClassName="top50-card__profession"
              locationClassName="top50-card__location"
              distanceClassName="top50-card__distance"
              footerClassName="top50-card__footer"
              ratingClassName="top50-card__smoac-stars"
              priceClassName="top50-card__price"
              avgRating={smoacRating}
              reviewCount={smoacReviewCount}
              metaLayout="inline"
            />
          </div>
        </article>
      </TapLink>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
