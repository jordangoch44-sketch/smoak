import { WORKOUT_EXERCISE_MEDIA, type BundledExerciseMedia } from "@/data/workout-exercise-media";
import { POPULAR_EXERCISE_NAMES } from "@/lib/workouts/exercise-catalog";

export type { BundledExerciseMedia };

/** Still, clip, and steps shipped with the app, keyed by exercise name. */
export function bundledExerciseMedia(name: string): BundledExerciseMedia | null {
  return WORKOUT_EXERCISE_MEDIA[name.trim().toLowerCase()] ?? null;
}

/** Bump when regenerated thumbs should replace a long-lived browser cache. */
const THUMB_VERSION = "1";

const warmedThumbs = new Set<string>();
let libraryWarmStarted = false;

export function exerciseThumbSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 128px still on this origin. List circles use this instead of the 360px ExerciseDB PNG. */
export function libraryThumbUrl(name: string): string {
  if (!bundledExerciseMedia(name)?.imageUrl) return "";
  const slug = exerciseThumbSlug(name);
  if (!slug) return "";
  return `/exercises/thumbs/${slug}.jpg?v=${THUMB_VERSION}`;
}

function queueThumb(name: string, priority: "high" | "auto") {
  const url = libraryThumbUrl(name);
  if (!url || warmedThumbs.has(url)) return;
  warmedThumbs.add(url);
  const img = new Image();
  img.decoding = "async";
  img.fetchPriority = priority;
  img.src = url;
}

/** Pull list stills into cache before Add exercise opens, popular names first. */
export function warmExerciseLibraryThumbs() {
  if (typeof window === "undefined" || libraryWarmStarted) return;
  libraryWarmStarted = true;
  const popular = new Set(POPULAR_EXERCISE_NAMES.map((name) => name.toLowerCase()));
  const names = Object.keys(WORKOUT_EXERCISE_MEDIA);
  for (const name of names) {
    if (popular.has(name)) queueThumb(name, "high");
  }
  const rest = names.filter((name) => !popular.has(name));
  const pump = () => {
    const batch = rest.splice(0, 16);
    if (batch.length === 0) return;
    for (const name of batch) queueThumb(name, "auto");
    if (rest.length > 0) window.setTimeout(pump, 40);
  };
  window.setTimeout(pump, 50);
}

export interface LibraryExerciseMedia {
  exerciseId: string;
  imageUrl?: string;
  gifUrl?: string;
}

export interface ExerciseGuide {
  gifUrl: string | null;
  overview: string | null;
  instructions: string[];
}

interface MediaResponse {
  configured?: boolean;
  media?: Record<string, LibraryExerciseMedia>;
  gifUrl?: string | null;
  overview?: string | null;
  instructions?: string[];
}

const EMPTY_GUIDE: ExerciseGuide = { gifUrl: null, overview: null, instructions: [] };

let catalogPromise: Promise<Record<string, LibraryExerciseMedia>> | null = null;
let catalogCache: Record<string, LibraryExerciseMedia> | null = null;
const guidePromises = new Map<string, Promise<ExerciseGuide>>();
const guideCache = new Map<string, ExerciseGuide>();

function mediaKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Still already loaded for the library circle, so the detail sheet can open on it. */
export function cachedLibraryStill(name: string): string {
  return catalogCache?.[mediaKey(name)]?.imageUrl ?? "";
}

export function cachedExerciseGuide(name: string): ExerciseGuide | null {
  return guideCache.get(mediaKey(name)) ?? null;
}

export function loadLibraryExerciseMedia(): Promise<Record<string, LibraryExerciseMedia>> {
  if (!catalogPromise) {
    catalogPromise = fetch("/api/workouts/exercise-media")
      .then((response) =>
        response.ok ? (response.json() as Promise<MediaResponse>) : Promise.resolve({} as MediaResponse)
      )
      .then((body) => {
        catalogCache = body.media ?? {};
        return catalogCache;
      })
      .catch(() => {
        catalogCache = {};
        return catalogCache;
      });
  }
  return catalogPromise;
}

function fetchGuide(name: string): Promise<ExerciseGuide> {
  return fetch(`/api/workouts/exercise-media?name=${encodeURIComponent(name)}`)
    .then((response) =>
      response.ok ? (response.json() as Promise<MediaResponse>) : Promise.resolve({} as MediaResponse)
    )
    .then((body) => ({
      gifUrl: body.gifUrl?.trim() || null,
      overview: body.overview?.trim() || null,
      instructions: Array.isArray(body.instructions)
        ? body.instructions.filter((step): step is string => typeof step === "string" && step.trim().length > 0)
        : [],
    }))
    .catch(() => EMPTY_GUIDE);
}

export function loadExerciseGif(name: string): Promise<string | null> {
  return loadExerciseGuide(name).then((guide) => guide.gifUrl);
}

export function loadExerciseGuide(name: string): Promise<ExerciseGuide> {
  const key = mediaKey(name);
  if (!key) return Promise.resolve(EMPTY_GUIDE);
  const cached = guideCache.get(key);
  if (cached) return Promise.resolve(cached);
  const existing = guidePromises.get(key);
  if (existing) return existing;
  const load = fetchGuide(name).then((guide) => {
    guideCache.set(key, guide);
    return guide;
  });
  guidePromises.set(key, load);
  return load;
}
