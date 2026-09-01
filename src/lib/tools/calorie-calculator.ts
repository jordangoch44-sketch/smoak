/**
 * Mifflin–St Jeor calorie estimate + pace table + short projection for
 * /calorie-calculator. Not medical advice.
 */

export type CalorieSex = "female" | "male";

export type CalorieActivityId =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type CalorieGoalId = "lose" | "maintain" | "gain";

/** Pace rows shown on results (Calculator.net-style). */
export type CaloriePaceId =
  | "maintain"
  | "mild_loss"
  | "loss"
  | "extreme_loss"
  | "mild_gain"
  | "gain"
  | "fast_gain";

export interface CalorieActivityOption {
  id: CalorieActivityId;
  label: string;
  detail: string;
  multiplier: number;
}

export interface CalorieGoalOption {
  id: CalorieGoalId;
  label: string;
  detail: string;
}

export interface CaloriePaceDefinition {
  id: CaloriePaceId;
  label: string;
  detail: string;
  /** Approx weekly body-weight change in lb (negative = loss) */
  weeklyChangeLb: number;
  direction: "loss" | "maintain" | "gain";
}

export const CALORIE_ACTIVITY_OPTIONS: readonly CalorieActivityOption[] = [
  {
    id: "sedentary",
    label: "Sedentary",
    detail: "Desk work, little exercise",
    multiplier: 1.2,
  },
  {
    id: "light",
    label: "Lightly active",
    detail: "1–3 workouts / week",
    multiplier: 1.375,
  },
  {
    id: "moderate",
    label: "Moderately active",
    detail: "3–5 workouts / week",
    multiplier: 1.55,
  },
  {
    id: "active",
    label: "Very active",
    detail: "6–7 workouts / week",
    multiplier: 1.725,
  },
  {
    id: "very_active",
    label: "Athlete",
    detail: "Hard training or physical job",
    multiplier: 1.9,
  },
] as const;

export const CALORIE_GOAL_OPTIONS: readonly CalorieGoalOption[] = [
  {
    id: "lose",
    label: "Lose weight",
    detail: "See loss paces",
  },
  {
    id: "maintain",
    label: "Maintain",
    detail: "Hold current weight",
  },
  {
    id: "gain",
    label: "Build",
    detail: "See gain paces",
  },
] as const;

/** ~3500 kcal ≈ 1 lb → daily delta = weeklyChange * 500 */
export const CALORIE_PACE_DEFINITIONS: readonly CaloriePaceDefinition[] = [
  {
    id: "maintain",
    label: "Maintain weight",
    detail: "Hold where you are",
    weeklyChangeLb: 0,
    direction: "maintain",
  },
  {
    id: "mild_loss",
    label: "Mild weight loss",
    detail: "0.5 lb / week",
    weeklyChangeLb: -0.5,
    direction: "loss",
  },
  {
    id: "loss",
    label: "Weight loss",
    detail: "1 lb / week",
    weeklyChangeLb: -1,
    direction: "loss",
  },
  {
    id: "extreme_loss",
    label: "Extreme weight loss",
    detail: "2 lb / week",
    weeklyChangeLb: -2,
    direction: "loss",
  },
  {
    id: "mild_gain",
    label: "Mild weight gain",
    detail: "0.5 lb / week",
    weeklyChangeLb: 0.5,
    direction: "gain",
  },
  {
    id: "gain",
    label: "Weight gain",
    detail: "1 lb / week",
    weeklyChangeLb: 1,
    direction: "gain",
  },
  {
    id: "fast_gain",
    label: "Fast weight gain",
    detail: "2 lb / week",
    weeklyChangeLb: 2,
    direction: "gain",
  },
] as const;

export interface CalorieCalculatorInput {
  sex: CalorieSex;
  ageYears: number;
  heightInches: number;
  weightLb: number;
  activityId: CalorieActivityId;
  goalId: CalorieGoalId;
}

export interface CalorieProjectionPoint {
  week: number;
  weightLb: number;
}

export interface CaloriePaceRow {
  id: CaloriePaceId;
  label: string;
  detail: string;
  weeklyChangeLb: number;
  direction: "loss" | "maintain" | "gain";
  calories: number;
  /** Share of maintenance TDEE */
  percentOfTdee: number;
  floored: boolean;
}

