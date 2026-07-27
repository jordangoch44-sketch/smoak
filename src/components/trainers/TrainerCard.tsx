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

interface TrainerCardProps {
  trainer: Trainer;
  priority?: boolean;
  compactLayout?: TrainerCardCompactLayout;
  /** Search-appearance surface for analytics (default explore). */
  impressionSurface?: "explore" | "saved" | "client_dashboard";
}

export const TrainerCard = memo(function TrainerCard({
  trainer,
  priority = false,
  compactLayout = "default",
  impressionSurface = "explore",
}: TrainerCardProps) {
  const href = `/trainers/${trainer.id}`;

  return (
    <div className="trainer-card relative w-full min-w-0 max-w-full overflow-hidden">
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface={impressionSurface}
      />
      <Link href={href} className="block active:opacity-95">
        <TrainerCardCompact
          trainer={trainer}
          priority={priority}
          layout={compactLayout}
        />
        <TrainerCardGrid trainer={trainer} priority={priority} />
      </Link>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
});
