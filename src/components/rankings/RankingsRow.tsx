"use client";

import type { SmoacRankedSpecialist } from "@/lib/smoac-rankings";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { TrainerCardSmoacRating } from "@/components/trainers/TrainerCardSmoacRating";
import { TrainerDistanceLabel } from "@/components/trainers/TrainerDistanceLabel";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { TrainerProfessionLabel } from "@/components/trainers/TrainerProfessionLabel";
import { TrainerVerifiedCheck } from "@/components/trainers/TrainerVerifiedCheck";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
import { ProfileSheetLink } from "@/components/trainers/ProfileSheetLink";
import { cn } from "@/lib/utils";

interface RankingsRowProps {
  row: SmoacRankedSpecialist;
  priority?: boolean;
}

export function RankingsRow({ row, priority = false }: RankingsRowProps) {
  const { trainer, displayRank, avgRating, reviewCount } = row;
  const isPodium = displayRank <= 3;

  return (
    <div
      className={cn("rankings-row", isPodium && "rankings-row--podium")}
      role="listitem"
    >
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface="rankings"
      />
      <div className="rankings-row__rank" aria-hidden>
        <span className="rankings-row__rank-num">#{displayRank}</span>
      </div>
      <ProfileSheetLink
        trainer={trainer}
        className="rankings-row__link"
        aria-label={`Rank ${displayRank}: ${trainer.name}`}
      >
        <div className="rankings-row__avatar">
          <TrainerThumbnail
            src={trainer.image}
            name={trainer.name}
            size="card"
            priority={priority}
            className="rankings-row__thumb"
            imageClassName="rankings-row__thumb-img"
          />
        </div>

        <div className="rankings-row__main">
          <div className="rankings-row__identity">
            <div className="rankings-row__name-row">
              <TrainerVerifiedCheck
                trainer={trainer}
                className="rankings-row__verified"
              />
              <h3 className="rankings-row__name">{trainer.name}</h3>
            </div>
            <TrainerProfessionLabel
              trainer={trainer}
              className="rankings-row__profession"
            />
          </div>

          <div className="rankings-row__place">
            <LocationLabel
              provider={trainer}
              className="rankings-row__location"
            />
            <TrainerDistanceLabel
              trainer={trainer}
              className="rankings-row__distance"
            />
          </div>

          <div className="rankings-row__rating">
            <TrainerCardSmoacRating
              trainerId={trainer.id}
              avgRating={avgRating}
              reviewCount={reviewCount}
              className="rankings-row__stars"
            />
          </div>

          <SessionPrice
            trainer={trainer}
            variant="compact"
            className="rankings-row__price"
          />
        </div>
      </ProfileSheetLink>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
