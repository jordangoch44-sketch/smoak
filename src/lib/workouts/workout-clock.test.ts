import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeWorkoutForLiveActivity,
  cardioChipLabel,
  currentWorkoutPosition,
  emptyClientWorkoutLog,
  formatCardioLine,
  exerciseEffort,
  exerciseLoad,
  formatExerciseRange,
  externalClockMatches,
  finishWorkoutClock,
  formatWorkoutDuration,
  pauseFromExternalClock,
  recordedWorkoutDuration,
  sanitizeWorkoutExercise,
  toggleWorkoutClock,
  workoutClockFields,
  workoutElapsedMs,
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

  it("logs a run in miles per hour and miles", () => {
    const run = { id: "run", name: "Run", sets: "1", reps: "" };
    assert.equal(exerciseEffort(run), "distance");
    assert.equal(exerciseLoad(run), "speed");
    assert.equal(exerciseLoad({ ...run, name: "Smith Sprint Lunge" }), "lb");
    assert.equal(exerciseEffort({ ...run, name: "Wind Sprints" }), "reps");

    const saved = sanitizeWorkoutExercise({
      ...run,
      setLogs: [{ reps: "3.1", weight: "6.5" }],
    });
    assert.equal(saved?.setLogs?.[0]?.reps, "3.1");
    assert.equal(saved?.setLogs?.[0]?.weight, "6.5");
    assert.equal(formatExerciseRange({ ...run, setLogs: [{ reps: "3.1", weight: "6.5" }] }), "1 × 3.1 mi × 6.5 mph");

    const position = currentWorkoutPosition([
      { ...run, setLogs: [{ reps: "3.1", weight: "6.5" }] },
    ]);
    assert.equal(position?.weightLabel, "6.5 mph");
    assert.equal(position?.repsLabel, "3.1 mi");
  });

  it("keeps the cardio chip to the first word", () => {
    const cardio = { type: "Zone 2 easy run", duration: "45 minutes easy" };
    assert.equal(cardioChipLabel(cardio), "Zone");
    assert.equal(formatCardioLine(cardio), "Zone 2 easy run · 45 minutes easy");
    assert.equal(cardioChipLabel({ type: "", duration: "30 min" }), "30");
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

  it("leaves paused time out of the duration", () => {
    const startedAt = "2026-10-19T18:00:00.000Z";
    const pausedAt = "2026-10-19T18:05:00.000Z";
    assert.equal(
      workoutElapsedMs(
        { startedAt, pausedAt, pausedMs: 0 },
        Date.parse("2026-10-19T18:20:00.000Z")
      ),
      5 * 60 * 1000
    );
    assert.equal(
      workoutElapsedMs({ startedAt, pausedMs: 3 * 60 * 1000 }, Date.parse("2026-10-19T18:10:00.000Z")),
      7 * 60 * 1000
    );

    const finished = finishWorkoutClock(
      { startedAt, pausedAt, pausedMs: 0 },
      Date.parse("2026-10-19T18:08:00.000Z")
    );
    assert.equal(finished.pausedAt, null);
    assert.equal(finished.pausedMs, 3 * 60 * 1000);
    assert.equal(workoutElapsedMs(finished), 5 * 60 * 1000);
  });

  it("pauses and resumes without counting the gap", () => {
    const startedAt = "2026-10-19T18:00:00.000Z";
    const paused = toggleWorkoutClock({ startedAt, pausedMs: 0 }, Date.parse("2026-10-19T18:04:00.000Z"));
    assert.equal(paused.pausedAt, "2026-10-19T18:04:00.000Z");
    const resumed = toggleWorkoutClock(paused, Date.parse("2026-10-19T18:07:00.000Z"));
    assert.equal(resumed.pausedAt, null);
    assert.equal(resumed.pausedMs, 3 * 60 * 1000);
    assert.equal(
      workoutElapsedMs(resumed, Date.parse("2026-10-19T18:09:00.000Z")),
      6 * 60 * 1000
    );
  });

  it("keeps a pause on the clock and clears it on resume", () => {
    const startedAt = "2026-10-19T18:00:00.000Z";
    assert.deepEqual(
      workoutClockFields(undefined, { startedAt, pausedAt: "2026-10-19T18:05:00.000Z", pausedMs: 0 }),
      { startedAt, pausedAt: "2026-10-19T18:05:00.000Z" }
    );
    assert.deepEqual(
      workoutClockFields(
        { startedAt, pausedAt: "2026-10-19T18:05:00.000Z" },
        { startedAt, pausedAt: null, pausedMs: 120000 }
      ),
      { startedAt, pausedMs: 120000 }
    );
    assert.deepEqual(
      workoutClockFields(undefined, {
        startedAt,
        endedAt: "2026-10-19T18:20:00.000Z",
        pausedAt: "2026-10-19T18:05:00.000Z",
        pausedMs: 120000,
      }),
      { startedAt, endedAt: "2026-10-19T18:20:00.000Z", pausedMs: 120000 }
    );
  });

  it("reads a lock-screen pause back onto the same workout", () => {
    const startedAt = Date.parse("2026-10-19T18:00:00.000Z");
    assert.equal(externalClockMatches("2026-10-19T18:00:00.000Z", startedAt + 500), true);
    assert.equal(externalClockMatches("2026-10-19T18:00:00.000Z", startedAt + 5000), false);
    assert.deepEqual(
      pauseFromExternalClock({
        startedAt,
        paused: true,
        pausedSeconds: 30,
        pausedSince: Date.parse("2026-10-19T18:06:00.000Z"),
      }),
      { pausedAt: "2026-10-19T18:06:00.000Z", pausedMs: 30000 }
    );
    assert.deepEqual(
      pauseFromExternalClock({ startedAt, paused: false, pausedSeconds: 90, pausedSince: null }),
      { pausedAt: null, pausedMs: 90000 }
    );
  });

  it("keeps a finished length only through three hours", () => {
    const startedAt = "2026-10-19T18:00:00.000Z";
    const threeHours = Date.parse(startedAt) + 3 * 60 * 60 * 1000;
    assert.equal(recordedWorkoutDuration({ startedAt, endedAt: new Date(threeHours).toISOString() }), threeHours - Date.parse(startedAt));
    assert.equal(
      recordedWorkoutDuration({
        startedAt,
        endedAt: new Date(threeHours + 1000).toISOString(),
      }),
      null
    );
    assert.equal(
      recordedWorkoutDuration(
        { startedAt, pausedMs: 2 * 60 * 60 * 1000 },
        Date.parse(startedAt) + 4 * 60 * 60 * 1000
      ),
      2 * 60 * 60 * 1000
    );
    assert.equal(
      recordedWorkoutDuration({ startedAt }, Date.parse(startedAt) + 3 * 60 * 60 * 1000 + 1),
      null
    );
    const log = emptyClientWorkoutLog();
    log.days["2026-10-19"] = {
      date: "2026-10-19",
      title: "",
      exercises: [],
      startedAt,
    };
    assert.equal(activeWorkoutForLiveActivity(log), null);
  });

  it("clears a paused clock when the timer restarts", () => {
    assert.deepEqual(
      workoutClockFields(
        {
          startedAt: "2026-10-19T18:00:00.000Z",
          pausedAt: "2026-10-19T18:05:00.000Z",
          pausedMs: 1000,
        },
        { startedAt: null, endedAt: null, pausedAt: null, pausedMs: 0 }
      ),
      {}
    );
  });
});
