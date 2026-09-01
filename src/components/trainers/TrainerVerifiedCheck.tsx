import { VerifiedBadgeMark } from "@/components/ui/VerifiedBadgeMark";
import { isTrainerVerified } from "@/lib/trainer-sponsorship";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";

interface TrainerVerifiedCheckProps {
  trainer: Trainer;
  className?: string;
}

/** Luxury smoke-spectrum verified seal — same mark as the specialist profile hero. */
export function TrainerVerifiedCheck({
  trainer,
  className,
}: TrainerVerifiedCheckProps) {
  if (!isTrainerVerified(trainer)) return null;

  return (
    <VerifiedBadgeMark
      className={cn("trainer-card__verified", className)}
      iconClassName="trainer-card__verified-icon"
    />
  );
}
