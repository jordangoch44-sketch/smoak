import savedSteps from "@/data/exercise-steps.json";
import { storedExerciseName } from "@/data/exercise-display";
import { generateExerciseSteps } from "@/lib/workouts/exercise-step-copy";

const STEPS = savedSteps as Record<string, readonly string[]>;

function stepKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Numbered how-to for a catalog exercise, a gym display name, or a custom name.
 * Catalog rows are stored in exercise-steps.json. Anything else gets a generated how-to.
 */
export function exerciseSteps(name: string): readonly string[] {
  const stored = storedExerciseName(name);
  for (const candidate of [stored, name]) {
    const steps = STEPS[stepKey(candidate)];
    if (steps?.length) return steps;
  }
  return generateExerciseSteps(stored || name);
}
