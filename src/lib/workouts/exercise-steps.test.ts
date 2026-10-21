import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogExercises } from "@/data/exercise-db-catalog";
import { exerciseSteps } from "@/lib/workouts/exercise-steps";

describe("exercise steps", () => {
  it("gives every catalog exercise a how-to", () => {
    const blank: string[] = [];
    for (const item of catalogExercises()) {
      const steps = exerciseSteps(item.name);
      const broken = steps.length < 4 || steps.some((step) => !step.trim() || /^step:\s*\d+/i.test(step));
      if (broken) blank.push(item.name);
    }
    assert.deepEqual(blank, []);
  });

  it("uses the reverse-lunge steps for the gym name", () => {
    const steps = exerciseSteps("Dumbbell Reverse Lunge").join(" ");
    assert.match(steps, /step backward/i);
    assert.equal(exerciseSteps("dumbbell rear lunge").join(" "), steps);
  });

  it("still writes steps for a custom name", () => {
    const steps = exerciseSteps("Reverse dumbbell lunge");
    assert.ok(steps.length >= 4);
    assert.match(steps.join(" "), /backward|lunge/i);
    assert.ok(exerciseSteps("").length >= 4);
  });
});
