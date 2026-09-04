"use client";

import { useRouter } from "next/navigation";
import type { SmoacRankedSpecialist } from "@/lib/smoac-rankings";
import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { TrainerCardSmoacRating } from "@/components/trainers/TrainerCardSmoacRating";
import { TrainerDistanceLabel } from "@/components/trainers/TrainerDistanceLabel";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { TrainerProfessionLabel } from "@/components/trainers/TrainerProfessionLabel";
import { TrainerVerifiedCheck } from "@/components/trainers/TrainerVerifiedCheck";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
import { cn } from "@/lib/utils";

interface RankingsRowProps {
  row: SmoacRankedSpecialist;
  priority?: boolean;
}

export function RankingsRow({ row, priority = false }: RankingsRowProps) {
  const router = useRouter();
  const { trainer, displayRank, avgRating, reviewCount } = row;
  const href = `/trainers/${trainer.id}`;
  const isPodium = displayRank <= 3;

  function warm() {
    warmTrainerProfileNavigation(trainer, router);
  }

  return (
    <div
      className={cn("rankings-row", isPodium && "rankings-row--podium")}
      role="listitem"
    >
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface="rankings"
      />
      <TapLink
        href={href}
        className="rankings-row__link grid grid-cols-[4.75rem_minmax(0,1fr)] items-stretch"
        aria-label={`Rank ${displayRank}: ${trainer.name}`}
        onPointerDown={warm}
        onClick={warm}
      >
        <div className="rankings-row__rank" aria-hidden>
          <span className="rankings-row__rank-num">#{displayRank}</span>
        </div>

        <div className="rankings-row__avatar">
          <TrainerThumbnail
            src={trainer.image}
            name={trainer.name}
            size="compact"
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
            amount={trainer.pricePerSession}
            variant="compact"
            className="rankings-row__price"
          />
        </div>
      </TapLink>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
