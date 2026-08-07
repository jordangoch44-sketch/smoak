/** Canonical main profession categories — cards and profession filters use these only */
export const MAIN_PROFESSION_CATEGORIES = [
  "Personal Trainer",
  "Strength Coach",
  "Physical Therapist",
  "Chiropractor",
  "Nutritionist",
  "Massage Therapist",
  "Recovery Specialist",
  "Wellness Coach",
  "Yoga Instructor",
  "Running Coach",
] as const;

export type MainProfession = (typeof MAIN_PROFESSION_CATEGORIES)[number];
