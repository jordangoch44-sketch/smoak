/**
 * Full-screen Search overlay prompts — keep short; Filters owns structured facets.
 */

export type ExploreSearchPrompt = {
  id: string;
  label: string;
  /** Submitted through the normal Explore search pipeline */
  searchQuery: string;
};

/** Two primary specialist roles shown in the search overlay */
export const EXPLORE_SEARCH_SPECIALIST_PROMPTS: readonly ExploreSearchPrompt[] =
  [
    {
      id: "personal-trainer",
      label: "Personal Trainer",
      searchQuery: "Personal Trainer",
    },
    {
      id: "nutritionist",
      label: "Nutritionist",
      searchQuery: "Nutritionist",
    },
  ] as const;

/** Two goal / intent prompts (keyword search, not hard filters) */
export const EXPLORE_SEARCH_GOAL_PROMPTS: readonly ExploreSearchPrompt[] = [
  {
    id: "weight-loss",
    label: "Weight loss",
    searchQuery: "Weight loss",
  },
  {
    id: "muscle-building",
    label: "Muscle building",
    searchQuery: "Muscle building",
  },
] as const;

export const EXPLORE_RECENT_SEARCH_OVERLAY_LIMIT = 3;
