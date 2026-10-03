/** Exercise pool for the suggested workout. Names and ids are ExerciseDB’s. */

export type ExerciseMuscle =
  | "chest"
  /** Rows */
  | "back"
  /** Vertical pulls */
  | "lats"
  | "shoulders"
  | "rear-delts"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export type ExerciseKind = "compound" | "accessory";

export interface LibraryExercise {
  /** ExerciseDB title, exactly as it is on the still and GIF. */
  name: string;
  /** Stable ExerciseDB id. Media is loaded from this, not from a name search. */
  exerciseId: string;
  muscle: ExerciseMuscle;
  kind: ExerciseKind;
  /** Fixed prescription, e.g. timed holds. Otherwise picked from the kind's schemes. */
  scheme?: { sets: string; reps: string };
}

const CALF = { sets: "4", reps: "12-15" };

export const WORKOUT_EXERCISE_LIBRARY: readonly LibraryExercise[] = [
  // Chest
  { name: "barbell bench press", exerciseId: "edb_T5uXtLj", muscle: "chest", kind: "compound" },
  { name: "dumbbell incline bench press", exerciseId: "edb_nu6WxTv", muscle: "chest", kind: "compound" },
  { name: "dumbbell bench press", exerciseId: "edb_viHr4ul", muscle: "chest", kind: "compound" },
  { name: "barbell incline bench press", exerciseId: "edb_RBqXK5O", muscle: "chest", kind: "compound" },
  { name: "weighted straight bar dip", exerciseId: "edb_oxiRenQ", muscle: "chest", kind: "compound" },
  { name: "cable standing fly", exerciseId: "edb_U1Ngcz0", muscle: "chest", kind: "accessory" },
  { name: "dumbbell incline fly", exerciseId: "edb_wl8EszS", muscle: "chest", kind: "accessory" },
  { name: "push-up", exerciseId: "edb_LqvoMmd", muscle: "chest", kind: "accessory" },
  { name: "barbell decline bench press", exerciseId: "edb_dlz4N5O", muscle: "chest", kind: "compound" },
  { name: "Machine Chest Press", exerciseId: "edb_dQGyfMq", muscle: "chest", kind: "compound" },
  { name: "smith incline bench press", exerciseId: "edb_9pqFgF4", muscle: "chest", kind: "compound" },
  { name: "dumbbell decline bench press", exerciseId: "edb_F88YAY3", muscle: "chest", kind: "compound" },
  { name: "dumbbell fly", exerciseId: "edb_6kMx7rQ", muscle: "chest", kind: "accessory" },
  { name: "cable incline fly", exerciseId: "edb_c8xAjox", muscle: "chest", kind: "accessory" },
  { name: "cable decline fly", exerciseId: "edb_Pzmth9k", muscle: "chest", kind: "accessory" },
  { name: "weighted svend press", exerciseId: "edb_HL3HiSs", muscle: "chest", kind: "accessory" },
  // Back
  { name: "pull-up", exerciseId: "edb_z0BWQDH", muscle: "lats", kind: "compound" },
  { name: "barbell bent over row", exerciseId: "edb_FmTH8RQ", muscle: "back", kind: "compound" },
  { name: "cable lat pulldown full range of motion", exerciseId: "edb_bL8zkUU", muscle: "lats", kind: "compound" },
  { name: "cable seated row", exerciseId: "edb_7QIYIdi", muscle: "back", kind: "compound" },
  { name: "Dumbbell Single-Arm Bent-Over Row", exerciseId: "edb_jQZXMnH", muscle: "back", kind: "compound" },
  { name: "cable straight arm pulldown", exerciseId: "edb_5ssrxEv", muscle: "lats", kind: "accessory" },
  { name: "twin handle parallel grip lat pulldown", exerciseId: "edb_k0ILtWM", muscle: "lats", kind: "accessory" },
  { name: "Machine Seated Row", exerciseId: "edb_8VfVfX5", muscle: "back", kind: "accessory" },
  { name: "Machine T Bar Row", exerciseId: "edb_bANqtq7", muscle: "back", kind: "compound" },
  { name: "barbell pendlay row", exerciseId: "edb_JNc2Je4", muscle: "back", kind: "compound" },
  { name: "inverted row", exerciseId: "edb_CsBkea0", muscle: "back", kind: "accessory" },
  { name: "cable seated wide-grip row", exerciseId: "edb_X8w3QNB", muscle: "back", kind: "accessory" },
  { name: "chin-up", exerciseId: "edb_FIX6AuM", muscle: "lats", kind: "compound" },
  { name: "Pull-Up (Neutral Grip)", exerciseId: "edb_BUA4MTI", muscle: "lats", kind: "compound" },
  { name: "dumbbell pullover", exerciseId: "edb_BrtM8Ve", muscle: "lats", kind: "accessory" },
  // Shoulders
  { name: "barbell seated overhead press", exerciseId: "edb_WUKFxMn", muscle: "shoulders", kind: "compound" },
  { name: "dumbbell seated shoulder press", exerciseId: "edb_YV6cPJi", muscle: "shoulders", kind: "compound" },
  { name: "dumbbell arnold press", exerciseId: "edb_mFzyv2e", muscle: "shoulders", kind: "compound" },
  { name: "dumbbell lateral raise", exerciseId: "edb_Q8bXUu4", muscle: "shoulders", kind: "accessory" },
  { name: "cable lateral raise", exerciseId: "edb_yyalx9R", muscle: "shoulders", kind: "accessory" },
  { name: "dumbbell front raise", exerciseId: "edb_jgFhOV6", muscle: "shoulders", kind: "accessory" },
  { name: "Machine Shoulder Press", exerciseId: "edb_E7zZolw", muscle: "shoulders", kind: "compound" },
  { name: "dumbbell push press", exerciseId: "edb_I3yKRHX", muscle: "shoulders", kind: "compound" },
  { name: "barbell upright row", exerciseId: "edb_51q7wcD", muscle: "shoulders", kind: "accessory" },
  { name: "cable standing rear delt row (with rope)", exerciseId: "edb_6hv9DdW", muscle: "rear-delts", kind: "accessory" },
  { name: "Machine Seated Reverse Fly", exerciseId: "edb_T6DEkZf", muscle: "rear-delts", kind: "accessory" },
  { name: "dumbbell rear fly", exerciseId: "edb_9Vkrhge", muscle: "rear-delts", kind: "accessory" },
  { name: "cable supine reverse fly", exerciseId: "edb_BQBAX22", muscle: "rear-delts", kind: "accessory" },
  { name: "dumbbell rear delt row (shoulder)", exerciseId: "edb_VHzHqFM", muscle: "rear-delts", kind: "accessory" },
  // Arms
  { name: "barbell curl", exerciseId: "edb_pZGnF7P", muscle: "biceps", kind: "accessory" },
  { name: "dumbbell biceps curl", exerciseId: "edb_tM3JiY1", muscle: "biceps", kind: "accessory" },
  { name: "dumbbell hammer curl", exerciseId: "edb_T5LOMXo", muscle: "biceps", kind: "accessory" },
  { name: "dumbbell incline curl", exerciseId: "edb_gmpK6BK", muscle: "biceps", kind: "accessory" },
  { name: "cable curl", exerciseId: "edb_gU0z0DR", muscle: "biceps", kind: "accessory" },
  { name: "barbell preacher curl", exerciseId: "edb_lpO0qVw", muscle: "biceps", kind: "accessory" },
  { name: "EZ-Bar Curl", exerciseId: "edb_7Y7mVmt", muscle: "biceps", kind: "accessory" },
  { name: "EZ-Bar Spider Curl", exerciseId: "edb_jZNi8sf", muscle: "biceps", kind: "accessory" },
  { name: "dumbbell concentration curl", exerciseId: "edb_6HTYoWE", muscle: "biceps", kind: "accessory" },
  { name: "dumbbell zottman curl", exerciseId: "edb_IUs4yN1", muscle: "biceps", kind: "accessory" },
  { name: "cable pushdown (with rope attachment)", exerciseId: "edb_DIoPNWR", muscle: "triceps", kind: "accessory" },
  { name: "cable overhead triceps extension (rope attachment)", exerciseId: "edb_xzWECiu", muscle: "triceps", kind: "accessory" },
  { name: "barbell lying triceps extension skull crusher", exerciseId: "edb_ViExlYg", muscle: "triceps", kind: "accessory" },
  { name: "barbell close-grip bench press", exerciseId: "edb_3vhitwb", muscle: "triceps", kind: "accessory" },
  { name: "dumbbell kickback", exerciseId: "edb_bxmS1ew", muscle: "triceps", kind: "accessory" },
  { name: "bench dip (knees bent)", exerciseId: "edb_806IVfL", muscle: "triceps", kind: "accessory" },
  { name: "cable pushdown", exerciseId: "edb_eYYOrkA", muscle: "triceps", kind: "accessory" },
  { name: "dumbbell seated triceps extension", exerciseId: "edb_5gO02Wu", muscle: "triceps", kind: "accessory" },
  { name: "barbell jm bench press", exerciseId: "edb_ZHHFqwV", muscle: "triceps", kind: "accessory" },
  { name: "diamond push-up", exerciseId: "edb_D7yvTS6", muscle: "triceps", kind: "accessory" },
  // Legs
  { name: "barbell full squat", exerciseId: "edb_QBu7CSt", muscle: "quads", kind: "compound" },
  { name: "barbell front squat", exerciseId: "edb_AwprQgE", muscle: "quads", kind: "compound" },
  { name: "sled 45° leg press", exerciseId: "edb_dzVzAdF", muscle: "quads", kind: "compound" },
  { name: "sled hack squat", exerciseId: "edb_W0SqdiD", muscle: "quads", kind: "compound" },
  { name: "dumbbell goblet squat", exerciseId: "edb_fem3z9O", muscle: "quads", kind: "compound" },
  { name: "dumbbell single leg split squat", exerciseId: "edb_4jmTQPo", muscle: "quads", kind: "accessory" },
  { name: "walking lunge", exerciseId: "edb_Dpw6HqA", muscle: "quads", kind: "accessory" },
  { name: "Machine Leg Extension", exerciseId: "edb_myFAokL", muscle: "quads", kind: "accessory" },
  { name: "dumbbell step-up", exerciseId: "edb_ppWBveo", muscle: "quads", kind: "accessory" },
  { name: "barbell romanian deadlift", exerciseId: "edb_ftcASYI", muscle: "hamstrings", kind: "compound" },
  { name: "barbell deadlift", exerciseId: "edb_26kzlO3", muscle: "hamstrings", kind: "compound" },
  { name: "dumbbell stiff leg deadlift", exerciseId: "edb_T68idV5", muscle: "hamstrings", kind: "compound" },
  { name: "Machine Lying Leg Curl", exerciseId: "edb_840fSDA", muscle: "hamstrings", kind: "accessory" },
  { name: "Machine Seated Leg Curl", exerciseId: "edb_S4s7qcx", muscle: "hamstrings", kind: "accessory" },
  { name: "barbell good morning", exerciseId: "edb_nRfz6o3", muscle: "hamstrings", kind: "compound" },
  { name: "glute-ham raise", exerciseId: "edb_Vkql2An", muscle: "hamstrings", kind: "accessory", scheme: { sets: "3", reps: "8" } },
  { name: "kettlebell swing", exerciseId: "edb_9wN8Ufu", muscle: "hamstrings", kind: "accessory", scheme: { sets: "3", reps: "15" } },
  { name: "barbell glute bridge", exerciseId: "edb_TbssZve", muscle: "glutes", kind: "compound" },
  { name: "low glute bridge on floor", exerciseId: "edb_frITueN", muscle: "glutes", kind: "accessory" },
  { name: "cable kickback", exerciseId: "edb_NMxqY0w", muscle: "glutes", kind: "accessory" },
  { name: "Machine Seated Hip Abduction", exerciseId: "edb_eLg2UQ1", muscle: "glutes", kind: "accessory" },
  { name: "barbell sumo deadlift", exerciseId: "edb_TdoNRHY", muscle: "glutes", kind: "compound" },
  { name: "cable pull through (with rope)", exerciseId: "edb_zMI8F8k", muscle: "glutes", kind: "accessory" },
  { name: "Standing Calf Raise", exerciseId: "edb_lBYdjKY", muscle: "calves", kind: "accessory", scheme: CALF },
  { name: "barbell seated calf raise", exerciseId: "edb_B3DscaD", muscle: "calves", kind: "accessory", scheme: CALF },
  { name: "sled calf press on leg press", exerciseId: "edb_CJoJN0o", muscle: "calves", kind: "accessory", scheme: CALF },
  { name: "smith standing leg calf raise", exerciseId: "edb_D779JZ5", muscle: "calves", kind: "accessory", scheme: CALF },
  { name: "dumbbell single leg calf raise", exerciseId: "edb_2OWF53h", muscle: "calves", kind: "accessory", scheme: { sets: "3", reps: "15" } },
  { name: "Machine Donkey Calf Raise", exerciseId: "edb_2xqmRAq", muscle: "calves", kind: "accessory", scheme: CALF },
  // Core
  { name: "hanging leg raise", exerciseId: "edb_3Nmfuhi", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "12" } },
  { name: "cable kneeling crunch", exerciseId: "edb_FEsIlDA", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "15" } },
  { name: "wheel rollout", exerciseId: "edb_Hgr6pWA", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "10" } },
  { name: "dead bug", exerciseId: "edb_lnQabbF", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "12" } },
  { name: "band horizontal pallof press", exerciseId: "edb_fioZleE", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "12" } },
  { name: "russian twist", exerciseId: "edb_ahSClWa", muscle: "core", kind: "accessory", scheme: { sets: "3", reps: "20" } },
];

