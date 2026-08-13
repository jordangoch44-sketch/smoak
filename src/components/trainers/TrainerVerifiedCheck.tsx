import { ShieldCheckIcon } from "@/components/ui/icons";
import { isTrainerVerified } from "@/lib/trainer-sponsorship";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";

interface TrainerVerifiedCheckProps {
  trainer: Trainer;
  className?: string;
}

/** Neon green Pro shield — same mark as the specialist profile hero. */
export function TrainerVerifiedCheck({
  trainer,
  className,
}: TrainerVerifiedCheckProps) {
  if (!isTrainerVerified(trainer)) return null;

  return (
    <span
      className={cn("trainer-card__verified", className)}
      title="Verified Pro specialist"
      aria-label="Verified Pro specialist"
    >
      <ShieldCheckIcon className="trainer-card__verified-icon" />
    </span>
  );
}
