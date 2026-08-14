"use client";

import { useActiveUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types";
import { cn } from "@/lib/utils";

interface TrainerDistanceLabelProps {
  trainer: Trainer;
  className?: string;
}

/** Public “distance from you” label when client location is known. */
export function TrainerDistanceLabel({
  trainer,
  className,
}: TrainerDistanceLabelProps) {
  const userCoords = useActiveUserCoordinates();
  if (!userCoords) return null;

  const miles = getTrainerDistanceMiles(trainer, userCoords);
  if (miles === null) return null;

  const label =
    miles < 20
      ? `${miles.toFixed(1)} mi away`
      : `${Math.round(miles)} mi away`;

  return (
    <span className={cn("trainer-distance-label", className)}>{label}</span>
  );
}
