"use client";

import { SMOAC_PRO_PRICE_LABEL } from "@/lib/specialist-premium";

interface ProTrialLastChanceBannerProps {
  daysRemaining?: number | null;
  onUpgrade: () => void;
}

/**
 * Final-day Pro trial banner — CTA opens the in-dashboard Pro checkout.
 */
export function ProTrialLastChanceBanner({
  daysRemaining,
  onUpgrade,
}: ProTrialLastChanceBannerProps) {
  const dayLine =
    typeof daysRemaining === "number" && daysRemaining <= 0
      ? "Your free Pro month ends today."
      : "Your free Pro month ends today — this is your last chance.";

  return (
    <aside
      className="specialist-last-chance-banner"
      role="status"
      aria-live="polite"
    >
      <div className="specialist-last-chance-banner__copy">
        <p className="specialist-last-chance-banner__eyebrow">Last chance</p>
        <p className="specialist-last-chance-banner__title">LAST CHANCE</p>
        <p className="specialist-last-chance-banner__body">
          {dayLine} Upgrade now to keep Pro analytics, ranking intelligence, and
          growth insights. Without Pro, those insights lock and you return to
          Free.
        </p>
      </div>
      <div className="specialist-last-chance-banner__actions">
        <button
          type="button"
          className="smoac-control specialist-last-chance-banner__primary"
          onClick={onUpgrade}
        >
          Upgrade to Pro · {SMOAC_PRO_PRICE_LABEL}
        </button>
      </div>
    </aside>
  );
}
