"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  copyClientWorkoutDay,
  getClientWorkoutLog,
  getClientWorkoutLogServerSnapshot,
  removeClientWorkoutDay,
  saveClientWorkoutDay,
  setClientWorkoutGoalDays,
  subscribeClientWorkouts,
} from "@/lib/workouts/client-workout-store";
import type { ClientWorkoutExercise } from "@/types/client-workout";

export function useClientWorkouts(userId: string | null) {
  const log = useSyncExternalStore(
    subscribeClientWorkouts,
    () => getClientWorkoutLog(userId),
    getClientWorkoutLogServerSnapshot
  );

  const setGoalDaysPerWeek = useCallback(
    (goalDaysPerWeek: number) => {
      if (!userId) return;
      setClientWorkoutGoalDays(userId, goalDaysPerWeek);
    },
    [userId]
  );

  const saveDay = useCallback(
    (
      dateKey: string,
      exercises: readonly ClientWorkoutExercise[],
      title = ""
    ) => {
      if (!userId) return false;
      return saveClientWorkoutDay(userId, dateKey, exercises, title);
    },
    [userId]
  );

  const removeDay = useCallback(
    (dateKey: string) => {
      if (!userId) return;
      removeClientWorkoutDay(userId, dateKey);
    },
    [userId]
  );

  const copyDayTo = useCallback(
    (fromDateKey: string, toDateKey: string) => {
      if (!userId) return false;
      return copyClientWorkoutDay(userId, fromDateKey, toDateKey);
    },
    [userId]
  );

  return useMemo(
    () => ({
      log,
      setGoalDaysPerWeek,
      saveDay,
      removeDay,
      copyDayTo,
    }),
    [log, setGoalDaysPerWeek, saveDay, removeDay, copyDayTo]
  );
}
