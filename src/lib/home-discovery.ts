import { formatPrice } from "@/lib/utils";

export function formatTrainerPriceLabel(amount: number): string {
  return `From ${formatPrice(amount)}`;
}
