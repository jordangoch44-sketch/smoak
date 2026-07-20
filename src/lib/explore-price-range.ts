/**
 * Explore “Price per session” range — single config for slider + filtering.
 * Bounds cover current catalog pricing with headroom ($95–$195 today).
 */
export const EXPLORE_PRICE_RANGE = {
  min: 25,
  max: 300,
  step: 5,
} as const;

export function clampExplorePrice(value: number): number {
  const { min, max, step } = EXPLORE_PRICE_RANGE;
  const clamped = Math.min(max, Math.max(min, value));
  const stepped = Math.round(clamped / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

export function parseExplorePriceBound(
  raw: string,
  fallback: number
): number {
  if (!raw.trim()) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clampExplorePrice(parsed);
}

/** True when the range is the full slider span (no active price filter). */
export function isFullExplorePriceRange(min: number, max: number): boolean {
  return min <= EXPLORE_PRICE_RANGE.min && max >= EXPLORE_PRICE_RANGE.max;
}

export function formatExplorePrice(value: number): string {
  return `$${value}`;
}

export function formatExplorePriceRangeLabel(min: number, max: number): string {
  return `${formatExplorePrice(min)} – ${formatExplorePrice(max)}`;
}
