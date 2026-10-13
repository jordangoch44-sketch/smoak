import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogExercises } from "@/data/exercise-db-catalog";
import { exerciseLabel, storedExerciseName } from "@/data/exercise-display";
import { rankExerciseSearch } from "@/lib/workouts/exercise-search";

const catalog = catalogExercises();

function top(query: string, count = 5): string[] {
  return rankExerciseSearch(catalog, query)
    .slice(0, count)
    .map((item) => item.name);
}

describe("exercise search", () => {
  it("names the bench hip thrust and keeps the floor bridge separate", () => {
    assert.equal(top("Barbell Hip Thrust", 1)[0], "Barbell Lying Lifting (On Hip)");
    assert.equal(exerciseLabel("Barbell Lying Lifting (On Hip)"), "Barbell Hip Thrust");
    assert.equal(exerciseLabel(top("Hip Thrust", 1)[0] ?? ""), "Barbell Hip Thrust");
    assert.ok(top("Hip Thrust", 8).some((name) => name === "Band Hip Thrusts On Knees"));
    assert.ok(!top("Hip Thrust", 8).some((name) => /glute bridge/i.test(name)));
    assert.equal(storedExerciseName("Barbell Hip Thrust"), "Barbell Lying Lifting (On Hip)");
  });

  it("maps reverse lunge and rear lunge onto the reverse step", () => {
    const reverse = top("Reverse Lunge", 3);
    assert.equal(reverse[0], "Barbell Rear Lunge");
    assert.equal(reverse[1], "Dumbbell Rear Lunge");
    assert.ok(!/jump/i.test(reverse[0] ?? ""));
    assert.equal(top("Rear Lunge", 1)[0], "Barbell Rear Lunge");
    assert.equal(exerciseLabel("Barbell Rear Lunge"), "Barbell Reverse Lunge");
  });

  it("sends RDL to Romanian deadlifts and keeps the other hinges out", () => {
    const rdls = top("RDL", 4);
    assert.equal(rdls[0], "Barbell Romanian Deadlift");
    assert.equal(rdls[1], "Dumbbell Romanian Deadlift");
    assert.ok(!rdls.slice(0, 2).some((name) => /stiff|straight-leg|^Barbell Deadlift$/i.test(name)));
    assert.equal(top("DB RDL", 1)[0], "Dumbbell Romanian Deadlift");
    assert.notEqual(top("DB RDL", 1)[0], "Barbell Romanian Deadlift");
  });

  it("ranks the cable lat pulldown first", () => {
    assert.equal(top("Lat Pulldown", 1)[0], "Cable Lat Pulldown Full Range Of Motion");
    assert.equal(
      exerciseLabel("Cable Lat Pulldown Full Range Of Motion"),
      "Cable Lat Pulldown"
    );
  });

  it("ranks the back squat above the camera-angle duplicate", () => {
    const squats = top("Back Squat", 6);
    assert.equal(squats[0], "Barbell Full Squat");
    assert.ok(!squats.some((name) => /back pov/i.test(name)));
    assert.equal(exerciseLabel("Barbell Full Squat"), "Barbell Back Squat");
    assert.ok(squats.includes("Barbell High Bar Squat"));
    assert.ok(!squats.includes("Barbell Front Squat"));
    assert.ok(!squats.some((name) => /row/i.test(name)));
  });

  it("finds the Bulgarian from the gym name and the abbreviation", () => {
    assert.equal(top("Bulgarian Split Squat", 1)[0], "Dumbbell Single Leg Split Squat");
    assert.equal(top("RFESS", 1)[0], "Dumbbell Single Leg Split Squat");
    assert.notEqual(top("Bulgarian Split Squat", 1)[0], "Barbell Split Squat");
    assert.equal(
      exerciseLabel("Dumbbell Single Leg Split Squat"),
      "Dumbbell Bulgarian Split Squat"
    );
    assert.equal(top("Smith Bulgarian", 1)[0], "Smith Single Leg Split Squat");
    assert.equal(
      exerciseLabel("Smith Single Leg Split Squat"),
      "Smith Machine Bulgarian Split Squat"
    );
  });

  it("ranks the straight-bar triceps pushdown first and skips the lat variation", () => {
    const pushdowns = top("Tri Pushdown", 6);
    assert.equal(pushdowns[0], "Cable Pushdown");
    assert.equal(exerciseLabel(pushdowns[0] ?? ""), "Cable Triceps Pushdown");
    assert.ok(pushdowns.includes("Cable Pushdown (With Rope Attachment)"));
    assert.ok(!pushdowns.some((name) => /straight arm/i.test(name)));
  });

  it("forgives a one-letter misspelling", () => {
    assert.equal(top("romainian deadlift", 1)[0], "Barbell Romanian Deadlift");
  });

  it("keeps the stored title when a gym display name is saved", () => {
    assert.equal(storedExerciseName("Barbell Back Squat"), "Barbell Full Squat");
    assert.equal(storedExerciseName("back squat"), "Barbell Full Squat");
    assert.equal(storedExerciseName("Reverse Lunge"), "Reverse Lunge");
    assert.equal(storedExerciseName("My Custom Lift"), "My Custom Lift");
  });
});
