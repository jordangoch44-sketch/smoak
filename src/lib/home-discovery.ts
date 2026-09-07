import { formatTrainerSessionPrice } from "@/lib/session-price";
import type { Trainer } from "@/types/trainer";

export function formatTrainerPriceLabel(trainer: Trainer): string {
  return formatTrainerSessionPrice(trainer);
}
