import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogExercises } from "@/data/exercise-db-catalog";

const byName = new Map(catalogExercises().map((item) => [item.name.toLowerCase(), item.muscle]));

function muscle(name: string) {
  return byName.get(name.toLowerCase());
}

describe("exercise muscle tags", () => {
  it("keeps glute work on glutes", () => {
    for (const name of [
      "Barbell Glute Bridge",
      "Low Glute Bridge On Floor",
      "Barbell Lying Lifting (On Hip)",
      "Cable Pull Through (With Rope)",
      "Machine Hip Extension",
      "Machine Seated Hip Abduction",
      "Barbell Sumo Deadlift",
      "Monster Walk",
      "Seated Glute Stretch",
    ]) {
      assert.equal(muscle(name), "glutes", name);
    }
  });

  it("does not file squats, hinges, or presses under glutes", () => {
    assert.equal(muscle("Barbell Full Squat"), "quads");
    assert.equal(muscle("Walking Lunge"), "quads");
    assert.equal(muscle("Sled 45° Leg Press"), "quads");
    assert.equal(muscle("Dumbbell Step-Up"), "quads");
    assert.equal(muscle("Smith Front Squat (Clean Grip)"), "quads");
    assert.equal(muscle("Barbell Clean-Grip Front Squat"), "quads");
    assert.equal(muscle("Barbell Deadlift"), "hamstrings");
    assert.equal(muscle("Barbell Romanian Deadlift"), "hamstrings");
    assert.equal(muscle("Kettlebell Swing"), "hamstrings");
    assert.equal(muscle("Barbell Seated Good Morning"), "hamstrings");
    assert.equal(muscle("Flutter Kicks"), "core");
    assert.equal(muscle("Pike-To-Cobra Push-Up"), "chest");
    assert.equal(muscle("Exercise Ball Hip Flexor Stretch"), null);
    assert.equal(muscle("Cable Hip Adduction"), null);
    assert.equal(muscle("Cable Kickback"), "triceps");
    assert.equal(muscle("Glute-Ham Raise"), "hamstrings");
  });
});
