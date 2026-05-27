/** Generic helpers (formatting, class names, strings). No domain logic. */

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Trainer aggregate rating — always one decimal (e.g. 5 → 5.0) */
export function formatTrainerRating(rating: number): string {
  return rating.toFixed(1);
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
