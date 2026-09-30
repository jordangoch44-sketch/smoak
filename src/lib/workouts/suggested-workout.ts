import {
  WORKOUT_EXERCISE_LIBRARY,
  type ExerciseKind,
  type ExerciseMuscle,
  type LibraryExercise,
} from "@/data/workout-exercise-library";

export type SuggestedFocus = "full" | "upper" | "lower" | "push" | "pull" | "arms";

export const SUGGESTED_FOCUS_OPTIONS: readonly { id: SuggestedFocus; label: string }[] = [
  { id: "full", label: "Full body" },
  { id: "upper", label: "Upper body" },
  { id: "lower", label: "Lower body" },
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "arms", label: "Arms & abs" },
];

interface Slot {
  muscles: readonly ExerciseMuscle[];
  kind: ExerciseKind;
}

const c = (...muscles: ExerciseMuscle[]): Slot => ({ muscles, kind: "compound" });
const a = (...muscles: ExerciseMuscle[]): Slot => ({ muscles, kind: "accessory" });

/** Big lifts first, then accessories. */
const TEMPLATES: Record<SuggestedFocus, readonly Slot[]> = {
  full: [c("quads"), c("chest"), c("back", "lats"), c("hamstrings", "glutes"), a("core")],
  upper: [c("chest"), c("back", "lats"), c("shoulders"), a("biceps"), a("triceps")],
  lower: [c("quads"), c("hamstrings"), c("glutes"), a("quads", "hamstrings"), a("calves")],
  push: [c("chest"), c("shoulders"), a("chest"), a("shoulders"), a("triceps")],
  pull: [c("lats"), c("back"), a("back", "lats"), a("rear-delts"), a("biceps")],
  arms: [a("biceps"), a("triceps"), a("biceps"), a("triceps"), a("core")],
};

const SCHEMES: Record<ExerciseKind, readonly { sets: string; reps: string }[]> = {
  compound: [
    { sets: "4", reps: "6-8" },
    { sets: "3", reps: "8-10" },
    { sets: "5", reps: "5" },
  ],
  accessory: [
    { sets: "3", reps: "10-12" },
    { sets: "3", reps: "12-15" },
  ],
};

export interface SuggestedExercise {
  name: string;
  sets: string;
  reps: string;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32 — small seeded PRNG so a seed always gives the same workout. */
function seededRandom(seed: string): () => number {
  let state = hashString(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function candidatesFor(slot: Slot, taken: ReadonlySet<string>): LibraryExercise[] {
  const matches = WORKOUT_EXERCISE_LIBRARY.filter(
    (exercise) => slot.muscles.includes(exercise.muscle) && !taken.has(exercise.name)
  );
  const exact = matches.filter((exercise) => exercise.kind === slot.kind);
  return exact.length > 0 ? exact : matches;
}

/**
 * Random workout for a focus. Same seed → same workout.
 * `swaps[i]` re-rolls only slot i (bump it to swap that one exercise).
 */
export function generateSuggestedWorkout(
  focus: SuggestedFocus,
  seed: string,
  swaps: readonly number[] = []
): SuggestedExercise[] {
  const taken = new Set<string>();
  return TEMPLATES[focus].flatMap((slot, index) => {
    const random = seededRandom(`${seed}:${focus}:${index}:${swaps[index] ?? 0}`);
    const candidates = candidatesFor(slot, taken);
    if (candidates.length === 0) return [];
    const exercise = pick(candidates, random);
    taken.add(exercise.name);
    const scheme = exercise.scheme ?? pick(SCHEMES[exercise.kind], random);
    return [{ name: exercise.name, sets: scheme.sets, reps: scheme.reps }];
  });
}

export function suggestedFocusLabel(focus: SuggestedFocus): string {
  return SUGGESTED_FOCUS_OPTIONS.find((option) => option.id === focus)?.label ?? "Workout";
}
