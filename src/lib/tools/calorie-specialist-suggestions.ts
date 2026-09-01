/**
 * Specialist suggestions after the calorie tool — sponsored first (labeled),
 * then organic fill. Prefer nutrition + coaching professions.
 */

import { trainerMatchesProfessionCategory } from "@/lib/profession-category";
import { selectPlacementRailTrainers } from "@/lib/sponsored-rail";
import { isTrainerSponsored } from "@/lib/trainer-sponsorship";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import { sortTrainersByProximity } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types/trainer";
import type { CalorieGoalId } from "@/lib/tools/calorie-calculator";

const GOAL_PROFESSIONS: Record<CalorieGoalId, readonly string[]> = {
  lose: ["Nutritionist", "Wellness Coach", "Personal Trainer", "Strength Coach"],
  maintain: [
    "Personal Trainer",
    "Nutritionist",
    "Strength Coach",
    "Wellness Coach",
  ],
  gain: ["Strength Coach", "Personal Trainer", "Nutritionist", "Wellness Coach"],
};

export type CalorieSuggestionKind = "sponsored" | "suggested";

export interface CalorieSpecialistSuggestion {
  trainer: Trainer;
  kind: CalorieSuggestionKind;
}

function matchesGoalProfession(
  trainer: Trainer,
  goalId: CalorieGoalId
): boolean {
  return GOAL_PROFESSIONS[goalId].some((profession) =>
    trainerMatchesProfessionCategory(trainer, profession)
  );
}

/**
 * Build a short shortlist: paid boosts first (labeled Sponsored), then
 * organic specialists matched to the calorie goal.
 */
export function selectCalorieToolSpecialists(
  catalog: readonly Trainer[],
  opts: {
    goalId: CalorieGoalId;
    personalizationCity: string | null;
    userCoords: UserGeoPoint | null;
    limit?: number;
  }
): CalorieSpecialistSuggestion[] {
  const limit = opts.limit ?? 6;
  const pool = catalog.filter((trainer) =>
    matchesGoalProfession(trainer, opts.goalId)
  );
  const eligible = pool.length > 0 ? pool : [...catalog];

  const sponsoredRail = selectPlacementRailTrainers(
    eligible.filter(isTrainerSponsored),
    {
      personalizationCity: opts.personalizationCity,
      userCoords: opts.userCoords,
      limit,
    }
  );

  const suggestions: CalorieSpecialistSuggestion[] = sponsoredRail.trainers.map(
    (trainer) => ({ trainer, kind: "sponsored" as const })
  );

  if (suggestions.length >= limit) {
    return suggestions.slice(0, limit);
  }

  const taken = new Set(suggestions.map((row) => row.trainer.id));
  const organic = sortTrainersByProximity(
    eligible.filter((trainer) => !taken.has(trainer.id)),
    opts.userCoords
  );

  for (const trainer of organic) {
    suggestions.push({ trainer, kind: "suggested" });
    if (suggestions.length >= limit) break;
  }

  return suggestions;
}
