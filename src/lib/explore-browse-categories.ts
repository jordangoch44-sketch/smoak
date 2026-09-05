import type { TrainerFilters } from "@/types";
import { canonicalizeProfessionLabel } from "@/lib/profession-category";

/**
 * Popular categories on Explore — same six lanes as the marketplace homepage.
 */

export type ExploreBrowseCategoryIcon =
  | "dumbbell"
  | "medical"
  | "spine"
  | "yoga"
  | "leaf"
  | "running";

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
    id: "personal-training",
    label: "Personal Training",
    searchQuery: "Personal Training",
    profession: "Personal Training",
    icon: "dumbbell",
  },
  {
    id: "physical-therapy",
    label: "Physical Therapy",
    searchQuery: "Physical Therapy",
    profession: "Physical Therapy",
    icon: "medical",
  },
  {
    id: "bodywork",
    label: "Bodywork",
    searchQuery: "Bodywork",
    profession: "Bodywork",
    icon: "spine",
  },
  {
    id: "pilates",
    label: "Pilates",
    searchQuery: "Pilates",
    profession: "Pilates",
    icon: "yoga",
  },
  {
    id: "nutrition-dietetics",
    label: "Nutrition & Dietetics",
    searchQuery: "Nutrition & Dietetics",
    profession: "Nutrition & Dietetics",
    icon: "leaf",
  },
  {
    id: "sports-endurance-coaching",
    label: "Sports/Endurance Coaching",
    searchQuery: "Sports/Endurance Coaching",
    profession: "Sports/Endurance Coaching",
    icon: "running",
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
  const professionRaw = (activeProfession ?? filters?.profession ?? "").trim();
  const profession = (
    canonicalizeProfessionLabel(professionRaw) ?? professionRaw
  ).toLowerCase();
  const specialty = (activeSpecialty ?? filters?.specialty ?? "").trim().toLowerCase();
  const query = activeSearchQuery.trim().toLowerCase();

  const targetProfession = (category.profession ?? "").toLowerCase();
  const targetSpecialty = (category.specialty ?? "").toLowerCase();
  const targetQuery = category.searchQuery.toLowerCase();
  const targetLabel = category.label.toLowerCase();

  if (profession) {
    if (targetProfession && profession === targetProfession) {
      return true;
    }
    if (profession === targetQuery || profession === targetLabel) {
      return true;
    }
  }

  if (specialty) {
    if (targetSpecialty && specialty === targetSpecialty) {
      return true;
    }
    if (specialty === targetQuery || specialty === targetLabel) {
      return true;
    }
  }

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
