/** Canonical main profession lanes — onboarding, cards, and profession filters. */
export const MAIN_PROFESSION_CATEGORIES = [
  "Personal Training",
  "Physical Therapy",
  "Massage Therapy",
  "Bodywork",
  "Chiropractic",
  "Nutrition & Dietetics",
  "Yoga",
  "Pilates",
  "Mental Health & Therapy",
  "Medical & IV Wellness",
  "Sports/Endurance Coaching",
] as const;

export type MainProfession = (typeof MAIN_PROFESSION_CATEGORIES)[number];
