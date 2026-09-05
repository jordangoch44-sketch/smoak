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
  "personal training": "Personal Training",
  "personal trainer": "Personal Training",
  "certified personal trainer": "Personal Training",
  cpt: "Personal Training",
  "fitness coach": "Personal Training",
  "hybrid coach": "Personal Training",
  "physical therapy": "Physical Therapy",
  "physical therapist": "Physical Therapy",
  physiotherapist: "Physical Therapy",
  "massage therapy": "Massage Therapy",
  "massage therapist": "Massage Therapy",
  lmt: "Massage Therapy",
  bodywork: "Bodywork",
  "recovery specialist": "Bodywork",
  "recovery coach": "Bodywork",
  chiropractic: "Chiropractic",
  chiropractor: "Chiropractic",
  "nutrition & dietetics": "Nutrition & Dietetics",
  "nutrition and dietetics": "Nutrition & Dietetics",
  nutritionist: "Nutrition & Dietetics",
  "nutrition coach": "Nutrition & Dietetics",
  dietitian: "Nutrition & Dietetics",
  "registered dietitian": "Nutrition & Dietetics",
  yoga: "Yoga",
  "yoga instructor": "Yoga",
  "yoga teacher": "Yoga",
  pilates: "Pilates",
  "pilates instructor": "Pilates",
  "mental health & therapy": "Mental Health & Therapy",
  "mental health and therapy": "Mental Health & Therapy",
  "wellness coach": "Mental Health & Therapy",
  "mental performance coach": "Mental Health & Therapy",
  "medical & iv wellness": "Medical & IV Wellness",
  "medical and iv wellness": "Medical & IV Wellness",
  "iv wellness": "Medical & IV Wellness",
  "iv therapy": "Medical & IV Wellness",
  "sports/endurance coaching": "Sports/Endurance Coaching",
  "sports endurance coaching": "Sports/Endurance Coaching",
  "sports coaching": "Sports/Endurance Coaching",
  "strength coach": "Sports/Endurance Coaching",
  "running coach": "Sports/Endurance Coaching",
  "run coach": "Sports/Endurance Coaching",
  "marathon coach": "Sports/Endurance Coaching",
  "endurance coach": "Sports/Endurance Coaching",
  "sports performance coach": "Sports/Endurance Coaching",
  "performance coach": "Sports/Endurance Coaching",
};

/** Title / credential hints when profession is missing or “Specialist” */
const TITLE_HINTS: { pattern: RegExp; profession: MainProfession }[] = [
  {
    pattern: /\bcpt\b|certified personal trainer|personal trainer|personal training/i,
    profession: "Personal Training",
  },
  {
    pattern: /\bdpt\b|physical therapist|physiotherapist|physical therapy/i,
    profession: "Physical Therapy",
  },
  {
    pattern: /\blmt\b|massage therapist|massage therapy/i,
    profession: "Massage Therapy",
  },
  { pattern: /bodywork|recovery specialist/i, profession: "Bodywork" },
  { pattern: /chiropractor|chiropractic/i, profession: "Chiropractic" },
  {
    pattern: /\brd\b|r\.d\.|dietitian|nutritionist|nutrition coach|dietetics/i,
    profession: "Nutrition & Dietetics",
  },
  { pattern: /\bpilates\b/i, profession: "Pilates" },
  { pattern: /\byoga\b/i, profession: "Yoga" },
  {
    pattern: /mental health|therapist|wellness coach|mental performance/i,
    profession: "Mental Health & Therapy",
  },
  {
    pattern: /\biv\b|medical wellness/i,
    profession: "Medical & IV Wellness",
  },
  {
    pattern: /strength coach|running coach|run coach|endurance|sports performance coach/i,
    profession: "Sports/Endurance Coaching",
  },
];

/** Map a raw profession / onboarding type to a main category, or null if unknown. */
export function canonicalizeProfessionLabel(
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
    const target = normalizeKey(filterRaw);
    if (normalizeKey(trainer.title ?? "").includes(target)) return true;
    return (trainer.specialty ?? []).some((s) =>
      normalizeKey(s).includes(target)
    );
  }

  return normalizeKey(filterCategory) === normalizeKey(trainerCategory);
}
