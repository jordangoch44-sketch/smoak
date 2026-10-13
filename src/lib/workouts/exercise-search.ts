import { catalogExercises } from "@/data/exercise-db-catalog";
import { displayAliases, exerciseLabel } from "@/data/exercise-display";
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

/** Typed abbreviations, expanded before matching. */
const ABBREVIATIONS: Record<string, string> = {
  rdl: "romanian deadlift",
  sldl: "stiff leg deadlift",
  ohp: "overhead press",
  ghr: "glute ham raise",
  bss: "bulgarian split squat",
  rfess: "bulgarian split squat",
  cgbp: "close grip bench",
  db: "dumbbell",
  bb: "barbell",
  kb: "kettlebell",
  bw: "bodyweight",
  tri: "triceps",
  bi: "biceps",
  pd: "pulldown",
};

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

const EQUIPMENT_TOKENS = new Set<string>(Object.values(EQUIPMENT_WORDS).flat());

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

/** One substitution, insertion, or deletion. Used for finished words of 5+ letters. */
function withinOne(left: string, right: string): boolean {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  if (left.length > right.length) return withinOne(right, left);
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length === right.length) i += 1;
    j += 1;
  }
  if (j < right.length || i < left.length) edits += 1;
  return edits <= 1;
}

function fuzzyHit(queryWord: string, field: readonly string[]): boolean {
  if (queryWord.length < 5) return false;
  return field.some((word) => word.length >= 5 && withinOne(queryWord, word));
}

function expand(tokens: readonly string[]): string[] {
  const expanded: string[] = [];
  for (const token of tokens) {
    const phrase = ABBREVIATIONS[token];
    if (phrase) expanded.push(...words(phrase));
    else expanded.push(token);
  }
  return expanded;
}

interface SearchDoc {
  displayName: string;
  displayWords: string[];
  originalWords: string[];
  aliasWords: string[];
  aliasCompacts: string[];
  groupWords: string[];
  displayCompact: string;
  originalCompact: string;
  pov: boolean;
  junk: boolean;
}

const docs = new Map<string, SearchDoc>();

function documentFor(item: ExerciseSearchItem): SearchDoc {
  const cacheKey = item.name.toLowerCase();
  const cached = docs.get(cacheKey);
  if (cached) return cached;
  const library = findLibraryExercise(item.name);
  const catalog = catalogByName.get(cacheKey);
  const muscle = item.muscle ?? library?.muscle ?? catalog?.muscle ?? null;
  const equipment = item.equipment ?? catalog?.equipment ?? null;
  const displayName = exerciseLabel(item.name);
  const aliases = [...formerNamesFor(item.name), ...displayAliases(item.name)];
  const doc: SearchDoc = {
    displayName,
    displayWords: words(displayName),
    originalWords: words(item.name),
    aliasWords: aliases.flatMap(words),
    aliasCompacts: aliases.map(compact),
    groupWords: [
      ...(muscle ? MUSCLE_WORDS[muscle] : []),
      ...(equipment ? EQUIPMENT_WORDS[equipment] : []),
    ].flatMap(words),
    displayCompact: compact(displayName),
    originalCompact: compact(item.name),
    pov: /\(\s*back pov\s*\)/i.test(item.name),
    junk: /\b(mega|calm|gentle|intense|amplified|blunt)\b/i.test(item.name),
  };
  docs.set(cacheKey, doc);
  return doc;
}

function equipmentOk(
  item: ExerciseSearchItem,
  doc: SearchDoc,
  tokens: readonly string[]
): boolean {
  if (tokens.length === 0) return true;
  const wordsForGear = [
    ...(item.equipment ? EQUIPMENT_WORDS[item.equipment] : []),
    ...doc.originalWords,
    ...doc.displayWords,
  ];
  return tokens.every((token) => hits(token, wordsForGear));
}

/**
 * Gym-name search. Exact display title, then an exact alias, then every word
 * in the title, then a one-letter misspelling. Equipment in the query keeps
 * other equipment out.
 */
export function rankExerciseSearch<T extends ExerciseSearchItem>(
  items: readonly T[],
  query: string
): T[] {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  const rawTokens = words(normalized);
  if (rawTokens.length === 0) return [...items];
  const tokens = expand(rawTokens);
  const rawCompact = compact(normalized);
  const expandedCompact = compact(tokens.join(" "));
  const equipmentTokens = tokens.filter((token) => EQUIPMENT_TOKENS.has(token));
  const movementTokens = tokens.filter((token) => !EQUIPMENT_TOKENS.has(token));
  const allowPov = rawTokens.includes("pov");

  const ranked: { item: T; score: number }[] = [];
  for (const item of items) {
    const doc = documentFor(item);
    if (doc.pov && !allowPov) continue;
    if (!equipmentOk(item, doc, equipmentTokens)) continue;

    let score = 0;
    if (movementTokens.length === 0) {
      score = 120;
    } else if (
      doc.displayCompact === expandedCompact ||
      doc.displayCompact === rawCompact
    ) {
      score = 600;
    } else if (
      doc.aliasCompacts.some((alias) => alias === expandedCompact || alias === rawCompact)
    ) {
      score = 500;
    } else if (doc.originalCompact === expandedCompact || doc.originalCompact === rawCompact) {
      score = 480;
    } else {
      let fuzzy = false;
      let displayHits = 0;
      let nameHits = 0;
      let groupOnly = false;
      let matched = true;
      for (const token of movementTokens) {
        if (hits(token, doc.displayWords)) {
          displayHits += 1;
          nameHits += 1;
          continue;
        }
        if (hits(token, doc.aliasWords) || hits(token, doc.originalWords)) {
          nameHits += 1;
          continue;
        }
        if (hits(token, doc.groupWords)) {
          groupOnly = true;
          continue;
        }
        const fuzzyField = [...doc.displayWords, ...doc.aliasWords, ...doc.originalWords];
        if (!fuzzy && fuzzyHit(token, fuzzyField)) {
          fuzzy = true;
          continue;
        }
        matched = false;
        break;
      }
      if (!matched) continue;
      const extra = Math.max(0, doc.displayWords.length - movementTokens.length);
      const tight = Math.max(0, 24 - extra);
      if (fuzzy) score = 100 + tight;
      else if (displayHits === movementTokens.length) score = 360 + tight;
      else if (!groupOnly && nameHits === movementTokens.length) score = 240 + tight;
      else score = 160 + tight;
    }
    if (doc.junk) score -= 40;
    ranked.push({ item, score });
  }

  const namedMatch = movementTokens.length > 1 && ranked.some((entry) => entry.score >= 240);
  const visible = namedMatch ? ranked.filter((entry) => entry.score >= 240) : ranked;

  visible.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    const popularA = popularRank.get(a.item.name.toLowerCase()) ?? popularRank.size;
    const popularB = popularRank.get(b.item.name.toLowerCase()) ?? popularRank.size;
    if (popularA !== popularB) return popularA - popularB;
    const libraryA = findLibraryExercise(a.item.name) ? 0 : 1;
    const libraryB = findLibraryExercise(b.item.name) ? 0 : 1;
    if (libraryA !== libraryB) return libraryA - libraryB;
    return exerciseLabel(a.item.name).localeCompare(exerciseLabel(b.item.name), "en", {
      sensitivity: "base",
    });
  });
  return visible.map((entry) => entry.item);
}
