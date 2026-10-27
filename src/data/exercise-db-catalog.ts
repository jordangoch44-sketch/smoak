import catalog from "@/data/exercise-db-catalog.json";
import { formatExerciseName } from "@/data/workout-exercise-library";
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
  let mapped: ExerciseMuscle | null = null;
  for (const target of item.targetMuscles) {
    const muscle = MUSCLE[target.toLowerCase()];
    if (muscle) {
      mapped = muscle;
      break;
    }
  }
  if (!mapped) {
    for (const part of item.bodyParts) {
      const muscle = PART[part.toLowerCase()];
      if (muscle) {
        mapped = muscle;
        break;
      }
    }
  }
  // ExerciseDB tags squats, lunges, deadlifts, and leg presses as glutes.
  if (mapped === "glutes") return refineGluteTag(name);
  return mapped;
}

/** Hip thrusts, bridges, and abductions. Squats and hinges are sorted out below. */
function isGlutePrimary(name: string): boolean {
  return (
    /\b(glute|glutes|gluteus|piriformis)\b/.test(name) ||
    /\bhip thrusts?\b/.test(name) ||
    /\bhip extensions?\b/.test(name) ||
    /\bhip lifts?\b/.test(name) ||
    /\bpull[- ]throughs?\b/.test(name) ||
    /\babduct/.test(name) ||
    /reverse hyper/.test(name) ||
    /\bmonster walks?\b/.test(name) ||
    /\bbridges?\b/.test(name) ||
    /pelvic tilt/.test(name) ||
    /\bsumo\b/.test(name) ||
    /curts(?:e|y)/.test(name) ||
    /\bcossack/.test(name) ||
    /lateral lunge/.test(name) ||
    /lying lifting/.test(name) ||
    /\bon hip\b/.test(name) ||
    /\bfrogs?\b/.test(name) ||
    /hip stretch/.test(name)
  );
}

function refineGluteTag(name: string): ExerciseMuscle | null {
  if (isGlutePrimary(name)) return "glutes";
  if (/push-?up|push up/.test(name)) return "chest";
  if (/flutter kicks?|swimmer kicks?/.test(name)) return "core";
  if (/\brows?\b/.test(name)) return "back";
  if (/\brack pulls?\b/.test(name)) return "back";
  if (/\bget-?ups?\b|\bsnatches?\b|\bclean\b(?![- ]grip)|\btire flips?\b/.test(name)) return null;
  if (
    /\b(squats?|lunges?|pistols?)\b/.test(name) ||
    /\bleg press\b|\bleg wide press\b|\bsingle-leg press\b/.test(name) ||
    /\bstep-ups?\b|\bstep ups?\b/.test(name)
  ) {
    return "quads";
  }
  if (
    /hamstring curl|\bleg curls?\b/.test(name) ||
    /\bdeadlifts?\b|\bromanian\b|\bgood mornings?\b/.test(name) ||
    /\bstiff[- ]leg\b|\bstraight[- ]leg\b|\bswings?\b/.test(name)
  ) {
    return "hamstrings";
  }
  if (/toe touch/.test(name)) return "hamstrings";
  if (/\b(twists?|crunches?|planks?)\b/.test(name)) return "core";
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
  name: formatExerciseName(item.name),
  imageUrl: item.imageUrl.startsWith("https://") ? item.imageUrl : "",
  muscle: muscleFor(item),
  equipment: equipmentFor(item.equipments),
}));

const byName = new Map(exercises.map((item) => [item.name.toLowerCase(), item]));
const rawEquipmentByName = new Map(
  (catalog as RawCatalogExercise[]).map((item) => [
    formatExerciseName(item.name).toLowerCase(),
    item.equipments.map((value) => value.toLowerCase()),
  ])
);
const bodyPartsByName = new Map(
  (catalog as RawCatalogExercise[]).map((item) => [
    formatExerciseName(item.name).toLowerCase(),
    item.bodyParts.map((value) => value.toLowerCase()),
  ])
);

export function catalogExercises(): readonly CatalogExercise[] {
  return exercises;
}

export function catalogExerciseId(name: string): string | undefined {
  return byName.get(name.trim().toLowerCase())?.exerciseId;
}

export function catalogExerciseImage(name: string): string {
  return byName.get(name.trim().toLowerCase())?.imageUrl ?? "";
}

export function catalogExerciseEquipment(name: string): ExerciseEquipment | null {
  return byName.get(name.trim().toLowerCase())?.equipment ?? null;
}

/** ExerciseDB body parts, such as "cardio" or "upper legs". Empty when the name is not in the catalog. */
export function catalogExerciseBodyParts(name: string): readonly string[] {
  return bodyPartsByName.get(name.trim().toLowerCase()) ?? [];
}

/** A plate, vest, or medicine ball. The set table still asks for pounds. */
export function catalogExerciseUsesAddedWeight(name: string): boolean {
  const gear = rawEquipmentByName.get(name.trim().toLowerCase()) ?? [];
  return gear.some((value) => value === "weighted" || value === "medicine ball");
}

/** Weight-stack assistance, such as an assisted pull-up or dip machine. */
export function catalogExerciseIsAssistedMachine(name: string): boolean {
  const key = name.trim().toLowerCase();
  const gear = rawEquipmentByName.get(key) ?? [];
  return gear.includes("leverage machine") && key.includes("assisted");
}
