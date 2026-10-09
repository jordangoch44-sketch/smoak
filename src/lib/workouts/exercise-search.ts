import { catalogExercises } from "@/data/exercise-db-catalog";
import { formerNamesFor } from "@/data/workout-exercise-library";
import {
  findLibraryExercise,
  POPULAR_EXERCISE_NAMES,
  type ExerciseEquipment,
  type ExerciseMuscle,
} from "@/lib/workouts/exercise-catalog";

export interface ExerciseSearchItem {
  name: string;
  muscle?: ExerciseMuscle | null;
  equipment?: ExerciseEquipment | null;
}

const NICKNAMES: readonly { token: string; phrase: string }[] = [
  { token: "rdl", phrase: "romanian deadlift" },
  { token: "sldl", phrase: "stiff leg deadlift" },
  { token: "sldl", phrase: "stiff-leg deadlift" },
  { token: "ohp", phrase: "overhead press" },
  { token: "ghr", phrase: "glute-ham" },
  { token: "ghr", phrase: "glute ham" },
  { token: "bss", phrase: "split squat" },
  { token: "cgbp", phrase: "close-grip bench" },
  { token: "cgbp", phrase: "close grip bench" },
];

const EQUIPMENT_WORDS: Record<ExerciseEquipment, readonly string[]> = {
  dumbbell: ["dumbbell", "dumbell", "db"],
  barbell: ["barbell", "bb"],
  kettlebell: ["kettlebell", "kb"],
  cable: ["cable"],
  machine: ["machine"],
  smith: ["smith"],
  band: ["band"],
  bodyweight: ["bodyweight", "bw"],
};

const MUSCLE_WORDS: Record<ExerciseMuscle, readonly string[]> = {
  chest: ["chest", "pec", "pecs"],
  back: ["back"],
  lats: ["lat", "lats"],
  shoulders: ["shoulder", "shoulders", "delt", "delts"],
  "rear-delts": ["rear delt", "rear delts"],
  biceps: ["bicep", "biceps"],
  triceps: ["tricep", "triceps"],
  quads: ["quad", "quads", "quadricep", "quadriceps"],
  hamstrings: ["hamstring", "hamstrings", "hams"],
  glutes: ["glute", "glutes"],
  calves: ["calf", "calves"],
  core: ["core", "ab", "abs"],
};

const catalogByName = new Map(
  catalogExercises().map((item) => [item.name.toLowerCase(), item])
);

const popularRank = new Map(
  POPULAR_EXERCISE_NAMES.map((name, index) => [name.toLowerCase(), index])
);

function words(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function wordHit(queryWord: string, word: string): boolean {
  if (word.startsWith(queryWord)) return true;
  if (!queryWord.startsWith(word) || word.length < 4) return false;
  const extra = queryWord.slice(word.length);
  return extra === "s" || extra === "es";
}

function hits(queryWord: string, field: readonly string[]): boolean {
  return field.some((word) => wordHit(queryWord, word));
}

const GROUP_WORDS = new Set<string>(
  [...Object.values(MUSCLE_WORDS), ...Object.values(EQUIPMENT_WORDS)].flat()
);

function isGroupWord(token: string): boolean {
  for (const word of GROUP_WORDS) {
    if (wordHit(token, word)) return true;
  }
  return false;
}

function nicknamesFor(name: string, aliases: readonly string[]): string[] {
  const haystack = `${name} ${aliases.join(" ")}`.toLowerCase();
  return NICKNAMES.filter((entry) => haystack.includes(entry.phrase)).map(
    (entry) => entry.token
  );
}

interface SearchDoc {
  nameWords: string[];
  aliasWords: string[];
  nicknameWords: string[];
  groupWords: string[];
  compactName: string;
}

function documentFor(item: ExerciseSearchItem): SearchDoc {
  const library = findLibraryExercise(item.name);
  const catalog = catalogByName.get(item.name.toLowerCase());
  const muscle = item.muscle ?? library?.muscle ?? catalog?.muscle ?? null;
  const equipment = item.equipment ?? catalog?.equipment ?? null;
  const aliases = formerNamesFor(item.name);
  return {
    nameWords: words(item.name),
    aliasWords: aliases.flatMap(words),
    nicknameWords: nicknamesFor(item.name, aliases),
    groupWords: [
      ...(muscle ? MUSCLE_WORDS[muscle] : []),
      ...(equipment ? EQUIPMENT_WORDS[equipment] : []),
    ].flatMap(words),
    compactName: compact(item.name),
  };
}

/**
 * Every typed word must match the name, a gym nickname, or the muscle/equipment.
 * Names that start with the query come first, then names that contain every word.
 */
export function rankExerciseSearch<T extends ExerciseSearchItem>(
  items: readonly T[],
  query: string
): T[] {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  const tokens = words(normalized);
  if (tokens.length === 0) return [...items];
  const compactQuery = compact(normalized);
  const groupQuery = tokens.every(isGroupWord);

  const ranked: { item: T; bucket: number }[] = [];
  for (const item of items) {
    const doc = documentFor(item);
    if (
      compactQuery.length >= 4 &&
      doc.compactName.includes(compactQuery) &&
      (!groupQuery || tokens.every((token) => hits(token, doc.groupWords)))
    ) {
      const bucket = !groupQuery && doc.compactName.startsWith(compactQuery) ? 4 : groupQuery ? 1 : 3;
      ranked.push({ item, bucket });
      continue;
    }
    let nameHits = 0;
    let nicknameHits = 0;
    let matched = true;
    for (const token of tokens) {
      if (groupQuery && !hits(token, doc.groupWords)) {
        matched = false;
        break;
      }
      if (hits(token, doc.nameWords)) {
        nameHits += 1;
        continue;
      }
      if (
        (tokens.length > 1 && hits(token, doc.aliasWords)) ||
        hits(token, doc.nicknameWords)
      ) {
        nicknameHits += 1;
        continue;
      }
      if (hits(token, doc.groupWords)) continue;
      matched = false;
      break;
    }
    if (!matched) continue;

    let bucket = 1;
    if (!groupQuery && doc.compactName.startsWith(compactQuery)) bucket = 4;
    else if (!groupQuery && nameHits === tokens.length) bucket = 3;
    else if (!groupQuery && nicknameHits > 0) bucket = 2;
    ranked.push({ item, bucket });
  }

  ranked.sort((a, b) => {
    if (a.bucket !== b.bucket) return b.bucket - a.bucket;
    const popularA = popularRank.get(a.item.name.toLowerCase()) ?? popularRank.size;
    const popularB = popularRank.get(b.item.name.toLowerCase()) ?? popularRank.size;
    if (popularA !== popularB) return popularA - popularB;
    const libraryA = findLibraryExercise(a.item.name) ? 0 : 1;
    const libraryB = findLibraryExercise(b.item.name) ? 0 : 1;
    if (libraryA !== libraryB) return libraryA - libraryB;
    return a.item.name.localeCompare(b.item.name, "en", { sensitivity: "base" });
  });
  return ranked.map((entry) => entry.item);
}
