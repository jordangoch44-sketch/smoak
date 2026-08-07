import { MAIN_PROFESSION_CATEGORIES, type MainProfession } from "@/data/professions";
import type { Trainer } from "@/types/trainer";

/**
 * Marketplace category under the name on cards — drives Explore / search filters.
 * Onboarding “professional type” and loose titles (CPT, etc.) normalize here.
 */

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Onboarding / alias labels → canonical MAIN_PROFESSION_CATEGORIES */
const PROFESSION_ALIASES: Record<string, MainProfession> = {
  "personal trainer": "Personal Trainer",
  "certified personal trainer": "Personal Trainer",
  cpt: "Personal Trainer",
  "fitness coach": "Personal Trainer",
  "hybrid coach": "Personal Trainer",
  "sports performance coach": "Personal Trainer",
  "performance coach": "Personal Trainer",
  "strength coach": "Strength Coach",
  "physical therapist": "Physical Therapist",
  physiotherapist: "Physical Therapist",
  "physical therapy": "Physical Therapist",
  chiropractor: "Chiropractor",
  chiropractic: "Chiropractor",
  nutritionist: "Nutritionist",
  "nutrition coach": "Nutritionist",
  dietitian: "Nutritionist",
  "registered dietitian": "Nutritionist",
  "massage therapist": "Massage Therapist",
  lmt: "Massage Therapist",
  "recovery specialist": "Recovery Specialist",
  "recovery coach": "Recovery Specialist",
  "wellness coach": "Wellness Coach",
  "mental performance coach": "Wellness Coach",
  "yoga instructor": "Yoga Instructor",
  "yoga teacher": "Yoga Instructor",
  "pilates instructor": "Yoga Instructor",
  "running coach": "Running Coach",
  "run coach": "Running Coach",
  "marathon coach": "Running Coach",
};

/** Title / credential hints when profession is missing or “Specialist” */
const TITLE_HINTS: { pattern: RegExp; profession: MainProfession }[] = [
  {
    pattern: /\bcpt\b|certified personal trainer|personal trainer/i,
    profession: "Personal Trainer",
  },
  {
    pattern: /\bdpt\b|physical therapist|physiotherapist/i,
    profession: "Physical Therapist",
  },
  {
    pattern: /\brd\b|r\.d\.|dietitian|nutritionist|nutrition coach/i,
    profession: "Nutritionist",
  },
  {
    pattern: /\blmt\b|massage therapist/i,
    profession: "Massage Therapist",
  },
  { pattern: /chiropractor|chiropractic/i, profession: "Chiropractor" },
  { pattern: /strength coach/i, profession: "Strength Coach" },
  { pattern: /running coach|run coach/i, profession: "Running Coach" },
  { pattern: /yoga/i, profession: "Yoga Instructor" },
  { pattern: /wellness coach/i, profession: "Wellness Coach" },
  { pattern: /recovery/i, profession: "Recovery Specialist" },
];

/** Searching “Personal Trainer” should also surface related coaching roles */
const PERSONAL_TRAINER_FAMILY = new Set(
  ["Personal Trainer", "Strength Coach", "Running Coach"].map(normalizeKey)
);

/** Map a raw profession / onboarding type to a main category, or null if unknown. */
function canonicalizeProfessionLabel(
  raw: string | null | undefined
): MainProfession | null {
  const key = normalizeKey(raw ?? "");
  if (!key || key === "specialist" || key === "other") return null;

  const exact = MAIN_PROFESSION_CATEGORIES.find(
    (category) => normalizeKey(category) === key
  );
  if (exact) return exact;

  return PROFESSION_ALIASES[key] ?? null;
}

type ProfessionSource = Pick<Trainer, "profession" | "title" | "specialty">;

/**
 * Category shown under the specialist name on cards / profile.
 * Never returns the useless “Specialist” fallback.
 */
export function resolveTrainerProfessionCategory(
  trainer: ProfessionSource
): string {
  const fromProfession = canonicalizeProfessionLabel(trainer.profession);
  if (fromProfession) return fromProfession;

  const title = trainer.title?.trim() ?? "";
  for (const hint of TITLE_HINTS) {
    if (hint.pattern.test(title)) return hint.profession;
  }

  for (const specialty of trainer.specialty ?? []) {
    const fromSpecialty = canonicalizeProfessionLabel(specialty);
    if (fromSpecialty) return fromSpecialty;
  }

  const raw = trainer.profession?.trim() ?? "";
  if (raw && normalizeKey(raw) !== "specialist") return raw;

  return "";
}

/**
 * Explore / category browse: filter profession vs trainer category.
 * “Personal Trainer” also matches Strength Coach and Running Coach.
 */
export function trainerMatchesProfessionCategory(
  trainer: ProfessionSource,
  professionFilter: string
): boolean {
  const filterRaw = professionFilter.trim();
  if (!filterRaw) return true;

  const filterCategory =
    canonicalizeProfessionLabel(filterRaw) ?? filterRaw;
  const trainerCategory = resolveTrainerProfessionCategory(trainer);
  if (!trainerCategory) {
    /* Soft fallback — title / specialties often carry category language */
    const target = normalizeKey(filterRaw);
    if (normalizeKey(trainer.title ?? "").includes(target)) return true;
    return (trainer.specialty ?? []).some((s) =>
      normalizeKey(s).includes(target)
    );
  }

  const filterKey = normalizeKey(filterCategory);
  const trainerKey = normalizeKey(trainerCategory);
  if (filterKey === trainerKey) return true;

  if (
    filterKey === "personal trainer" &&
    PERSONAL_TRAINER_FAMILY.has(trainerKey)
  ) {
    return true;
  }

  return false;
}
