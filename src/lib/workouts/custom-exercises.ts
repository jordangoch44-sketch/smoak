import {
  EXERCISE_EQUIPMENT_OPTIONS,
  EXERCISE_MUSCLE_OPTIONS,
  type ExerciseEquipment,
  type ExerciseMuscle,
} from "@/lib/workouts/exercise-catalog";

export type CustomExerciseType = "strength" | "bodyweight" | "timed" | "cardio";

export const CUSTOM_EXERCISE_TYPES: readonly { id: CustomExerciseType; label: string }[] = [
  { id: "strength", label: "Strength" },
  { id: "bodyweight", label: "Bodyweight" },
  { id: "timed", label: "Timed" },
  { id: "cardio", label: "Cardio" },
];

/** An exercise the client added themselves. Name is the only required field. */
export interface CustomExercise {
  name: string;
  imageUrl?: string;
  equipment?: ExerciseEquipment;
  muscle?: ExerciseMuscle;
  otherMuscles?: ExerciseMuscle[];
  exerciseType?: CustomExerciseType;
}

const STORAGE_KEY = "smoac.custom-exercises";
const MAX_STORED = 80;
const MAX_IMAGE_CHARS = 120_000;

const EQUIPMENT_IDS = new Set<string>(EXERCISE_EQUIPMENT_OPTIONS.map((option) => option.id));
const MUSCLE_IDS = new Set<string>(EXERCISE_MUSCLE_OPTIONS.map((option) => option.id));
const TYPE_IDS = new Set<string>(CUSTOM_EXERCISE_TYPES.map((option) => option.id));

export function exerciseTypeLabel(type: CustomExerciseType): string {
  return CUSTOM_EXERCISE_TYPES.find((option) => option.id === type)?.label ?? type;
}

export function sanitizeExerciseImage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const image = value.trim();
  if (!image || image.length > MAX_IMAGE_CHARS) return undefined;
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) return undefined;
  return image;
}

export function customExerciseFields(
  value:
    | {
        imageUrl?: unknown;
        equipment?: unknown;
        muscle?: unknown;
        otherMuscles?: unknown;
        exerciseType?: unknown;
      }
    | null
    | undefined
): Omit<CustomExercise, "name"> {
  if (!value) return {};
  const fields: Omit<CustomExercise, "name"> = {};
  const imageUrl = sanitizeExerciseImage(value.imageUrl);
  if (imageUrl) fields.imageUrl = imageUrl;
  if (typeof value.equipment === "string" && EQUIPMENT_IDS.has(value.equipment)) {
    fields.equipment = value.equipment as ExerciseEquipment;
  }
  if (typeof value.muscle === "string" && MUSCLE_IDS.has(value.muscle)) {
    fields.muscle = value.muscle as ExerciseMuscle;
  }
  if (Array.isArray(value.otherMuscles)) {
    const other = value.otherMuscles.filter(
      (muscle): muscle is ExerciseMuscle =>
        typeof muscle === "string" && MUSCLE_IDS.has(muscle) && muscle !== fields.muscle
    );
    if (other.length > 0) fields.otherMuscles = other.slice(0, 4);
  }
  if (typeof value.exerciseType === "string" && TYPE_IDS.has(value.exerciseType)) {
    fields.exerciseType = value.exerciseType as CustomExerciseType;
  }
  return fields;
}

export function loadCustomExercises(): CustomExercise[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Partial<CustomExercise>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      if (!name) return [];
      return [{ name: name.slice(0, 80), ...customExerciseFields(record) }];
    });
  } catch {
    return [];
  }
}

export function saveCustomExercise(exercise: CustomExercise): void {
  if (typeof window === "undefined") return;
  const name = exercise.name.trim();
  if (!name) return;
  const next: CustomExercise = { name: name.slice(0, 80), ...customExerciseFields(exercise) };
  const others = loadCustomExercises().filter(
    (item) => item.name.toLowerCase() !== next.name.toLowerCase()
  );
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([next, ...others].slice(0, MAX_STORED))
  );
}

/** Square JPEG small enough to keep on the workout. Null when the file cannot be used. */
export async function readExercisePhoto(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/") || file.size > 12_000_000) return null;
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256
    );
    let quality = 0.72;
    let url = canvas.toDataURL("image/jpeg", quality);
    while (url.length > MAX_IMAGE_CHARS && quality > 0.45) {
      quality -= 0.08;
      url = canvas.toDataURL("image/jpeg", quality);
    }
    return url.length <= MAX_IMAGE_CHARS ? url : null;
  } finally {
    bitmap.close();
  }
}
