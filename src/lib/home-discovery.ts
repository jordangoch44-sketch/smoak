import { formatPrice } from "@/lib/utils";

export function formatTrainerPriceLabel(amount: number): string {
  return `≈ ${formatPrice(amount)} / session`;
}
