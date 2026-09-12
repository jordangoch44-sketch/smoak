/** Client dashboard workout log — one saved day is a completed training day. */

export interface ClientWorkoutExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
}

export interface ClientWorkoutDay {
  date: string;
  title: string;
  exercises: ClientWorkoutExercise[];
}

export interface ClientWorkoutLog {
  goalDaysPerWeek: number;
  days: Record<string, ClientWorkoutDay>;
}
