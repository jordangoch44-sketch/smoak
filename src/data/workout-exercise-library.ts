/** Exercise pool for the random suggested workout. */

export type ExerciseMuscle =
  | "chest"
  /** Rows */
  | "back"
  /** Vertical pulls */
  | "lats"
  | "shoulders"
  | "rear-delts"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export type ExerciseKind = "compound" | "accessory";

export interface LibraryExercise {
  name: string;
  muscle: ExerciseMuscle;
  kind: ExerciseKind;
  /** Fixed prescription, e.g. timed holds. Otherwise picked from the kind's schemes. */
  scheme?: { sets: string; reps: string };
}

const HOLD = { sets: "3", reps: "45 sec" };

export const WORKOUT_EXERCISE_LIBRARY: readonly LibraryExercise[] = [
  // Chest
  { name: "Barbell bench press", muscle: "chest", kind: "compound" },
  { name: "Incline dumbbell press", muscle: "chest", kind: "compound" },
  { name: "Dumbbell bench press", muscle: "chest", kind: "compound" },
  { name: "Incline barbell press", muscle: "chest", kind: "compound" },
  { name: "Weighted dips", muscle: "chest", kind: "compound" },
  { name: "Cable fly", muscle: "chest", kind: "accessory" },
  { name: "Pec deck", muscle: "chest", kind: "accessory" },
  { name: "Incline dumbbell fly", muscle: "chest", kind: "accessory" },
  { name: "Push-ups", muscle: "chest", kind: "accessory" },
  { name: "Decline bench press", muscle: "chest", kind: "compound" },
  { name: "Machine chest press", muscle: "chest", kind: "compound" },
  { name: "Smith machine incline press", muscle: "chest", kind: "compound" },
  { name: "Decline dumbbell press", muscle: "chest", kind: "compound" },
  { name: "Dumbbell floor press", muscle: "chest", kind: "compound" },
  { name: "Dumbbell fly", muscle: "chest", kind: "accessory" },
  { name: "Low-to-high cable fly", muscle: "chest", kind: "accessory" },
  { name: "High-to-low cable fly", muscle: "chest", kind: "accessory" },
  { name: "Svend press", muscle: "chest", kind: "accessory" },
  { name: "Deficit push-ups", muscle: "chest", kind: "accessory" },
  // Back
  { name: "Pull-ups", muscle: "lats", kind: "compound" },
  { name: "Barbell row", muscle: "back", kind: "compound" },
  { name: "Lat pulldown", muscle: "lats", kind: "compound" },
  { name: "Seated cable row", muscle: "back", kind: "compound" },
  { name: "Chest-supported row", muscle: "back", kind: "compound" },
  { name: "Single-arm dumbbell row", muscle: "back", kind: "compound" },
  { name: "Straight-arm pulldown", muscle: "lats", kind: "accessory" },
  { name: "Close-grip pulldown", muscle: "lats", kind: "accessory" },
  { name: "Machine row", muscle: "back", kind: "accessory" },
  { name: "T-bar row", muscle: "back", kind: "compound" },
  { name: "Pendlay row", muscle: "back", kind: "compound" },
  { name: "Meadows row", muscle: "back", kind: "compound" },
  { name: "Seal row", muscle: "back", kind: "compound" },
  { name: "Inverted row", muscle: "back", kind: "accessory" },
  { name: "Wide-grip cable row", muscle: "back", kind: "accessory" },
  { name: "Chin-ups", muscle: "lats", kind: "compound" },
  { name: "Neutral-grip pull-ups", muscle: "lats", kind: "compound" },
  { name: "Single-arm lat pulldown", muscle: "lats", kind: "accessory" },
  { name: "Dumbbell pullover", muscle: "lats", kind: "accessory" },
  // Shoulders
  { name: "Overhead press", muscle: "shoulders", kind: "compound" },
  { name: "Seated dumbbell press", muscle: "shoulders", kind: "compound" },
  { name: "Arnold press", muscle: "shoulders", kind: "compound" },
  { name: "Lateral raise", muscle: "shoulders", kind: "accessory" },
  { name: "Cable lateral raise", muscle: "shoulders", kind: "accessory" },
  { name: "Front raise", muscle: "shoulders", kind: "accessory" },
  { name: "Machine shoulder press", muscle: "shoulders", kind: "compound" },
  { name: "Push press", muscle: "shoulders", kind: "compound" },
  { name: "Landmine press", muscle: "shoulders", kind: "compound" },
  { name: "Upright row", muscle: "shoulders", kind: "accessory" },
  { name: "Lean-away lateral raise", muscle: "shoulders", kind: "accessory" },
  { name: "Face pull", muscle: "rear-delts", kind: "accessory" },
  { name: "Reverse pec deck", muscle: "rear-delts", kind: "accessory" },
  { name: "Rear delt fly", muscle: "rear-delts", kind: "accessory" },
  { name: "Cable rear delt fly", muscle: "rear-delts", kind: "accessory" },
  { name: "Rear delt row", muscle: "rear-delts", kind: "accessory" },
  { name: "Prone Y-raise", muscle: "rear-delts", kind: "accessory" },
  { name: "Band pull-apart", muscle: "rear-delts", kind: "accessory", scheme: { sets: "3", reps: "20" } },
  // Arms
  { name: "Barbell curl", muscle: "biceps", kind: "accessory" },
  { name: "Dumbbell curl", muscle: "biceps", kind: "accessory" },
  { name: "Hammer curl", muscle: "biceps", kind: "accessory" },
  { name: "Incline dumbbell curl", muscle: "biceps", kind: "accessory" },
  { name: "Cable curl", muscle: "biceps", kind: "accessory" },
  { name: "Preacher curl", muscle: "biceps", kind: "accessory" },
  { name: "EZ-bar curl", muscle: "biceps", kind: "accessory" },
  { name: "Spider curl", muscle: "biceps", kind: "accessory" },
  { name: "Concentration curl", muscle: "biceps", kind: "accessory" },
  { name: "Bayesian cable curl", muscle: "biceps", kind: "accessory" },
  { name: "Zottman curl", muscle: "biceps", kind: "accessory" },
  { name: "Rope pushdown", muscle: "triceps", kind: "accessory" },
  { name: "Overhead cable extension", muscle: "triceps", kind: "accessory" },
  { name: "Skull crushers", muscle: "triceps", kind: "accessory" },
  { name: "Close-grip bench press", muscle: "triceps", kind: "accessory" },
  { name: "Dumbbell kickback", muscle: "triceps", kind: "accessory" },
  { name: "Bench dips", muscle: "triceps", kind: "accessory" },
  { name: "Straight-bar pushdown", muscle: "triceps", kind: "accessory" },
  { name: "Single-arm cable pushdown", muscle: "triceps", kind: "accessory" },
  { name: "Overhead dumbbell extension", muscle: "triceps", kind: "accessory" },
  { name: "JM press", muscle: "triceps", kind: "accessory" },
  { name: "Diamond push-ups", muscle: "triceps", kind: "accessory" },
  // Legs
  { name: "Back squat", muscle: "quads", kind: "compound" },
  { name: "Front squat", muscle: "quads", kind: "compound" },
  { name: "Leg press", muscle: "quads", kind: "compound" },
  { name: "Hack squat", muscle: "quads", kind: "compound" },
  { name: "Goblet squat", muscle: "quads", kind: "compound" },
  { name: "Bulgarian split squat", muscle: "quads", kind: "accessory" },
  { name: "Walking lunges", muscle: "quads", kind: "accessory" },
  { name: "Leg extension", muscle: "quads", kind: "accessory" },
  { name: "Step-ups", muscle: "quads", kind: "accessory" },
  { name: "Romanian deadlift", muscle: "hamstrings", kind: "compound" },
  { name: "Deadlift", muscle: "hamstrings", kind: "compound" },
  { name: "Stiff-leg deadlift", muscle: "hamstrings", kind: "compound" },
  { name: "Lying leg curl", muscle: "hamstrings", kind: "accessory" },
  { name: "Seated leg curl", muscle: "hamstrings", kind: "accessory" },
  { name: "Good morning", muscle: "hamstrings", kind: "compound" },
  { name: "Single-leg Romanian deadlift", muscle: "hamstrings", kind: "accessory" },
  { name: "Nordic curl", muscle: "hamstrings", kind: "accessory", scheme: { sets: "3", reps: "6" } },
  { name: "Glute-ham raise", muscle: "hamstrings", kind: "accessory", scheme: { sets: "3", reps: "8" } },
  { name: "Kettlebell swing", muscle: "hamstrings", kind: "accessory", scheme: { sets: "3", reps: "15" } },
  { name: "Hip thrust", muscle: "glutes", kind: "compound" },
  { name: "Glute bridge", muscle: "glutes", kind: "accessory" },
  { name: "Cable kickback", muscle: "glutes", kind: "accessory" },
  { name: "Hip abduction", muscle: "glutes", kind: "accessory" },
  { name: "Smith machine hip thrust", muscle: "glutes", kind: "compound" },
  { name: "Sumo deadlift", muscle: "glutes", kind: "compound" },
  { name: "Cable pull-through", muscle: "glutes", kind: "accessory" },
  { name: "B-stance hip thrust", muscle: "glutes", kind: "accessory" },
  { name: "Frog pumps", muscle: "glutes", kind: "accessory", scheme: { sets: "3", reps: "20" } },
  { name: "Standing calf raise", muscle: "calves", kind: "accessory", scheme: { sets: "4", reps: "12-15" } },
  { name: "Seated calf raise", muscle: "calves", kind: "accessory", scheme: { sets: "4", reps: "12-15" } },
  { name: "Leg press calf raise", muscle: "calves", kind: "accessory", scheme: { sets: "4", reps: "12-15" } },
  { name: "Smith machine calf raise", muscle: "calves", kind: "accessory", scheme: { sets: "4", reps: "12-15" } },
  { name: "Single-leg calf raise", muscle: "calves", kind: "accessory", scheme: { sets: "3", reps: "15" } },
  { name: "Donkey calf raise", muscle: "calves", kind: "accessory", scheme: { sets: "4", reps: "12-15" } },
  // Core
  { name: "Hanging leg raise", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "12" } },
  { name: "Cable crunch", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "15" } },
  { name: "Plank", muscle: "core", kind: "accessory", scheme: HOLD },
  { name: "Side plank", muscle: "core", kind: "accessory", scheme: HOLD },
  { name: "Ab wheel rollout", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "10" } },
  { name: "Dead bug", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "12" } },
  { name: "Pallof press", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "12" } },
  { name: "Russian twist", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "20" } },
];
