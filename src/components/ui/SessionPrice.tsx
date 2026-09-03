import { cn, formatPrice } from "@/lib/utils";

export type SessionPriceVariant = "compact" | "grid" | "hero" | "stat";

interface SessionPriceProps {
  amount: number;
  variant?: SessionPriceVariant;
  className?: string;
}

/** Listing session rate — "≈ $120 / session" with a soft-green dollar amount */
export function SessionPrice({
  amount,
  variant = "grid",
  className,
}: SessionPriceProps) {
  return (
    <span
      className={cn("session-price", `session-price--${variant}`, className)}
    >
      <span className="session-price__prefix">≈ </span>
      <span className="session-price__amount">{formatPrice(amount)}</span>
      <span className="session-price__suffix"> / session</span>
    </span>
  );
}
