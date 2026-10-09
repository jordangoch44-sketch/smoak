/**
 * Pull the paid ExerciseDB list into src/data/exercise-db-catalog.json.
 * Run: node scripts/sync-exercise-db-catalog.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .split("\n")
  .find((entry) => entry.startsWith("EXERCISEDB_RAPIDAPI_KEY="));
const key = line?.slice("EXERCISEDB_RAPIDAPI_KEY=".length).trim().replace(/^"|"$/g, "");
if (!key) throw new Error("EXERCISEDB_RAPIDAPI_KEY is missing");

const host = "edb-with-gifs-and-images-by-ascendapi.p.rapidapi.com";
const exercises = [];
let after = "";

while (exercises.length < 5000) {
  const url = new URL(`https://${host}/api/v1/exercises`);
  url.searchParams.set("limit", "25");
  if (after) url.searchParams.set("after", after);
  const response = await fetch(url, {
    headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host },
  });
  if (!response.ok) throw new Error(`${response.status} ${url.pathname}`);
  const body = await response.json();
  const page = Array.isArray(body.data) ? body.data : [];
  for (const item of page) {
    if (!item?.exerciseId || !item?.name) continue;
    exercises.push({
      exerciseId: String(item.exerciseId),
      name: String(item.name).trim().replace(/\s+/g, " "),
      imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
      bodyParts: Array.isArray(item.bodyParts) ? item.bodyParts : [],
      equipments: Array.isArray(item.equipments) ? item.equipments : [],
      targetMuscles: Array.isArray(item.targetMuscles) ? item.targetMuscles : [],
    });
  }
  if (!body.meta?.hasNextPage || !body.meta.nextCursor) break;
  after = body.meta.nextCursor;
}

const byName = new Map();
for (const exercise of exercises) {
  const keyName = exercise.name.toLowerCase();
  if (!byName.has(keyName)) byName.set(keyName, exercise);
}

const unique = [...byName.values()].sort((a, b) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" })
);

writeFileSync(
  new URL("../src/data/exercise-db-catalog.json", import.meta.url),
  `${JSON.stringify(unique, null, 2)}\n`
);

const muscles = new Set();
const parts = new Set();
const gear = new Set();
for (const exercise of unique) {
  for (const muscle of exercise.targetMuscles) muscles.add(muscle);
  for (const part of exercise.bodyParts) parts.add(part);
  for (const item of exercise.equipments) gear.add(item);
}
console.log(
  JSON.stringify(
    {
      fetched: exercises.length,
      unique: unique.length,
      muscles: [...muscles].sort(),
      parts: [...parts].sort(),
      gear: [...gear].sort(),
    },
    null,
    2
  )
);
