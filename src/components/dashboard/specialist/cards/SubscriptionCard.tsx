"use client";

import { useState } from "react";
import type { SpecialistSubscription } from "@/types/specialist-dashboard";
import { SMOAC_PRO_PRICE_LABEL } from "@/lib/specialist-premium";
import { DashboardButton, DashboardSection } from "@/components/dashboard/shared";

interface SubscriptionCardProps {
  subscription: SpecialistSubscription;
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Billing portal is not available yet.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not open billing. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardSection
      title="Subscription / account settings"
      description="Your SMOAC marketplace plan"
    >
      <div className="dashboard-account-card">
        <div className="dashboard-account-card__row">
          <span className="dashboard-account-card__label">Plan</span>
          <span className="dashboard-account-card__value">{subscription.plan}</span>
        </div>
        <div className="dashboard-account-card__row">
          <span className="dashboard-account-card__label">Status</span>
          <span className="dashboard-account-card__value">{subscription.status}</span>
        </div>
        {subscription.isPremium ? (
          <div className="dashboard-account-card__row">
            <span className="dashboard-account-card__label">Renews</span>
            <span className="dashboard-account-card__value">{subscription.renewsOn}</span>
          </div>
        ) : (
          <div className="dashboard-account-card__row">
            <span className="dashboard-account-card__label">Pro</span>
            <span className="dashboard-account-card__value">{SMOAC_PRO_PRICE_LABEL}</span>
          </div>
        )}
        {error ? (
          <p className="dashboard-account-card__error" role="alert">
            {error}
          </p>
        ) : null}
        <DashboardButton
          variant="link"
          onClick={() => void openPortal()}
          disabled={busy}
        >
          {busy ? "Opening billing…" : "Manage billing →"}
        </DashboardButton>
      </div>
    </DashboardSection>
  );
}
