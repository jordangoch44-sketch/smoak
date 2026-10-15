"use client";

import { useEffect, useMemo } from "react";
import {
  fetchDrivingEtas,
  type RoutePoint,
} from "@/lib/apple-directions";
import { isAppleMapsConfigured, loadAppleMapKit } from "@/lib/apple-maps";
import {
  getDrivingMiles,
  publishDrivingMiles,
} from "@/lib/driving-distance";
import { getTrainerCoordinates } from "@/lib/trainer-location";
import { useExplicitUserCoordinates } from "@/hooks/useActiveUserCoordinates";
import type { Trainer } from "@/types";

const ETA_BATCH_SIZE = 10;

type DestinationGroup = RoutePoint & { trainerIds: string[] };

/**
 * Fills specialist-card miles from Apple driving distance for the current
 * origin. The selected map route overwrites these with the drawn route.
 */
export function useDrivingDistances(trainers: readonly Trainer[]): void {
  const origin = useExplicitUserCoordinates();
  const trainersRef = useMemo(() => ({ current: trainers }), []);
  trainersRef.current = trainers;
  const originRef = useMemo(
    () => ({ current: origin }),
    []
  );
  originRef.current = origin;

  const signature = useMemo(() => {
    return trainers
      .map((trainer) => {
        const coords = getTrainerCoordinates(trainer);
        if (!coords) return trainer.id;
        return `${trainer.id}@${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`;
      })
      .join("|");
  }, [trainers]);

  const originKey = origin
    ? `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`
    : "";

  useEffect(() => {
    const currentOrigin = originRef.current;
    const currentTrainers = trainersRef.current;
    if (!currentOrigin || !originKey || !isAppleMapsConfigured()) return;

    const groups = new Map<string, DestinationGroup>();
    for (const trainer of currentTrainers) {
      if (getDrivingMiles(currentOrigin, trainer.id) != null) continue;
      const coords = getTrainerCoordinates(trainer);
      if (!coords) continue;
      const key = `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`;
      const group = groups.get(key);
      if (group) {
        group.trainerIds.push(trainer.id);
      } else {
        groups.set(key, {
          latitude: coords.latitude,
          longitude: coords.longitude,
          trainerIds: [trainer.id],
        });
      }
    }

    const pending = [...groups.values()];
    if (pending.length === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        const mapkit = await loadAppleMapKit();
        if (cancelled) return;
        for (let index = 0; index < pending.length; index += ETA_BATCH_SIZE) {
          if (cancelled) return;
          const batch = pending.slice(index, index + ETA_BATCH_SIZE);
          const miles = await fetchDrivingEtas(
            mapkit,
            currentOrigin,
            batch,
            controller.signal
          );
          if (cancelled) return;
          batch.forEach((destination, destinationIndex) => {
            const distance = miles[destinationIndex];
            if (distance == null) return;
            publishDrivingMiles(
              currentOrigin,
              destination.trainerIds,
              distance,
              "eta"
            );
          });
        }
      } catch {
        /* Straight-line miles stay until a route or ETA succeeds. */
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [originKey, originRef, signature, trainersRef]);
}
