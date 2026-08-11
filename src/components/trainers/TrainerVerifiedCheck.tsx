"use client";

import { isTrainerVerified } from "@/lib/trainer-sponsorship";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";

interface TrainerVerifiedCheckProps {
  trainer: Trainer;
  className?: string;
}

/** Neon-blue verified mark — Pro specialists only. */
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
      <svg
        className="trainer-card__verified-icon"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle cx="12" cy="12" r="11" className="trainer-card__verified-disc" />
        <path
          className="trainer-card__verified-tick"
          d="M7.2 12.4l3 3.1 6.6-7"
          fill="none"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
