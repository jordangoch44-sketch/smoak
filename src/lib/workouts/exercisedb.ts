import { catalogExerciseId } from "@/data/exercise-db-catalog";
import { WORKOUT_EXERCISE_LIBRARY } from "@/data/workout-exercise-library";

const RAPID_HOST = "edb-with-gifs-and-images-by-ascendapi.p.rapidapi.com";
const BASE = `https://${RAPID_HOST}`;

export interface ExerciseDbMedia {
  exerciseId: string;
  imageUrl?: string;
  gifUrl?: string;
  overview?: string;
  instructions?: string[];
}

export interface ExerciseGuide {
  gifUrl: string | null;
  overview: string | null;
  instructions: string[];
}

interface CacheEntry extends ExerciseDbMedia {
  /** Searched this week and nothing matched well enough to show. */
  miss?: boolean;
}

interface MediaCache {
  week: string;
  byName: Map<string, CacheEntry>;
  building?: Promise<void>;
}

function mediaWeekKey(now = new Date()): string {
  const day = now.getUTCDay();
  const sinceMonday = (day + 6) % 7;
  const monday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - sinceMonday
  );
  return new Date(monday).toISOString().slice(0, 10);
}

function cache(): MediaCache {
  const globalStore = globalThis as typeof globalThis & {
    __smoacExerciseDb?: MediaCache;
  };
  const week = mediaWeekKey();
  if (!globalStore.__smoacExerciseDb || globalStore.__smoacExerciseDb.week !== week) {
    globalStore.__smoacExerciseDb = {
      week,
      byName: new Map(),
    };
  }
  return globalStore.__smoacExerciseDb;
}

export function exerciseDbConfigured(): boolean {
  return Boolean(process.env.EXERCISEDB_RAPIDAPI_KEY?.trim());
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

function httpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  if (!url.startsWith("https://")) return undefined;
  return url;
}

function urlFromSet(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return (
    httpUrl(record["360p"]) ||
    httpUrl(record["480p"]) ||
    httpUrl(record["720p"]) ||
    httpUrl(record["1080p"]) ||
    Object.values(record).map(httpUrl).find(Boolean)
  );
}

function readSteps(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const steps = value.flatMap((item) => {
    if (typeof item !== "string") return [];
    const text = item.replace(/^step:\s*\d+\s*/i, "").replace(/\s+/g, " ").trim();
    return text ? [text.slice(0, 280)] : [];
  });
  return steps.length > 0 ? steps.slice(0, 12) : undefined;
}

function readOverview(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 500) : undefined;
}

function readMedia(item: Record<string, unknown>): ExerciseDbMedia | null {
  const exerciseId = typeof item.exerciseId === "string" ? item.exerciseId.trim() : "";
  if (!exerciseId) return null;
  const imageUrl = httpUrl(item.imageUrl) || urlFromSet(item.imageUrls);
  const gifUrl = httpUrl(item.gifUrl) || urlFromSet(item.gifUrls);
  const overview = readOverview(item.overview);
  const instructions = readSteps(item.instructions);
  return {
    exerciseId,
    ...(imageUrl ? { imageUrl } : {}),
    ...(gifUrl ? { gifUrl } : {}),
    ...(overview ? { overview } : {}),
    ...(instructions ? { instructions } : {}),
  };
}

async function exerciseDbGet(path: string): Promise<unknown> {
  const key = process.env.EXERCISEDB_RAPIDAPI_KEY?.trim();
  if (!key) return null;
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": RAPID_HOST,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

async function mediaForExercise(exerciseId: string): Promise<ExerciseDbMedia | null> {
  const body = await exerciseDbGet(`/api/v1/exercises/${encodeURIComponent(exerciseId)}`);
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: unknown }).data;
  const record =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : (body as Record<string, unknown>);
  return readMedia({ ...record, exerciseId });
}

async function mapPool<T>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await run(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

async function ensureLibraryMedia(): Promise<void> {
  const store = cache();
  if (store.building) {
    await store.building;
    return;
  }
  const missing = WORKOUT_EXERCISE_LIBRARY.filter(
    (exercise) => !store.byName.has(nameKey(exercise.name))
  );
  if (missing.length === 0) return;

  store.building = mapPool(missing, 4, async (exercise) => {
    const key = nameKey(exercise.name);
    if (store.byName.has(key) || !exercise.exerciseId) return;
    try {
      const match = await mediaForExercise(exercise.exerciseId);
      store.byName.set(key, match ?? { exerciseId: exercise.exerciseId, miss: true });
    } catch {
      /* Leave it unset so a later request can retry a network failure. */
    }
  }).finally(() => {
    store.building = undefined;
  });
  await store.building;
}

export async function libraryExerciseMedia(): Promise<Record<string, ExerciseDbMedia>> {
  if (!exerciseDbConfigured()) return {};
  await ensureLibraryMedia();
  const media: Record<string, ExerciseDbMedia> = {};
  for (const exercise of WORKOUT_EXERCISE_LIBRARY) {
    const entry = cache().byName.get(nameKey(exercise.name));
    if (!entry || entry.miss || !entry.exerciseId) continue;
    media[nameKey(exercise.name)] = {
      exerciseId: entry.exerciseId,
      ...(entry.imageUrl ? { imageUrl: entry.imageUrl } : {}),
      ...(entry.gifUrl ? { gifUrl: entry.gifUrl } : {}),
    };
  }
  return media;
}

async function guideEntry(name: string): Promise<CacheEntry | null> {
  if (!exerciseDbConfigured()) return null;
  const key = nameKey(name);
  const store = cache();
  const cached = store.byName.get(key);
  if (cached?.instructions?.length) return cached;
  const exerciseId =
    cached?.exerciseId ||
    WORKOUT_EXERCISE_LIBRARY.find((item) => nameKey(item.name) === key)?.exerciseId ||
    catalogExerciseId(name);
  if (!exerciseId) return null;
  try {
    const fresh = await mediaForExercise(exerciseId);
    if (!fresh) {
      if (!cached) store.byName.set(key, { exerciseId, miss: true });
      return cached && !cached.miss ? cached : null;
    }
    store.byName.set(key, fresh);
    return fresh;
  } catch {
    return cached && !cached.miss ? cached : null;
  }
}

export async function exerciseGifUrl(name: string): Promise<string | null> {
  const entry = await guideEntry(name);
  return entry?.gifUrl ?? null;
}

export async function exerciseGuide(name: string): Promise<ExerciseGuide> {
  const entry = await guideEntry(name);
  return {
    gifUrl: entry?.gifUrl ?? null,
    overview: entry?.overview ?? null,
    instructions: entry?.instructions ?? [],
  };
}
