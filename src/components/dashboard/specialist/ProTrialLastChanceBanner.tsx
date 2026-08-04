"use client";

import { useState } from "react";
import { SMOAC_PRO_PRICE_LABEL } from "@/lib/specialist-premium";

interface ProTrialLastChanceBannerProps {
  daysRemaining?: number | null;
}

/**
 * Final-day Pro trial banner — CTA opens Stripe Checkout for paid Pro.
 */
export function ProTrialLastChanceBanner({
  daysRemaining,
}: ProTrialLastChanceBannerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "premium" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout is not available yet.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout. Try again.");
    } finally {
      setBusy(false);
    }
  }

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
        {error ? (
          <p className="specialist-last-chance-banner__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="specialist-last-chance-banner__actions">
        <button
          type="button"
          className="smoac-control specialist-last-chance-banner__primary"
          onClick={() => void startCheckout()}
          disabled={busy}
        >
          {busy
            ? "Opening checkout…"
            : `Upgrade to Pro · ${SMOAC_PRO_PRICE_LABEL}`}
        </button>
      </div>
    </aside>
  );
}