/**
 * Previous library titles, keyed in lowercase. Saved workouts still using those
 * titles are rewritten to the ExerciseDB name on the matching still and GIF.
 */
const FORMER_EXERCISE_NAMES: Record<string, string> = {
  "barbell bench press": "barbell bench press",
  "incline dumbbell press": "dumbbell incline bench press",
  "dumbbell bench press": "dumbbell bench press",
  "incline barbell press": "barbell incline bench press",
  "weighted dips": "weighted straight bar dip",
  "cable fly": "cable standing fly",
  "incline dumbbell fly": "dumbbell incline fly",
  "push-ups": "push-up",
  "decline bench press": "barbell decline bench press",
  "machine chest press": "Machine Chest Press",
  "smith machine incline press": "smith incline bench press",
  "decline dumbbell press": "dumbbell decline bench press",
  "dumbbell fly": "dumbbell fly",
  "low-to-high cable fly": "cable incline fly",
  "high-to-low cable fly": "cable decline fly",
  "svend press": "weighted svend press",
  "pull-ups": "pull-up",
  "barbell row": "barbell bent over row",
  "lat pulldown": "cable lat pulldown full range of motion",
  "seated cable row": "cable seated row",
  "single-arm dumbbell row": "Dumbbell Single-Arm Bent-Over Row",
  "straight-arm pulldown": "cable straight arm pulldown",
  "close-grip pulldown": "twin handle parallel grip lat pulldown",
  "machine row": "Machine Seated Row",
  "t-bar row": "Machine T Bar Row",
  "pendlay row": "barbell pendlay row",
  "inverted row": "inverted row",
  "wide-grip cable row": "cable seated wide-grip row",
  "chin-ups": "chin-up",
  "neutral-grip pull-ups": "Pull-Up (Neutral Grip)",
  "dumbbell pullover": "dumbbell pullover",
  "overhead press": "barbell seated overhead press",
  "seated dumbbell press": "dumbbell seated shoulder press",
  "arnold press": "dumbbell arnold press",
  "lateral raise": "dumbbell lateral raise",
  "cable lateral raise": "cable lateral raise",
  "front raise": "dumbbell front raise",
  "machine shoulder press": "Machine Shoulder Press",
  "push press": "dumbbell push press",
  "upright row": "barbell upright row",
  "reverse pec deck": "Machine Seated Reverse Fly",
  "rear delt fly": "dumbbell rear fly",
  "cable rear delt fly": "cable supine reverse fly",
  "rear delt row": "dumbbell rear delt row (shoulder)",
  "barbell curl": "barbell curl",
  "dumbbell curl": "dumbbell biceps curl",
  "hammer curl": "dumbbell hammer curl",
  "incline dumbbell curl": "dumbbell incline curl",
  "cable curl": "cable curl",
  "preacher curl": "barbell preacher curl",
  "ez-bar curl": "EZ-Bar Curl",
  "spider curl": "EZ-Bar Spider Curl",
  "concentration curl": "dumbbell concentration curl",
  "zottman curl": "dumbbell zottman curl",
  "rope pushdown": "cable pushdown (with rope attachment)",
  "overhead cable extension": "cable overhead triceps extension (rope attachment)",
  "skull crushers": "barbell lying triceps extension skull crusher",
  "close-grip bench press": "barbell close-grip bench press",
  "dumbbell kickback": "dumbbell kickback",
  "bench dips": "bench dip (knees bent)",
  "straight-bar pushdown": "cable pushdown",
  "overhead dumbbell extension": "dumbbell seated triceps extension",
  "jm press": "barbell jm bench press",
  "diamond push-ups": "diamond push-up",
  "back squat": "barbell full squat",
  "front squat": "barbell front squat",
  "leg press": "sled 45° leg press",
  "hack squat": "sled hack squat",
  "goblet squat": "dumbbell goblet squat",
  "bulgarian split squat": "dumbbell single leg split squat",
  "walking lunges": "walking lunge",
  "leg extension": "Machine Leg Extension",
  "step-ups": "dumbbell step-up",
  "romanian deadlift": "barbell romanian deadlift",
  "deadlift": "barbell deadlift",
  "stiff-leg deadlift": "dumbbell stiff leg deadlift",
  "lying leg curl": "Machine Lying Leg Curl",
  "seated leg curl": "Machine Seated Leg Curl",
  "good morning": "barbell good morning",
  "glute-ham raise": "glute-ham raise",
  "kettlebell swing": "kettlebell swing",
  "glute bridge": "low glute bridge on floor",
  "cable kickback": "cable kickback",
  "hip abduction": "Machine Seated Hip Abduction",
  "sumo deadlift": "barbell sumo deadlift",
  "cable pull-through": "cable pull through (with rope)",
  "standing calf raise": "Standing Calf Raise",
  "seated calf raise": "barbell seated calf raise",
  "leg press calf raise": "sled calf press on leg press",
  "smith machine calf raise": "smith standing leg calf raise",
  "single-leg calf raise": "dumbbell single leg calf raise",
  "donkey calf raise": "Machine Donkey Calf Raise",
  "hanging leg raise": "hanging leg raise",
  "cable crunch": "cable kneeling crunch",
  "ab wheel rollout": "wheel rollout",
  "dead bug": "dead bug",
  "pallof press": "band horizontal pallof press",
  "russian twist": "russian twist",
};

/** ExerciseDB title when this is one of the old library names. Otherwise the typed name. */
export function officialExerciseName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return FORMER_EXERCISE_NAMES[trimmed.toLowerCase()] ?? trimmed;
}
