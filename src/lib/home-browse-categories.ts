/**
 * Homepage “Popular categories” — six marketplace browse targets.
 * Labels match canonical profession lanes (no extra category system).
 */

export type HomeBrowseCategoryIcon =
  | "dumbbell"
  | "medical"
  | "spine"
  | "yoga"
  | "leaf"
  | "running";

interface HomeBrowseCategory {
  id: string;
  /** Homepage-facing label */
  label: string;
  /**
   * Explore URL with an existing filter already selected.
   * Uses `profession` or `specialty` query params only.
   */
  href: string;
  icon: HomeBrowseCategoryIcon;
}

function professionHref(profession: string): string {
  return `/explore?profession=${encodeURIComponent(profession)}`;
}

/** Six popular browse targets — do not add more here. */
export const HOME_BROWSE_CATEGORIES: readonly HomeBrowseCategory[] = [
  {
    id: "personal-training",
    label: "Personal Training",
    href: professionHref("Personal Training"),
    icon: "dumbbell",
  },
  {
    id: "physical-therapy",
    label: "Physical Therapy",
    href: professionHref("Physical Therapy"),
    icon: "medical",
  },
  {
    id: "bodywork",
    label: "Bodywork",
    href: professionHref("Bodywork"),
    icon: "spine",
  },
  {
    id: "pilates",
    label: "Pilates",
    href: professionHref("Pilates"),
    icon: "yoga",
  },
  {
    id: "nutrition-dietetics",
    label: "Nutrition & Dietetics",
    href: professionHref("Nutrition & Dietetics"),
    icon: "leaf",
  },
  {
    id: "sports-endurance-coaching",
    label: "Sports/Endurance Coaching",
    href: professionHref("Sports/Endurance Coaching"),
    icon: "running",
  },
] as const;

/** Unfiltered Search — all specialist categories available there. */
export const HOME_VIEW_ALL_SPECIALISTS_HREF = "/explore";

/** City rankings board — SMOAC client reviews only. */
export const HOME_RANKINGS_HREF = "/rankings";

/** Marketplace acquisition tool — same card language as city rankings. */
export const HOME_CALORIE_CALCULATOR_HREF = "/calorie-calculator";

/** Revolving marketplace search hints — phrases the existing Explore pipeline understands. */
export const HOME_SEARCH_PROMPTS = [
  "Personal training in Mission Valley...",
  "Female nutrition coach under $120...",
  "Pilates in Encinitas...",
  "Physical therapy in Pacific Beach...",
  "Sports coaching in Carlsbad...",
  "Bodywork between $80 and $150...",
] as const;

export function buildHomeSearchHref(query: string): string {
  const q = query.trim();
  if (!q) return HOME_VIEW_ALL_SPECIALISTS_HREF;
  return `${HOME_VIEW_ALL_SPECIALISTS_HREF}?q=${encodeURIComponent(q)}`;
}
