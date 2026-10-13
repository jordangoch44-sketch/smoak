import { catalogExercises } from "@/data/exercise-db-catalog";
import { formatExerciseName, officialExerciseName } from "@/data/workout-exercise-library";

/**
 * Gym titles for ExerciseDB rows whose stored name is hard to recognize.
 * Keyed by exercise id so a later catalog sync can leave unknown ids alone.
 * Saved workouts keep the ExerciseDB title. Screens read exerciseLabel().
 */
const DISPLAY_NAMES: Record<string, { displayName: string; aliases: readonly string[] }> = {
  edb_hsthzyc: {
    displayName: "Barbell Back Squat",
    aliases: ["back squat", "barbell squat", "full squat"],
  },
  edb_1PKFh5r: {
    displayName: "Barbell High-Bar Squat",
    aliases: ["high bar squat", "high-bar back squat"],
  },
  edb_ue9zYGp: {
    displayName: "Barbell Low-Bar Squat",
    aliases: ["low bar squat", "low-bar back squat"],
  },
  edb_ftcASYI: {
    displayName: "Barbell Romanian Deadlift",
    aliases: ["rdl", "bb rdl"],
  },
  edb_D7mbXUp: {
    displayName: "Dumbbell Romanian Deadlift",
    aliases: ["db rdl", "dumbbell rdl", "rdl"],
  },
  edb_T68idV5: {
    displayName: "Dumbbell Stiff-Leg Deadlift",
    aliases: ["db sldl"],
  },
  edb_XPCspz8: {
    displayName: "Barbell Stiff-Leg Deadlift",
    aliases: ["sldl", "straight-leg deadlift", "stiff leg deadlift"],
  },
  edb_IJZaoOq: {
    displayName: "Barbell Reverse Lunge",
    aliases: ["reverse lunge", "rear lunge", "barbell rear lunge"],
  },
  edb_jP5mQHO: {
    displayName: "Dumbbell Reverse Lunge",
    aliases: ["reverse lunge", "rear lunge", "db reverse lunge", "dumbbell rear lunge"],
  },
  edb_4jmTQPo: {
    displayName: "Dumbbell Bulgarian Split Squat",
    aliases: ["bulgarian split squat", "bss", "rfess", "rear-foot-elevated split squat"],
  },
  edb_rPatqoP: {
    displayName: "Smith Machine Bulgarian Split Squat",
    aliases: ["smith bulgarian split squat", "smith bss", "bulgarian split squat"],
  },
  edb_bL8zkUU: {
    displayName: "Cable Lat Pulldown",
    aliases: ["lat pulldown", "lat pd"],
  },
  edb_bgpSDRE: {
    displayName: "Machine Lat Pulldown",
    aliases: ["machine pulldown", "front pulldown"],
  },
  edb_eYYOrkA: {
    displayName: "Cable Triceps Pushdown",
    aliases: ["triceps pushdown", "tri pushdown", "straight-bar pushdown"],
  },
  edb_DIoPNWR: {
    displayName: "Cable Rope Triceps Pushdown",
    aliases: ["rope pushdown", "rope pressdown"],
  },
  edb_zKXGbqG: {
    displayName: "Barbell Hip Thrust",
    aliases: ["hip thrust", "barbell hip thrust"],
  },
  edb_m7XUpMT: {
    displayName: "Band Kneeling Hip Thrust",
    aliases: ["kneeling hip thrust", "band hip thrust"],
  },
  edb_NMxqY0w: {
    displayName: "Cable Triceps Kickback",
    aliases: ["triceps kickback"],
  },
  edb_ELrD8wK: {
    displayName: "Smith Machine Squat",
    aliases: ["smith squat", "smith machine squat"],
  },
  edb_NfDY8xE: {
    displayName: "Machine Standing Calf Raise",
    aliases: ["standing calf raise"],
  },
  edb_lBYdjKY: {
    displayName: "Bodyweight Standing Calf Raise",
    aliases: ["bodyweight calf raise"],
  },
};

interface NamedExercise {
  catalogName: string;
  displayName: string;
  aliases: readonly string[];
}

const byCatalog = new Map<string, NamedExercise>();
const byDisplay = new Map<string, NamedExercise>();

for (const item of catalogExercises()) {
  const override = DISPLAY_NAMES[item.exerciseId];
  const named: NamedExercise = {
    catalogName: item.name,
    displayName: override?.displayName ?? item.name,
    aliases: override?.aliases ?? [],
  };
  byCatalog.set(item.name.toLowerCase(), named);
  if (named.displayName.toLowerCase() !== item.name.toLowerCase()) {
    byDisplay.set(named.displayName.toLowerCase(), named);
  }
}

/** Title shown in the picker and the log. Custom names pass through. */
export function exerciseLabel(name: string): string {
  const key = name.trim().toLowerCase();
  if (!key) return "";
  return byCatalog.get(key)?.displayName ?? byDisplay.get(key)?.displayName ?? formatExerciseName(name);
}

/** Extra gym phrases for one catalog title. */
export function displayAliases(name: string): readonly string[] {
  return byCatalog.get(name.trim().toLowerCase())?.aliases ?? [];
}

/**
 * ExerciseDB title to store. A unique gym display name maps back to that title.
 * Shared phrases such as "reverse lunge" stay as typed, because more than one
 * exercise uses them.
 */
export function storedExerciseName(name: string): string {
  const official = officialExerciseName(name);
  const display = byDisplay.get(name.trim().toLowerCase());
  if (display) return display.catalogName;
  return official;
}
