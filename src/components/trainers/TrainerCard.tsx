/**
 * Responsive provider card (internal name TrainerCard).
 * TODO: Rename to ProviderCard; routes remain /trainers/[id] until migrated to /providers.
 * Save heart lives outside the card link (valid HTML + reliable stacking).
 */
import Link from "next/link";
import type { Trainer } from "@/types";
import { TrainerCardCompact } from "./TrainerCardCompact";
import { TrainerCardGrid } from "./TrainerCardGrid";
import { TrainerCardSaveSlot } from "./TrainerCardSaveSlot";

interface TrainerCardProps {
  trainer: Trainer;
  priority?: boolean;
}

export function TrainerCard({ trainer, priority = false }: TrainerCardProps) {
  const href = `/trainers/${trainer.id}`;

  return (
    <div className="trainer-card relative w-full">
      <Link href={href} className="block active:opacity-95">
        <TrainerCardCompact trainer={trainer} priority={priority} />
        <TrainerCardGrid trainer={trainer} priority={priority} />
      </Link>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
