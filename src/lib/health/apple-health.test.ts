import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAppleHealthWeek,
  dedupeAppleHealthWorkouts,
  formatAppleHealthSummary,
  type AppleHealthWorkout,
} from "@/lib/health/apple-health";

function workout(
  patch: Partial<AppleHealthWorkout> & Pick<AppleHealthWorkout, "id" | "start" | "end">
): AppleHealthWorkout {
  return {
    activity: "running",
    activityLabel: "Running",
    durationSeconds: 1800,
    activeCalories: 300,
    source: "watch",
    ...patch,
  };
}

function at(year: number, month: number, day: number, hour: number, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

describe("apple health workouts", () => {
  it("keeps one row per id and prefers the watch when sessions overlap", () => {
    const watch = workout({
      id: "watch",
      start: at(2026, 10, 19, 8, 0),
      end: at(2026, 10, 19, 8, 40),
      durationSeconds: 40 * 60,
      activeCalories: 310,
      source: "watch",
    });
    const mirrored = workout({
      id: "strava",
      start: at(2026, 10, 19, 8, 2),
      end: at(2026, 10, 19, 8, 48),
      durationSeconds: 46 * 60,
      activeCalories: 400,
      source: "other",
    });
    const later = workout({
      id: "evening",
      activity: "strength",
      activityLabel: "Strength Training",
      start: at(2026, 10, 19, 18, 0),
      end: at(2026, 10, 19, 18, 45),
      durationSeconds: 45 * 60,
      activeCalories: 280,
      source: "watch",
    });
    const deduped = dedupeAppleHealthWorkouts([mirrored, watch, watch, later]);
    assert.deepEqual(
      deduped.map((item) => item.id),
      ["watch", "evening"]
    );
  });

  it("sums a Sunday week and skips the total when a calorie is missing", () => {
    const monday = workout({
      id: "mon",
      activity: "strength",
      activityLabel: "Strength Training",
      start: at(2026, 10, 19, 8),
      end: at(2026, 10, 19, 8, 48),
      durationSeconds: 48 * 60,
      activeCalories: 420,
    });
    const tuesday = workout({
      id: "tue",
      start: at(2026, 10, 20, 7),
      end: at(2026, 10, 20, 7, 30),
      durationSeconds: 30 * 60,
      activeCalories: 310,
    });
    const previousSaturday = workout({
      id: "sat",
      start: at(2026, 10, 17, 9),
      end: at(2026, 10, 17, 10),
      durationSeconds: 60 * 60,
      activeCalories: 500,
    });
    const today = new Date(2026, 9, 21, 12);
    const week = buildAppleHealthWeek([tuesday, previousSaturday, monday], today);
    assert.equal(week.workoutCount, 2);
    assert.equal(week.durationSeconds, 78 * 60);
    assert.equal(week.activeCalories, 730);
    assert.deepEqual(
      week.days.map((day) => day.label),
      ["Mon", "Tue"]
    );
    assert.equal(formatAppleHealthSummary(week), "730 kcal · 1 hr 18 min · 2 workouts");

    const missing = buildAppleHealthWeek(
      [monday, { ...tuesday, activeCalories: null }],
      today
    );
    assert.equal(missing.activeCalories, null);
    assert.equal(formatAppleHealthSummary(missing), "1 hr 18 min · 2 workouts");
  });
});
