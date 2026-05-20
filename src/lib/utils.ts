import type { Trainer, TrainerFilters } from "@/types/trainer";

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function filterTrainers(
  trainers: Trainer[],
  filters: TrainerFilters
): Trainer[] {
  return trainers.filter((trainer) => {
    if (filters.location && trainer.city !== filters.location) {
      return false;
    }
    if (
      filters.specialty &&
      !trainer.specialty.includes(
        filters.specialty as Trainer["specialty"][number]
      )
    ) {
      return false;
    }
    if (filters.gender && trainer.gender !== filters.gender) {
      return false;
    }
    if (filters.priceMax) {
      const max = parseInt(filters.priceMax, 10);
      if (trainer.pricePerSession > max) {
        return false;
      }
    }
    return true;
  });
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
