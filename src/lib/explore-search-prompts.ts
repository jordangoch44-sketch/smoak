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

const PHRASE_PATTERN_CACHE = new Map<string, RegExp>();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-phrase match so “Men” does not light up inside “Mental Health”. */
function phrasePattern(phrase: string): RegExp {
  const key = phrase.trim();
  const cached = PHRASE_PATTERN_CACHE.get(key);
  if (cached) return cached;
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(key)}(?=\\s|$)`, "i");
  PHRASE_PATTERN_CACHE.set(key, pattern);
  return pattern;
}

export function isSearchPromptSelected(
  draft: string,
  prompt: ExploreSearchPrompt
): boolean {
  const text = draft.trim();
  if (!text) return false;
  if (phrasePattern(prompt.searchQuery).test(text)) return true;
  return (
    prompt.label !== prompt.searchQuery && phrasePattern(prompt.label).test(text)
  );
}

function stripPhrase(draft: string, phrase: string): string {
  const trimmed = phrase.trim();
  if (!trimmed) return draft.trim();
  return draft
    .replace(phrasePattern(trimmed), " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Toggle a prompt into the draft. One chip per group (profession / specialty /
 * gender / price); chips across groups stack until Search is tapped.
 */
export function toggleSearchPromptInDraft(
  draft: string,
  prompt: ExploreSearchPrompt,
  group: ExploreSearchPromptGroup
): string {
  if (isSearchPromptSelected(draft, prompt)) {
    let next = stripPhrase(draft, prompt.searchQuery);
    if (prompt.label !== prompt.searchQuery) {
      next = stripPhrase(next, prompt.label);
    }
    return next;
  }

  let next = draft;
  for (const other of group.prompts) {
    next = stripPhrase(next, other.searchQuery);
    if (other.label !== other.searchQuery) {
      next = stripPhrase(next, other.label);
    }
  }
  return [next, prompt.searchQuery.trim()].filter(Boolean).join(" ");
}