export interface CalorieCalculatorResult {
  bmr: number;
  tdee: number;
  proteinGrams: number;
  activityLabel: string;
  goalId: CalorieGoalId;
  calorieFloor: number;
  lossPaces: CaloriePaceRow[];
  gainPaces: CaloriePaceRow[];
  startingWeightLb: number;
  projectionWeeks: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundCalories(value: number): number {
  return Math.round(value / 10) * 10;
}

export function findCalorieActivity(
  id: CalorieActivityId
): CalorieActivityOption {
  return (
    CALORIE_ACTIVITY_OPTIONS.find((option) => option.id === id) ??
    CALORIE_ACTIVITY_OPTIONS[2]!
  );
}

export function findCalorieGoal(id: CalorieGoalId): CalorieGoalOption {
  return (
    CALORIE_GOAL_OPTIONS.find((option) => option.id === id) ??
    CALORIE_GOAL_OPTIONS[1]!
  );
}

export function findCaloriePace(id: CaloriePaceId): CaloriePaceDefinition {
  return (
    CALORIE_PACE_DEFINITIONS.find((pace) => pace.id === id) ??
    CALORIE_PACE_DEFINITIONS[0]!
  );
}

/** Map form goal → default selected pace on results. */
export function defaultPaceForGoal(goalId: CalorieGoalId): CaloriePaceId {
  if (goalId === "gain") return "mild_gain";
  if (goalId === "maintain") return "maintain";
  return "mild_loss";
}

/** Specialist matching still uses lose / maintain / gain buckets. */
export function goalIdForPace(paceId: CaloriePaceId): CalorieGoalId {
  const pace = findCaloriePace(paceId);
  if (pace.direction === "gain") return "gain";
  if (pace.direction === "maintain") return "maintain";
  return "lose";
}

/** Mifflin–St Jeor BMR (kcal/day). */
export function estimateBmr(input: {
  sex: CalorieSex;
  ageYears: number;
  heightInches: number;
  weightLb: number;
}): number {
  const weightKg = input.weightLb * 0.453592;
  const heightCm = input.heightInches * 2.54;
  const age = clamp(input.ageYears, 16, 90);
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(input.sex === "male" ? base + 5 : base - 161);
}

function buildPaceRow(
  definition: CaloriePaceDefinition,
  tdee: number,
  floor: number
): CaloriePaceRow {
  const raw = roundCalories(tdee + definition.weeklyChangeLb * 500);
  const calories = Math.max(floor, raw);
  return {
    id: definition.id,
    label: definition.label,
    detail: definition.detail,
    weeklyChangeLb: definition.weeklyChangeLb,
    direction: definition.direction,
    calories,
    percentOfTdee: Math.round((calories / Math.max(tdee, 1)) * 100),
    floored: calories > raw,
  };
}

export function buildProjectionForPace(input: {
  startingWeightLb: number;
  weeklyChangeLb: number;
  weeks?: number;
}): {
  projection: CalorieProjectionPoint[];
  projectedWeightLb: number;
  projectionWeeks: number;
} {
  const projectionWeeks = input.weeks ?? 12;
  const projection: CalorieProjectionPoint[] = [];
  for (let week = 0; week <= projectionWeeks; week += 1) {
    projection.push({
      week,
      weightLb:
        Math.round((input.startingWeightLb + input.weeklyChangeLb * week) * 10) /
        10,
    });
  }
  return {
    projection,
    projectedWeightLb:
      Math.round(
        (input.startingWeightLb + input.weeklyChangeLb * projectionWeeks) * 10
      ) / 10,
    projectionWeeks,
  };
}

/**
 * Daily targets for each pace + metadata for projection / matching.
 * Floor calories at 1200 (female) / 1500 (male).
 */
export function calculateCaloriePlan(
  input: CalorieCalculatorInput
): CalorieCalculatorResult | null {
  const ageYears = clamp(Number(input.ageYears) || 0, 0, 120);
  const heightInches = clamp(Number(input.heightInches) || 0, 0, 100);
  const weightLb = clamp(Number(input.weightLb) || 0, 0, 800);
  if (ageYears < 16 || heightInches < 48 || weightLb < 70) return null;

  const activity = findCalorieActivity(input.activityId);
  const bmr = estimateBmr({
    sex: input.sex,
    ageYears,
    heightInches,
    weightLb,
  });
  const tdee = roundCalories(bmr * activity.multiplier);
  const calorieFloor = input.sex === "male" ? 1500 : 1200;
  const proteinGrams = Math.round(weightLb * 0.7);

  const allPaces = CALORIE_PACE_DEFINITIONS.map((definition) =>
    buildPaceRow(definition, tdee, calorieFloor)
  );

  return {
    bmr,
    tdee,
    proteinGrams,
    activityLabel: activity.label,
    goalId: input.goalId,
    calorieFloor,
    lossPaces: allPaces.filter((pace) => pace.direction !== "gain"),
    gainPaces: allPaces.filter((pace) => pace.direction === "gain"),
    startingWeightLb: weightLb,
    projectionWeeks: 12,
  };
}

export function resolvePaceRow(
  result: CalorieCalculatorResult,
  paceId: CaloriePaceId
): CaloriePaceRow {
  return (
    [...result.lossPaces, ...result.gainPaces].find((pace) => pace.id === paceId) ??
    result.lossPaces[0]!
  );
}
