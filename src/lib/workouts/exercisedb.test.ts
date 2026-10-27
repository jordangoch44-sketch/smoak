import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { storedExerciseName } from "@/data/exercise-display";
import { exerciseClipFromSearch } from "@/lib/workouts/exercisedb";

describe("exercise clips", () => {
  it("uses the rear-lunge clip for dumbbell reverse lunge and skips the forward lunge", () => {
    const name = storedExerciseName("Dumbbell Reverse Lunge");
    assert.equal(name, "Dumbbell Rear Lunge");
    const clip = exerciseClipFromSearch(name, [
      {
        exerciseId: "RRWFUcw",
        name: "dumbbell lunge",
        gifUrl: "https://static.exercisedb.dev/media/RRWFUcw.gif",
      },
      {
        exerciseId: "SSsBDwB",
        name: "dumbbell rear lunge",
        gifUrl: "https://static.exercisedb.dev/media/SSsBDwB.gif",
      },
    ]);
    assert.equal(clip?.gifUrl, "https://static.exercisedb.dev/media/SSsBDwB.gif");
    assert.equal(exerciseClipFromSearch("Dumbbell Reverse Lunge", [
      {
        exerciseId: "SSsBDwB",
        name: "dumbbell rear lunge",
        gifUrl: "https://static.exercisedb.dev/media/SSsBDwB.gif",
      },
    ]), null);
  });
});
