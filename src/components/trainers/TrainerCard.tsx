"use client";

/**
 * Responsive provider card (internal name TrainerCard).
 * TODO: Rename to ProviderCard; routes remain /trainers/[id] until migrated to /providers.
 * Save heart lives outside the card link (valid HTML + reliable stacking).
 */
import Link from "next/link";
import { memo } from "react";
import type { Trainer } from "@/types";
import {
  TrainerCardCompact,
  type TrainerCardCompactLayout,
} from "./TrainerCardCompact";
import { TrainerCardGrid } from "./TrainerCardGrid";
import { TrainerCardSaveSlot } from "./TrainerCardSaveSlot";
import { SpecialistImpressionBeacon } from "./SpecialistImpressionBeacon";
import { getTrainerPlacementBadge } from "@/lib/trainer-placement-badge";
import { primeTrainerProfile } from "@/lib/primed-trainer-profile";

interface TrainerCardProps {
  trainer: Trainer;
  priority?: boolean;
  compactLayout?: TrainerCardCompactLayout;
  /** Search-appearance surface for analytics (default explore). */
  impressionSurface?: "explore" | "saved" | "client_dashboard";
  /** Disable profile link while compare mode is selecting saved cards. */
  linkDisabled?: boolean;
}

export const TrainerCard = memo(function TrainerCard({
  trainer,
  priority = false,
  compactLayout = "default",
  impressionSurface = "explore",
  linkDisabled = false,
}: TrainerCardProps) {
  const href = `/trainers/${trainer.id}`;
  const placementBadge = getTrainerPlacementBadge(trainer);
  const cardBody = (
    <>
      <TrainerCardCompact
        trainer={trainer}
        priority={priority}
        layout={compactLayout}
      />
      <TrainerCardGrid trainer={trainer} priority={priority} />
    </>
  );

  return (
    <div className="trainer-card relative w-full min-w-0 max-w-full overflow-hidden">
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface={impressionSurface}
      />
      {placementBadge ? (
        <span className="trainer-card__placement-badge">{placementBadge}</span>
      ) : null}
      {linkDisabled ? (
        <div className="block" aria-hidden={false}>
          {cardBody}
        </div>
      ) : (
        <Link
          href={href}
          className="block active:opacity-95"
          onClick={() => primeTrainerProfile(trainer)}
        >
          {cardBody}
        </Link>
      )}
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
});
