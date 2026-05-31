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

interface TrainerCardProps {
  trainer: Trainer;
  priority?: boolean;
  compactLayout?: TrainerCardCompactLayout;
}

export const TrainerCard = memo(function TrainerCard({
  trainer,
  priority = false,
  compactLayout = "default",
}: TrainerCardProps) {
  const href = `/trainers/${trainer.id}`;

  return (
    <div className="trainer-card relative w-full min-w-0 max-w-full overflow-hidden">
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
