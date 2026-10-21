/**
 * Attach a how-to to every catalog exercise.
 * Uses the free ExerciseDB list at /tmp/oss-exercises.json when it is present,
 * then the steps already bundled for the curated library, then a generated how-to.
 *
 * Run: node scripts/build-exercise-steps.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

register("./test-alias-hook.mjs", import.meta.url);

const { formatExerciseName } = await import("../src/data/workout-exercise-library.ts");
const { WORKOUT_EXERCISE_MEDIA } = await import("../src/data/workout-exercise-media.ts");
const { cleanExerciseSteps, generateExerciseSteps } = await import(
  "../src/lib/workouts/exercise-step-copy.ts"
);

const catalog = JSON.parse(readFileSync(new URL("../src/data/exercise-db-catalog.json", import.meta.url), "utf8"));
const oss = JSON.parse(readFileSync("/tmp/oss-exercises.json", "utf8"));

const JUNK =
  /\b(mega|calm|gentle|intense|amplified|blunt|targeted|flexible|classic|contracted|intermediate|athletic|triple|rotated|pro|firm|active|soft|hard|mini|perfect|rigid|explosive|static|heavy|ground|mat)\b/gi;

function norm(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ").trim();
}

function fold(name) {
  return norm(name).replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

const byName = new Map();
for (const item of oss) {
  const key = norm(item.name);
  const steps = cleanExerciseSteps(item.instructions);
  if (steps.length === 0) continue;
  if (!byName.has(key) || steps.length > byName.get(key).length) byName.set(key, steps);
  const folded = fold(item.name);
  if (!byName.has(folded)) byName.set(folded, steps);
}

function forms(name) {
  const raw = norm(name);
  const junked = norm(raw.replace(JUNK, " "));
  const bare = norm(junked.replace(/\([^)]*\)/g, " "));
  return [...new Set([raw, fold(raw), junked, fold(junked), bare, fold(bare)])];
}

function fromExerciseDb(name) {
  const list = forms(name);
  for (const form of list) {
    const steps = byName.get(form);
    if (steps?.length) return steps;
  }
  for (const form of list) {
    const words = form.split(" ").filter(Boolean);
    for (let size = words.length - 1; size >= 2; size -= 1) {
      const steps = byName.get(words.slice(0, size).join(" "));
      if (steps?.length) return steps;
    }
  }
  return null;
}

const stepsByName = {};
let fromBundle = 0;
let fromDb = 0;
let generated = 0;
const generatedNames = [];

for (const item of catalog) {
  const key = norm(formatExerciseName(item.name));
  const bundled = WORKOUT_EXERCISE_MEDIA[key]?.instructions;
  if (bundled?.length) {
    stepsByName[key] = [...bundled];
    fromBundle += 1;
    continue;
  }
  const sourced = fromExerciseDb(item.name);
  if (sourced?.length) {
    stepsByName[key] = sourced;
    fromDb += 1;
    continue;
  }
  stepsByName[key] = generateExerciseSteps(item.name);
  generated += 1;
  generatedNames.push(item.name);
}

const missing = catalog.filter((item) => {
  const key = norm(formatExerciseName(item.name));
  return !stepsByName[key]?.length;
});
if (missing.length) {
  throw new Error(`Still missing steps for ${missing.map((item) => item.name).join(", ")}`);
}

writeFileSync(
  new URL("../src/data/exercise-steps.json", import.meta.url),
  `${JSON.stringify(stepsByName, null, 2)}\n`
);

console.log(
  JSON.stringify(
    {
      exercises: catalog.length,
      fromBundle,
      fromDb,
      generated,
      generatedNames,
    },
    null,
    2
  )
);
