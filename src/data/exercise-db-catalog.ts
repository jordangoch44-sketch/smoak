import catalog from "@/data/exercise-db-catalog.json";
import type { ExerciseEquipment, ExerciseMuscle } from "@/lib/workouts/exercise-catalog";

interface RawCatalogExercise {
  exerciseId: string;
  name: string;
  imageUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
}

export interface CatalogExercise {
  exerciseId: string;
  name: string;
  imageUrl: string;
  muscle: ExerciseMuscle | null;
  equipment: ExerciseEquipment | null;
}

const MUSCLE: Record<string, ExerciseMuscle> = {
  pectorals: "chest",
  "serratus anterior": "chest",
  "latissimus dorsi": "lats",
  "upper back": "back",
  trapezius: "back",
  "levator scapulae": "back",
  "erector spinae": "back",
  deltoids: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  abductors: "glutes",
  adductors: "glutes",
  calves: "calves",
  abdominals: "core",
};

const PART: Record<string, ExerciseMuscle> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  waist: "core",
  "lower legs": "calves",
};

function muscleFor(item: RawCatalogExercise): ExerciseMuscle | null {
  const name = item.name.toLowerCase();
  if (
    name.includes("rear delt") ||
    name.includes("reverse fly") ||
    name.includes("face pull")
  ) {
    return "rear-delts";
  }
  for (const target of item.targetMuscles) {
    const mapped = MUSCLE[target.toLowerCase()];
    if (mapped) return mapped;
  }
  for (const part of item.bodyParts) {
    const mapped = PART[part.toLowerCase()];
    if (mapped) return mapped;
  }
  return null;
}

function equipmentFor(values: readonly string[]): ExerciseEquipment | null {
  const gear = new Set(values.map((value) => value.toLowerCase()));
  const has = (...names: string[]) => names.some((name) => gear.has(name));
  if (has("smith machine")) return "smith";
  if (has("barbell", "olympic barbell", "ez bar", "trap bar")) return "barbell";
  if (has("dumbbell", "hammer")) return "dumbbell";
  if (has("cable", "rope")) return "cable";
  if (has("kettlebell")) return "kettlebell";
  if (has("resistance band")) return "band";
  if (
    has(
      "leverage machine",
      "sled machine",
      "elliptical machine",
      "stationary bike",
      "stepmill machine",
      "ski ergometer",
      "upper body ergometer"
    )
  ) {
    return "machine";
  }
  if (
    has(
      "bodyweight",
      "assisted",
      "ab wheel",
      "weighted",
      "suspension trainer",
      "bosu ball",
      "medicine ball",
      "stability ball",
      "roller",
      "towel",
      "tennis ball",
      "tire"
    )
  ) {
    return "bodyweight";
  }
  return null;
}

const exercises: CatalogExercise[] = (catalog as RawCatalogExercise[]).map((item) => ({
  exerciseId: item.exerciseId,
  name: item.name,
  imageUrl: item.imageUrl.startsWith("https://") ? item.imageUrl : "",
  muscle: muscleFor(item),
  equipment: equipmentFor(item.equipments),
}));

const byName = new Map(exercises.map((item) => [item.name.toLowerCase(), item]));

export function catalogExercises(): readonly CatalogExercise[] {
  return exercises;
}

export function catalogExerciseId(name: string): string | undefined {
  return byName.get(name.trim().toLowerCase())?.exerciseId;
}

export function catalogExerciseImage(name: string): string {
  return byName.get(name.trim().toLowerCase())?.imageUrl ?? "";
}
