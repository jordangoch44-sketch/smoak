import { formatPrice, formatTrainerRating } from "@/lib/utils";
import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types";

export function formatTrainerDistanceLabel(
  trainer: Trainer,
  userCoords: UserGeoPoint | null
): string | null {
  const miles = getTrainerDistanceMiles(trainer, userCoords);
  if (miles === null) return null;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/** Classic ★ for cards — "New" when there are no reviews yet (avoid ★0.0). */
export function formatTrainerRatingLabel(trainer: Trainer): string {
  if (trainer.reviewCount <= 0) return "New";
  return formatTrainerRating(trainer.rating);
}

export function formatTrainerPriceLabel(amount: number): string {
  return `From ${formatPrice(amount)}`;
}
