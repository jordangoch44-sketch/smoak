import type { TrainerFilters } from "@/types";

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
  profession?: string;
  specialty?: string;
  icon: ExploreBrowseCategoryIcon;
}

export const EXPLORE_BROWSE_CATEGORIES: readonly ExploreBrowseCategory[] = [
  {
    id: "personal-trainer",
    label: "Personal Trainer",
    searchQuery: "Personal Trainer",
    profession: "Personal Trainer",
    icon: "dumbbell",
  },
  {
    id: "nutritionist",
    label: "Nutritionist",
    searchQuery: "Nutritionist",
    profession: "Nutritionist",
    icon: "leaf",
  },
  {
    id: "running-coach",
    label: "Running Coach",
    searchQuery: "Running Coach",
    profession: "Running Coach",
    icon: "running",
  },
  {
    id: "strength-coach",
    label: "Strength Coach",
    searchQuery: "Strength Coaching",
    profession: "Strength Coach",
    specialty: "Strength Coaching",
    icon: "strength",
  },
  {
    id: "physical-therapist",
    label: "Physical Therapist",
    searchQuery: "Physical Therapist",
    profession: "Physical Therapist",
    icon: "medical",
  },
  {
    id: "yoga-instructor",
    label: "Yoga Instructor",
    searchQuery: "Yoga",
    profession: "Yoga Instructor",
    specialty: "Yoga",
    icon: "yoga",
  },
] as const;

export interface CategoryActiveCheckOptions {
  activeSearchQuery?: string;
  filters?: TrainerFilters;
  activeProfession?: string;
  activeSpecialty?: string;
}

export function isExploreCategoryActive(
  category: ExploreBrowseCategory,
  options?: CategoryActiveCheckOptions
): boolean {
  if (!options) return false;
  const { activeSearchQuery = "", filters, activeProfession, activeSpecialty } = options;
  const profession = (activeProfession ?? filters?.profession ?? "").trim().toLowerCase();
  const specialty = (activeSpecialty ?? filters?.specialty ?? "").trim().toLowerCase();
  const query = activeSearchQuery.trim().toLowerCase();

  const targetProfession = (category.profession ?? "").toLowerCase();
  const targetSpecialty = (category.specialty ?? "").toLowerCase();
  const targetQuery = category.searchQuery.toLowerCase();
  const targetLabel = category.label.toLowerCase();

  // 1. Profession filter match
  if (profession) {
    if (targetProfession && profession === targetProfession) {
      return true;
    }
    if (profession === targetQuery || profession === targetLabel) {
      return true;
    }
  }

  // 2. Specialty filter match
  if (specialty) {
    if (targetSpecialty && specialty === targetSpecialty) {
      return true;
    }
    if (specialty === targetQuery || specialty === targetLabel) {
      return true;
    }
    if (
      category.id === "strength-coach" &&
      (specialty === "strength coaching" || specialty === "strength training")
    ) {
      return true;
    }
  }

  // 3. Search query match
  if (query) {
    if (
      query === targetQuery ||
      query === targetLabel ||
      (targetProfession && query === targetProfession) ||
      (targetSpecialty && query === targetSpecialty) ||
      query === category.id.toLowerCase()
    ) {
      return true;
    }
  }

  return false;
}
