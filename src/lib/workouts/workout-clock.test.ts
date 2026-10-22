import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  currentWorkoutPosition,
  formatWorkoutDuration,
  workoutClockFields,
} from "@/lib/workouts/client-workout";

describe("workout duration clock", () => {
  it("formats the live chip", () => {
    assert.equal(formatWorkoutDuration(0), "0:00");
    assert.equal(formatWorkoutDuration(4 * 60 * 1000 + 2 * 1000), "4:02");
    assert.equal(formatWorkoutDuration(62 * 60 * 1000 + 3 * 1000), "1:02:03");
  });

  it("points the lock screen at the open exercise and set", () => {
    assert.equal(currentWorkoutPosition([]), null);
    const position = currentWorkoutPosition([
      {
        id: "1",
        name: "Back Squat",
        sets: "3",
        reps: "",
        setLogs: [
          { reps: "8", weight: "135", completed: true },
          { reps: "8", weight: "135" },
          { reps: "8", weight: "135" },
        ],
      },
      { id: "2", name: "Dip", sets: "3", reps: "" },
    ]);
    assert.deepEqual(position, {
      exerciseName: "Back Squat",
      setNumber: 2,
      setCount: 3,
      setLabel: "Set 2 of 3",
      weightLabel: "135 lb",
      repsLabel: "8 reps",
      setsLabel: "3 sets",
      imageUrl: "",
    });
  });

  it("drops an end that falls before the start", () => {
    assert.deepEqual(
      workoutClockFields(
        { startedAt: "2026-10-19T18:10:00.000Z", endedAt: "2026-10-19T18:00:00.000Z" },
        undefined
      ),
      { startedAt: "2026-10-19T18:10:00.000Z" }
    );
  });
});
