/** Client dashboard workout log — one saved day is a completed training day. */

/** What the reps column is counting. Distance is miles for a run. */
export type WorkoutEffort = "reps" | "distance";

/** What the load column is measuring. Speed is miles per hour for a run. Bodyweight hides the number. */
export type WorkoutLoad = "lb" | "kg" | "bodyweight" | "speed";

/** Reps and weight for one set. Empty strings mean that number was skipped. */
export interface ClientWorkoutSetLog {
  reps: string;
  weight: string;
  /** Checked off while logging this set. */
  completed?: boolean;
}

export interface ClientWorkoutExercise {
  id: string;
  name: string;
  sets: string;
  /** Legacy single rep range. Empty when `setLogs` holds per-set numbers. */
  reps: string;
  /** Reps, unless this exercise is logged as a distance. */
  effort?: WorkoutEffort;
  /** Pounds, unless this exercise is logged in kilograms or as bodyweight. */
  load?: WorkoutLoad;
  /** Per-set reps and weight, in set order. Missing entries were skipped. */
  setLogs?: ClientWorkoutSetLog[];
  /** Short note the specialist or the client can edit on this exercise. */
  note?: string;
  /** Checked off while the client is doing the workout. */
  completed?: boolean;
  /** Shared with the other exercises in a superset. */
  supersetId?: string;
  /** Photo for an exercise the client created. Library exercises load an ExerciseDB still by name. */
  imageUrl?: string;
  equipment?: string;
  muscle?: string;
  otherMuscles?: string[];
  exerciseType?: string;
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
  /** A planned day off. Cardio and a workout are not logged on this day. */
  rest?: boolean;
  /** When the duration clock started. The client taps the duration chip. */
  startedAt?: string;
  /** Set when the client finishes, so the chip stops on the total. */
  endedAt?: string;
  /** Set while the clock is paused. */
  pausedAt?: string;
  /** Milliseconds already spent paused, not counting the open pause. */
  pausedMs?: number;
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
