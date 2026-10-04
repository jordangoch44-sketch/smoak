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
const guidePromises = new Map<string, Promise<ExerciseGuide>>();

export function loadLibraryExerciseMedia(): Promise<Record<string, LibraryExerciseMedia>> {
  if (!catalogPromise) {
    catalogPromise = fetch("/api/workouts/exercise-media")
      .then((response) =>
        response.ok ? (response.json() as Promise<MediaResponse>) : Promise.resolve({} as MediaResponse)
      )
      .then((body) => body.media ?? {})
      .catch(() => ({}));
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
  const key = name.trim().toLowerCase();
  if (!key) return Promise.resolve(EMPTY_GUIDE);
  const existing = guidePromises.get(key);
  if (existing) return existing;
  const load = fetchGuide(name);
  guidePromises.set(key, load);
  return load;
}
