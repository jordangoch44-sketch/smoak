"use client";

import { LocationMarkIcon } from "@/components/ui/icons";
import { useSyncExternalStore } from "react";
import { useExplicitUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import {
  drivingOriginKey,
  formatDistanceMilesAway,
  getDrivingDistanceServerSnapshot,
  getDrivingDistanceSnapshot,
  subscribeDrivingDistances,
} from "@/lib/driving-distance";
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
  const driving = useSyncExternalStore(
    subscribeDrivingDistances,
    getDrivingDistanceSnapshot,
    getDrivingDistanceServerSnapshot
  );
  if (!userCoords) return null;

  const drivingMiles =
    driving.originKey === drivingOriginKey(userCoords)
      ? driving.byTrainerId[trainer.id]?.miles
      : undefined;
  const miles = drivingMiles ?? getTrainerDistanceMiles(trainer, userCoords);
  if (miles === null || miles === undefined) return null;

  const label = formatDistanceMilesAway(miles);

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
