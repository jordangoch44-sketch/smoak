"use client";

import { TapLink } from "@/components/ui/TapLink";
import type { Trainer } from "@/types";
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
import { cn } from "@/lib/utils";

interface Top50RankCardProps {
  rank: number;
  trainer: Trainer;
  showTopRatedBadge?: boolean;
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
  const href = `/trainers/${trainer.id}`;
  const isPodium = rank <= 3;
  const ratingLabel =
    smoacRating != null && smoacRating > 0
      ? `${smoacRating.toFixed(1)}${
          smoacReviewCount != null ? ` (${smoacReviewCount})` : ""
        }`
      : formatTrainerRatingLabel(trainer);

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
      <TapLink href={href} className="top50-card__link">
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
          </div>

          <div className="top50-card__body">
            <h3 className="top50-card__name">{trainer.name}</h3>
            <p className="top50-card__profession">{trainer.profession}</p>
            <LocationLabel
              provider={trainer}
              className="top50-card__location"
            />
            <DevTrainerDistance
              trainer={trainer}
              className="top50-card__distance"
            />
            <SpecialtyChips
              specialties={trainer.specialty}
              className="top50-card__chips specialty-chips--row"
            />
            <div className="top50-card__footer">
              <div className="top50-card__rating">
                <span className="top50-card__star" aria-hidden>
                  ★
                </span>
                <span className="top50-card__rating-value">
                  {ratingLabel}
                </span>
              </div>
              <span className="top50-card__price">
                {formatTrainerPriceLabel(trainer.pricePerSession)}
              </span>
            </div>
          </div>
        </article>
      </TapLink>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
