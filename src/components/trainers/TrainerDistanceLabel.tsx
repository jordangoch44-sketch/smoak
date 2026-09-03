"use client";

import { LocationMarkIcon } from "@/components/ui/icons";
import { useExplicitUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types";
import { cn } from "@/lib/utils";

interface TrainerDistanceLabelProps {
  trainer: Trainer;
  className?: string;
  /** Profile sheet — pin icon inside the distance pill */
  showIcon?: boolean;
}

/** Public “distance from you” label when the visitor has set ZIP or GPS. */
export function TrainerDistanceLabel({
  trainer,
  className,
  showIcon = false,
}: TrainerDistanceLabelProps) {
  const userCoords = useExplicitUserCoordinates();
  if (!userCoords) return null;

  const miles = getTrainerDistanceMiles(trainer, userCoords);
  if (miles === null) return null;

  const label =
    miles < 20
      ? `${miles.toFixed(1)} mi away`
      : `${Math.round(miles)} mi away`;

  return (
    <span
      className={cn(
        "trainer-distance-label",
        showIcon && "trainer-distance-label--with-icon",
        className
      )}
    >
      {showIcon ? (
        <LocationMarkIcon className="trainer-distance-label__icon" />
      ) : null}
      <span className="trainer-distance-label__text">{label}</span>
    </span>
  );
}
