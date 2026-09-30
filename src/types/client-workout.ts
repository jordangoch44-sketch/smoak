/** Client dashboard workout log — one saved day is a completed training day. */

/** Reps and weight for one set. Empty strings mean that number was skipped. */
export interface ClientWorkoutSetLog {
  reps: string;
  weight: string;
}

export interface ClientWorkoutExercise {
  id: string;
  name: string;
  sets: string;
  /** Legacy single rep range. Empty when `setLogs` holds per-set numbers. */
  reps: string;
  /** Per-set reps and weight, in set order. Missing entries were skipped. */
  setLogs?: ClientWorkoutSetLog[];
  /** Checked off while the client is doing the workout. */
  completed?: boolean;
}

export interface ClientWorkoutCardio {
  type: string;
  duration: string;
  /** Checked off while the client is doing the workout. */
  completed?: boolean;
}

export interface ClientWorkoutDay {
  date: string;
  title: string;
  exercises: ClientWorkoutExercise[];
  cardio?: ClientWorkoutCardio;
}

export interface ClientWorkoutLog {
  /** Strength days per week (days with exercises or a workout name). */
  goalDaysPerWeek: number;
  /** Cardio days per week. 0 means no cardio goal. */
  cardioGoalDaysPerWeek: number;
  days: Record<string, ClientWorkoutDay>;
  /** Body weight in lb, keyed by local date (YYYY-MM-DD). One weigh-in per day. */
  bodyWeights: Record<string, number>;
  /** IANA zone of the last device that saved, e.g. "America/Denver". Times workout emails. */
  timeZone?: string;
}
