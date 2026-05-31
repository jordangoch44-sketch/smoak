"use client";

import { useActiveUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types";

const SHOW_DEV_DISTANCE =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_SHOW_DISTANCE_LABELS === "1";

interface DevTrainerDistanceProps {
  trainer: Trainer;
  className?: string;
}

/** Dev-only proximity label for validating ZIP sorting */
export function DevTrainerDistance({
  trainer,
  className = "",
}: DevTrainerDistanceProps) {
  const userCoords = useActiveUserCoordinates();

  if (!SHOW_DEV_DISTANCE || !userCoords) return null;

  const miles = getTrainerDistanceMiles(trainer, userCoords);
  if (miles === null) return null;

  return (
    <span
      className={`dev-trainer-distance ${className}`.trim()}
      aria-hidden
    >
      {miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi away
    </span>
  );
}
