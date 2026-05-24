"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  getHiddenTrainersServerSnapshot,
  getHiddenTrainersSnapshot,
  hideTrainerId,
  subscribeHiddenTrainers,
  toggleHiddenTrainerId,
  unhideTrainerId,
} from "@/lib/hidden-trainers-store";

export function useHiddenTrainers() {
  const hiddenIds = useSyncExternalStore(
    subscribeHiddenTrainers,
    getHiddenTrainersSnapshot,
    getHiddenTrainersServerSnapshot
  );

  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);

  const isHidden = useCallback(
    (trainerId: string) => hiddenSet.has(trainerId),
    [hiddenSet]
  );

  const hideTrainer = useCallback((trainerId: string) => {
    hideTrainerId(trainerId);
  }, []);

  const unhideTrainer = useCallback((trainerId: string) => {
    unhideTrainerId(trainerId);
  }, []);

  const toggleHidden = useCallback((trainerId: string) => {
    return toggleHiddenTrainerId(trainerId);
  }, []);

  return {
    hiddenIds,
    isHidden,
    hideTrainer,
    unhideTrainer,
    toggleHidden,
  };
}
