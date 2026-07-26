/**
 * Popular categories on Explore — labels for UI; `searchQuery` hits existing
 * natural-language → profession/specialty mappings in search-query-mappings.
 */

export type ExploreBrowseCategoryIcon =
  | "dumbbell"
  | "leaf"
  | "running"
  | "strength"
  | "medical"
  | "yoga";

export interface ExploreBrowseCategory {
  id: string;
  label: string;
  /** Passed to submitSearch so existing parse + filter pipeline runs */
  searchQuery: string;
  icon: ExploreBrowseCategoryIcon;
}

export const EXPLORE_BROWSE_CATEGORIES: readonly ExploreBrowseCategory[] = [
  {
    id: "personal-trainer",
    label: "Personal Trainer",
    searchQuery: "Personal Trainer",
    icon: "dumbbell",
  },
  {
    id: "nutritionist",
    label: "Nutritionist",
    searchQuery: "Nutritionist",
    icon: "leaf",
  },
  {
    id: "running-coach",
    label: "Running Coach",
    searchQuery: "Running Coach",
    icon: "running",
  },
  {
    id: "strength-coach",
    label: "Strength Coach",
    searchQuery: "Strength Coaching",
    icon: "strength",
  },
  {
    id: "physical-therapist",
    label: "Physical Therapist",
    searchQuery: "Physical Therapist",
    icon: "medical",
  },
  {
    id: "yoga-instructor",
    label: "Yoga Instructor",
    searchQuery: "Yoga",
    icon: "yoga",
  },
] as const;
