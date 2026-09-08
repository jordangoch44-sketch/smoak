import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";

/** Specialist onboarding — short signup path; depth deferred to dashboard after approval */
export const SPECIALIST_ONBOARDING_TOTAL_STEPS = 6;

export const PROFESSIONAL_TYPE_OPTIONS = MAIN_PROFESSION_CATEGORIES;

export const SPECIALIST_SPECIALTY_OPTIONS = [
  "Fat Loss",
  "Muscle Gain",
  "Strength",
  "Powerlifting",
  "Athletic Performance",
  "HYROX",
  "Rehab",
  "Mobility",
  "Women's Fitness",
  "Senior Fitness",
  "Youth Training",
  "Sports Specific",
  "Nutrition",
  "Posture",
  "Back Pain",
  "Corrective Exercise",
  "Bodybuilding",
  "General Fitness",
  "Endurance",
  "Tactical Fitness",
  "Functional Fitness",
] as const;

export const AGE_RANGE_OPTIONS = [
  "18–25",
  "26–35",
  "36–45",
  "46–55",
  "56–65",
  "65+",
  "All ages",
] as const;

export const MOTIVATION_STYLE_OPTIONS = [
  "High accountability",
  "Supportive",
  "Educational",
  "Competitive",
  "Balanced",
] as const;

export const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const TIME_BLOCK_OPTIONS = [
  "Morning",
  "Afternoon",
  "Evening",
] as const;

export const SESSION_DURATION_OPTIONS = [
  "30 minutes",
  "45 minutes",
  "60 minutes",
  "75 minutes",
  "90 minutes",
] as const;

export const GENDER_OPTIONS = [
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
] as const;

/** Canonical coaching-style pills on specialist profiles — select from these only. */
export const COACHING_STYLE_OPTIONS = [
  "Science-Based",
  "Supportive Coaching",
  "High Accountability",
  "Results-Focused",
  "Beginner Friendly",
  "Athletic Performance",
  "Tough Love",
] as const;

export type CoachingStyleOption = (typeof COACHING_STYLE_OPTIONS)[number];

const COACHING_STYLE_BY_KEY = new Map<string, CoachingStyleOption>(
  COACHING_STYLE_OPTIONS.map((option) => [option.toLowerCase(), option])
);

const COACHING_STYLE_ALIASES: Record<string, CoachingStyleOption> = {
  supportive: "Supportive Coaching",
  "high accountability": "High Accountability",
  "results focused": "Results-Focused",
  "science based": "Science-Based",
  "beginner friendly": "Beginner Friendly",
  "tough love": "Tough Love",
  "athletic performance": "Athletic Performance",
};

function coachingStyleKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function parseCoachingStyleSelection(
  value: string
): CoachingStyleOption[] {
  if (!value.trim()) return [];
  const parts = /[,;\n·]/.test(value) ? value.split(/[,;\n·]+/) : [value];
  const seen = new Set<CoachingStyleOption>();
  const next: CoachingStyleOption[] = [];
  for (const part of parts) {
    const key = coachingStyleKey(part);
    if (!key) continue;
    const match =
      COACHING_STYLE_BY_KEY.get(key) ??
      COACHING_STYLE_BY_KEY.get(part.trim().toLowerCase()) ??
      COACHING_STYLE_ALIASES[key];
    if (!match || seen.has(match)) continue;
    seen.add(match);
    next.push(match);
  }
  return next;
}

export function formatCoachingStyleSelection(
  selected: readonly string[]
): string {
  return parseCoachingStyleSelection(selected.join(" · ")).join(" · ");
}

export const SPECIALIST_ONBOARDING_STEP_LABELS = [
  "Professional type",
  "Account details",
  "Service area",
  "Specialties",
  "Intro & rate",
  "Preview",
] as const;
