import type { Trainer } from "@/types/trainer";

/** Client-visible label for the highest-priority paid placement on a card. */
export function getTrainerPlacementBadge(trainer: Trainer): string | null {
  if (trainer.categorySpotlight) return "Category spotlight";
  if (trainer.sponsored) return "Sponsored";
  if (trainer.featured) return "Featured";
  if (trainer.topRanked) return "Ranking boost";
  return null;
}
