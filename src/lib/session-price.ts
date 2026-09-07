import { formatPrice } from "@/lib/utils";
import type { SpecialistApplicationPricing } from "@/types/specialist-application";
import type { Trainer } from "@/types/trainer";

export interface SessionPriceRange {
  min: number;
  max: number;
}

export type SessionPriceSource = Pick<
  Trainer,
  "pricePerSession" | "pricePerSessionMin" | "pricePerSessionMax"
>;

/** Coerce admin/DB/onboarding rates (string, number, or missing). */
export function parseSessionPrice(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }
  if (typeof value !== "string") return 0;
  const digits = value.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

export function normalizeSessionPriceRange(
  min: number,
  max: number
): SessionPriceRange {
  const low = parseSessionPrice(min);
  const high = parseSessionPrice(max);
  if (low <= 0 && high <= 0) return { min: 0, max: 0 };
  if (low <= 0) return { min: high, max: high };
  if (high <= 0) return { min: low, max: low };
  return low <= high ? { min: low, max: high } : { min: high, max: low };
}

export function hasSessionPrice(range: SessionPriceRange): boolean {
  return range.min > 0 && range.max > 0;
}

export function resolveTrainerSessionPriceRange(
  trainer: SessionPriceSource
): SessionPriceRange {
  const listing = parseSessionPrice(trainer.pricePerSession);
  const min = parseSessionPrice(trainer.pricePerSessionMin);
  const max = parseSessionPrice(trainer.pricePerSessionMax);
  return normalizeSessionPriceRange(
    min || max || listing,
    max || listing || min
  );
}

export function withSyncedSessionPrices<T extends SessionPriceSource>(
  trainer: T,
  range = resolveTrainerSessionPriceRange(trainer)
): T {
  return {
    ...trainer,
    pricePerSessionMin: range.min,
    pricePerSessionMax: range.max,
    pricePerSession: range.max,
  };
}

/** "$80–$120" or "$120" when the range is a single rate. */
export function formatSessionPriceAmount(range: SessionPriceRange): string {
  const synced = normalizeSessionPriceRange(range.min, range.max);
  if (!hasSessionPrice(synced)) return "";
  if (synced.min === synced.max) return formatPrice(synced.max);
  return `${formatPrice(synced.min)}–${formatPrice(synced.max)}`;
}

/** Listing label — "$80–$120 / session" */
export function formatSessionPriceRange(range: SessionPriceRange): string {
  const amount = formatSessionPriceAmount(range);
  return amount ? `${amount} / session` : "";
}

export function formatTrainerSessionPrice(trainer: SessionPriceSource): string {
  return formatSessionPriceRange(resolveTrainerSessionPriceRange(trainer));
}

export function formatSessionPricePlain(min: number, max = min): string {
  return formatSessionPriceRange(normalizeSessionPriceRange(min, max));
}

export function resolveApplicationSessionPriceRange(
  pricing: SpecialistApplicationPricing | null | undefined
): SessionPriceRange {
  const min = parseSessionPrice(pricing?.oneOnOnePriceMin);
  const max = parseSessionPrice(pricing?.oneOnOnePriceMax);
  const legacy = parseSessionPrice(pricing?.oneOnOnePrice);
  const online = parseSessionPrice(pricing?.onlineCoachingPrice);
  return normalizeSessionPriceRange(
    min || legacy || max || online,
    max || legacy || min || online
  );
}

export function formatApplicationSessionPrice(
  pricing: SpecialistApplicationPricing | null | undefined
): string {
  return formatSessionPriceRange(resolveApplicationSessionPriceRange(pricing));
}

export function applicationPricingFromRange(
  minRaw: string,
  maxRaw: string,
  prev: SpecialistApplicationPricing
): SpecialistApplicationPricing {
  const range = normalizeSessionPriceRange(
    parseSessionPrice(minRaw),
    parseSessionPrice(maxRaw)
  );
  const minText = minRaw.trim();
  const maxText = maxRaw.trim();
  return {
    ...prev,
    oneOnOnePriceMin: minText,
    oneOnOnePriceMax: maxText,
    /* Legacy single field stays the high end so older readers still work. */
    oneOnOnePrice: maxText || minText || (range.max > 0 ? String(range.max) : ""),
  };
}

/** Explore filter overlap: specialist range intersects the selected budget. */
export function trainerSessionPriceOverlapsFilter(
  trainer: SessionPriceSource,
  filterMin: number | null,
  filterMax: number | null
): boolean {
  const range = resolveTrainerSessionPriceRange(trainer);
  if (!hasSessionPrice(range)) return false;
  if (filterMin != null && range.max < filterMin) return false;
  if (filterMax != null && range.min > filterMax) return false;
  return true;
}
