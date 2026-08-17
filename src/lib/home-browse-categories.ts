/**
 * Homepage “Browse by category” — display labels map onto existing Explore
 * profession / specialty filters (no separate category system).
 */

export type HomeBrowseCategoryIcon =
  | "dumbbell"
  | "strength"
  | "leaf"
  | "yoga"
  | "sports"
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
  /** Local cinematic photo for the homepage card */
  image: string;
}

/** Six primary browse targets — closest existing filter values. */
export const HOME_BROWSE_CATEGORIES: readonly HomeBrowseCategory[] = [
  {
    id: "personal-trainer",
    label: "Personal Trainer",
    href: "/explore?profession=Personal+Trainer",
    icon: "dumbbell",
    image: "/images/categories/personal-trainer.jpg",
  },
  {
    id: "strength-coach",
    label: "Strength Coach",
    href: "/explore?profession=Strength+Coach",
    icon: "strength",
    image: "/images/categories/strength-coach.jpg",
  },
  {
    id: "nutrition-coach",
    label: "Nutrition Coach",
    /* Canonical profession is Nutritionist; “Nutrition Coach” aliases there. */
    href: "/explore?profession=Nutritionist",
    icon: "leaf",
    image: "/images/categories/nutrition-coach.jpg",
  },
  {
    id: "yoga-pilates",
    label: "Yoga & Pilates",
    /* Pilates Instructor already normalizes to Yoga Instructor. */
    href: "/explore?profession=Yoga+Instructor",
    icon: "yoga",
    image: "/images/categories/yoga-pilates.jpg",
  },
  {
    id: "sports-performance",
    label: "Sports Performance",
    href: "/explore?specialty=Sports+Performance",
    icon: "sports",
    image: "/images/categories/sports-performance.jpg",
  },
  {
    id: "running-endurance",
    label: "Running & Endurance",
    href: "/explore?profession=Running+Coach",
    icon: "running",
    image: "/images/categories/running-endurance.jpg",
  },
] as const;

/** Unfiltered Search — all specialist categories available there. */
export const HOME_VIEW_ALL_SPECIALISTS_HREF = "/explore";

/** Revolving marketplace search hints — phrases the existing Explore pipeline understands. */
export const HOME_SEARCH_PROMPTS = [
  "Personal trainer in Mission Valley...",
  "Female nutrition coach under $120...",
  "Yoga in Encinitas...",
  "Male strength coach in Pacific Beach...",
  "Running coach in Carlsbad...",
  "Sports performance between $80 and $150...",
] as const;

export function buildHomeSearchHref(query: string): string {
  const q = query.trim();
  if (!q) return HOME_VIEW_ALL_SPECIALISTS_HREF;
  return `${HOME_VIEW_ALL_SPECIALISTS_HREF}?q=${encodeURIComponent(q)}`;
}
