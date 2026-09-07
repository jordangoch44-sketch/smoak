import { cn, formatPrice } from "@/lib/utils";
import {
  hasSessionPrice,
  normalizeSessionPriceRange,
  resolveTrainerSessionPriceRange,
  type SessionPriceSource,
} from "@/lib/session-price";

export type SessionPriceVariant = "compact" | "grid" | "hero" | "stat";

interface SessionPriceProps {
  trainer?: SessionPriceSource;
  min?: number;
  max?: number;
  variant?: SessionPriceVariant;
  className?: string;
}

/** Listing session rate — "$80–$120 / session" with a soft-green dollar amount */
export function SessionPrice({
  trainer,
  min,
  max,
  variant = "grid",
  className,
}: SessionPriceProps) {
  const range = trainer
    ? resolveTrainerSessionPriceRange(trainer)
    : normalizeSessionPriceRange(min ?? 0, max ?? min ?? 0);
  if (!hasSessionPrice(range)) return null;

  const amount =
    range.min === range.max
      ? formatPrice(range.max)
      : `${formatPrice(range.min)}–${formatPrice(range.max)}`;

  return (
    <span
      className={cn("session-price", `session-price--${variant}`, className)}
    >
      <span className="session-price__amount">{amount}</span>
      <span className="session-price__suffix"> / session</span>
    </span>
  );
}
