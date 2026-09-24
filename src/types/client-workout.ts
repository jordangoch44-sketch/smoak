/** Client dashboard workout log — one saved day is a completed training day. */

export interface ClientWorkoutExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
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
  goalDaysPerWeek: number;
  days: Record<string, ClientWorkoutDay>;
}
