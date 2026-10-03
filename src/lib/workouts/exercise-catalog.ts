import {
  WORKOUT_EXERCISE_LIBRARY,
  type ExerciseMuscle,
  type LibraryExercise,
} from "@/data/workout-exercise-library";

export type { ExerciseMuscle };

/** How the little exercise portrait is drawn. */
export type ExercisePose =
  | "bench"
  | "incline"
  | "fly"
  | "dip"
  | "pushup"
  | "row"
  | "pulldown"
  | "pullup"
  | "press"
  | "raise"
  | "rear"
  | "curl"
  | "pushdown"
  | "extension"
  | "squat"
  | "lunge"
  | "legpress"
  | "legext"
  | "hinge"
  | "legcurl"
  | "thrust"
  | "kickback"
  | "calf"
  | "plank"
  | "crunch"
  | "legraise"
  | "figure";

export type ExerciseEquipment =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "smith"
  | "kettlebell"
  | "band"
  | "bodyweight";

export const EXERCISE_EQUIPMENT_OPTIONS: readonly {
  id: ExerciseEquipment;
  label: string;
}[] = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbell" },
  { id: "cable", label: "Cable" },
  { id: "machine", label: "Machine" },
  { id: "smith", label: "Smith" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "band", label: "Band" },
  { id: "bodyweight", label: "Bodyweight" },
];

export const EXERCISE_MUSCLE_OPTIONS: readonly {
  id: ExerciseMuscle;
  label: string;
}[] = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "lats", label: "Lats" },
  { id: "shoulders", label: "Shoulders" },
  { id: "rear-delts", label: "Rear delts" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "quads", label: "Quads" },
  { id: "hamstrings", label: "Hamstrings" },
  { id: "glutes", label: "Glutes" },
  { id: "calves", label: "Calves" },
  { id: "core", label: "Core" },
];

/** Shown before a search or a filter. */
export const POPULAR_EXERCISE_NAMES: readonly string[] = [
  "barbell bench press",
  "dumbbell bench press",
  "barbell bent over row",
  "dumbbell biceps curl",
  "cable standing fly",
  "cable lat pulldown full range of motion",
  "barbell seated overhead press",
  "barbell full squat",
  "barbell romanian deadlift",
  "pull-up",
  "dumbbell lateral raise",
  "barbell glute bridge",
];

const libraryByName = new Map(
  WORKOUT_EXERCISE_LIBRARY.map((item) => [item.name.toLowerCase(), item])
);

/** Names the keyword pass would mislabel. Checked before keywords. */
const EQUIPMENT_EXACT: Record<string, ExerciseEquipment> = {
  "svend press": "dumbbell",
  "chest-supported row": "dumbbell",
  "rear delt fly": "dumbbell",
  "rear delt row": "dumbbell",
  "front raise": "dumbbell",
  "lateral raise": "dumbbell",
  "lean-away lateral raise": "dumbbell",
  "walking lunges": "dumbbell",
  "step-ups": "dumbbell",
  "bulgarian split squat": "dumbbell",
  "single-leg romanian deadlift": "dumbbell",
  "overhead press": "barbell",
  "push press": "barbell",
  "landmine press": "barbell",
  "upright row": "barbell",
  "decline bench press": "barbell",
  "close-grip bench press": "barbell",
  "preacher curl": "barbell",
  "skull crushers": "barbell",
  "jm press": "barbell",
  "back squat": "barbell",
  "front squat": "barbell",
  "good morning": "barbell",
  "hip thrust": "barbell",
  "b-stance hip thrust": "barbell",
  "t-bar row": "barbell",
  "pendlay row": "barbell",
  "meadows row": "barbell",
  "seal row": "barbell",
  "seated calf raise": "machine",
  "donkey calf raise": "machine",
  "standing calf raise": "bodyweight",
  "single-leg calf raise": "bodyweight",
  "ab wheel rollout": "bodyweight",
};

export function findLibraryExercise(name: string): LibraryExercise | undefined {
  return libraryByName.get(name.trim().toLowerCase());
}

export function muscleLabel(muscle: ExerciseMuscle): string {
  return EXERCISE_MUSCLE_OPTIONS.find((option) => option.id === muscle)?.label ?? muscle;
}

export function equipmentLabel(equipment: ExerciseEquipment): string {
  return (
    EXERCISE_EQUIPMENT_OPTIONS.find((option) => option.id === equipment)?.label ?? equipment
  );
}

