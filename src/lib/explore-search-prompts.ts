/**
 * Search overlay — static placeholder + curated chips.
 * Chips submit through the Explore parse pipeline; Filters owns the full facet lists.
 */

import { HOME_BROWSE_CATEGORIES } from "@/lib/home-browse-categories";

export type ExploreSearchPrompt = {
  id: string;
  label: string;
  /** Submitted through the normal Explore search pipeline */
  searchQuery: string;
};

export type ExploreSearchPromptGroup = {
  id: string;
  title: string;
  prompts: readonly ExploreSearchPrompt[];
};

/** Closed bar + overlay input — teaches what clients can type or tap. */
export const EXPLORE_SEARCH_PLACEHOLDER =
  "Search — profession, price, gender, specialty";

function promptsFromLabels(
  prefix: string,
  labels: readonly string[]
): ExploreSearchPrompt[] {
  return labels.map((label) => ({
    id: `${prefix}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label,
    searchQuery: label,
  }));
}

/** Five homepage profession lanes (Filters still has the full list). */
const PROFESSION_PROMPTS: readonly ExploreSearchPrompt[] = promptsFromLabels(
  "profession",
  HOME_BROWSE_CATEGORIES.slice(0, 5).map((category) => category.label)
);

/**
 * Five Explore specialties that parse to the specialty filter
 * (skip labels that the search parser treats as a profession, e.g. Yoga).
 */
const SPECIALTY_PROMPTS: readonly ExploreSearchPrompt[] = promptsFromLabels(
  "specialty",
  ["Weight Loss", "HYROX", "Sports Performance", "Mobility", "Recovery"]
);

/** Gender chips match Explore filters (Women / Men). */
const GENDER_PROMPTS: readonly ExploreSearchPrompt[] = [
  { id: "gender-women", label: "Women", searchQuery: "Women" },
  { id: "gender-men", label: "Men", searchQuery: "Men" },
] as const;

/** Session-price buckets the parser already understands (`under 130`, etc.). */
const PRICE_PROMPTS: readonly ExploreSearchPrompt[] = [
  { id: "price-100", label: "Under $100", searchQuery: "Under $100" },
  { id: "price-130", label: "Under $130", searchQuery: "Under $130" },
  { id: "price-150", label: "Under $150", searchQuery: "Under $150" },
  { id: "price-175", label: "Under $175", searchQuery: "Under $175" },
  { id: "price-200", label: "Under $200", searchQuery: "Under $200" },
] as const;

export const EXPLORE_SEARCH_PROMPT_GROUPS: readonly ExploreSearchPromptGroup[] =
  [
    {
      id: "profession",
      title: "Profession",
      prompts: PROFESSION_PROMPTS,
    },
    {
      id: "specialty",
      title: "Specialty",
      prompts: SPECIALTY_PROMPTS,
    },
    {
      id: "gender",
      title: "Gender",
      prompts: GENDER_PROMPTS,
    },
    {
      id: "price",
      title: "Price",
      prompts: PRICE_PROMPTS,
    },
  ] as const;

export const EXPLORE_RECENT_SEARCH_OVERLAY_LIMIT = 3;