export function equipmentForExercise(name: string): ExerciseEquipment | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  const exact = EQUIPMENT_EXACT[n];
  if (exact) return exact;
  if (n.includes("smith")) return "smith";
  if (n.includes("kettlebell")) return "kettlebell";
  if (n.includes("band")) return "band";
  if (
    n.includes("dumbbell") ||
    n.includes("hammer") ||
    n.includes("arnold") ||
    n.includes("zottman") ||
    n.includes("concentration") ||
    n.includes("goblet") ||
    n.includes("svend")
  ) {
    return "dumbbell";
  }
  if (
    n.includes("cable") ||
    n.includes("bayesian") ||
    n.includes("pallof") ||
    n.includes("face pull") ||
    n.includes("pushdown") ||
    n.includes("pulldown")
  ) {
    return "cable";
  }
  if (
    n.includes("machine") ||
    n.includes("pec deck") ||
    n.includes("leg press") ||
    n.includes("hack") ||
    n.includes("leg extension") ||
    n.includes("leg curl") ||
    n.includes("hip abduction") ||
    n.includes("glute-ham")
  ) {
    return "machine";
  }
  if (
    n.includes("barbell") ||
    n.includes("ez-bar") ||
    n.includes("deadlift") ||
    n.includes("squat") ||
    n.includes("bench press") ||
    n.includes("hip thrust")
  ) {
    return "barbell";
  }
  if (
    n.includes("push-up") ||
    n.includes("pull-up") ||
    n.includes("chin-up") ||
    n.includes("dip") ||
    n.includes("plank") ||
    n.includes("dead bug") ||
    n.includes("hanging") ||
    n.includes("inverted") ||
    n.includes("nordic") ||
    n.includes("frog") ||
    n.includes("glute bridge") ||
    n.includes("russian") ||
    n.includes("y-raise") ||
    n.includes("lunge") ||
    n.includes("rollout")
  ) {
    return "bodyweight";
  }
  return null;
}

/** First match wins. Library names are covered; anything else is a plain figure. */
export function poseForExercise(name: string): ExercisePose {
  const n = name.trim().toLowerCase();
  if (!n) return "figure";
  if (n.includes("calf")) return "calf";
  if (n.includes("leg press")) return "legpress";
  if (n.includes("leg extension")) return "legext";
  if (n.includes("leg curl") || n.includes("nordic") || n.includes("glute-ham")) return "legcurl";
  if (
    n.includes("thrust") ||
    n.includes("glute bridge") ||
    n.includes("frog") ||
    n.includes("pull-through") ||
    n.includes("pull through") ||
    n.includes("hip abduction")
  ) {
    return "thrust";
  }
  if (n.includes("cable kickback")) return "kickback";
  if (n.includes("deadlift") || n.includes("good morning") || n.includes("swing")) return "hinge";
  if (n.includes("lunge") || n.includes("split") || n.includes("step-up")) return "lunge";
  if (n.includes("squat") || n.includes("hack")) return "squat";
  if (
    n.includes("rear") ||
    n.includes("reverse pec") ||
    n.includes("y-raise") ||
    n.includes("face pull") ||
    n.includes("pull-apart") ||
    n.includes("reverse fly")
  ) {
    return "rear";
  }
  if (n.includes("fly") || n.includes("pec deck") || n.includes("svend")) return "fly";
  if (n.includes("push-up")) return "pushup";
  if (n.includes("dip")) return "dip";
  if (n.includes("pulldown") || n.includes("pullover")) return "pulldown";
  if (n.includes("pull-up") || n.includes("chin-up")) return "pullup";
  if (n.includes("upright") || n.includes("lateral") || n.includes("front raise")) return "raise";
  if (n.includes("row")) return "row";
  if (n.includes("curl")) return "curl";
  if (n.includes("pushdown") || n.includes("dumbbell kickback")) return "pushdown";
  if (n.includes("skull") || n.includes("jm") || n.includes("extension")) return "extension";
  if (n.includes("incline") && (n.includes("press") || n.includes("bench"))) return "incline";
  if (
    n.includes("bench") ||
    n.includes("floor press") ||
    n.includes("chest press") ||
    (n.includes("decline") && n.includes("press"))
  ) {
    return "bench";
  }
  if (n.includes("press") || n.includes("arnold")) return "press";
  if (
    n.includes("plank") ||
    n.includes("dead bug") ||
    n.includes("pallof") ||
    n.includes("rollout")
  ) {
    return "plank";
  }
  if (n.includes("crunch") || n.includes("twist")) return "crunch";
  if (n.includes("leg raise") || n.includes("hanging")) return "legraise";
  return "figure";
}

function auditExerciseCatalog() {
  if (process.env.NODE_ENV === "production") return;
  const missingEquipment: string[] = [];
  const missingPose: string[] = [];
  for (const item of WORKOUT_EXERCISE_LIBRARY) {
    if (!equipmentForExercise(item.name)) missingEquipment.push(item.name);
    if (poseForExercise(item.name) === "figure") missingPose.push(item.name);
  }
  const missingPopular = POPULAR_EXERCISE_NAMES.filter(
    (name) => !libraryByName.has(name.toLowerCase())
  );
  if (missingEquipment.length || missingPose.length || missingPopular.length) {
    throw new Error(
      `Exercise catalog gaps. Equipment: ${missingEquipment.join(", ") || "none"}. Pose: ${missingPose.join(", ") || "none"}. Popular: ${missingPopular.join(", ") || "none"}.`
    );
  }
}

auditExerciseCatalog();
