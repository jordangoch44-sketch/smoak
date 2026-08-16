"use client";

import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard";
import { AdminHomepageEssencePanel } from "@/components/admin/panels/AdminHomepageEssencePanel";

interface PlatformStatus {
  siteUrl: string;
  stripeConfigured: boolean;
  emailMode: "resend" | "console";
  emailFromConfigured: boolean;
  supabaseConfigured: boolean;
  ranking: {
    source: string;
    formula: string;
    excludes: string[];
  };
}

export function AdminSettingsPanel() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/platform-status", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          body:
            | ({ ok?: boolean; message?: string } & Partial<PlatformStatus>)
            | null
        ) => {
          if (cancelled) return;
          if (!body?.ok || !body.siteUrl || !body.ranking) {
            setError(body?.message ?? "Could not load platform status.");
            return;
          }
          setStatus({
            siteUrl: body.siteUrl,
            stripeConfigured: Boolean(body.stripeConfigured),
            emailMode: body.emailMode === "resend" ? "resend" : "console",
            emailFromConfigured: Boolean(body.emailFromConfigured),
            supabaseConfigured: Boolean(body.supabaseConfigured),
            ranking: {
              source: body.ranking.source,
              formula: body.ranking.formula,
              excludes: body.ranking.excludes,
            },
          });
        }
      )
      .catch(() => {
        if (!cancelled) setError("Could not load platform status.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-settings-stack">
      <AdminHomepageEssencePanel />

      <DashboardSection
        title="Platform status"
        description="Live infrastructure checks for SMOAC ops."
      >
        {error ? <p className="admin-status-error">{error}</p> : null}
        {!status && !error ? (
          <p className="admin-empty">Loading status…</p>
        ) : null}
        {status ? (
          <div className="admin-placeholder-grid">
            <div className="admin-placeholder-card">
              <h3>Site URL</h3>
              <p>{status.siteUrl}</p>
            </div>
            <div className="admin-placeholder-card">
              <h3>Supabase</h3>
              <p>
                {status.supabaseConfigured ? "Connected" : "Not configured"}
              </p>
            </div>
            <div className="admin-placeholder-card">
              <h3>Transactional email</h3>
              <p>
                {status.emailMode === "resend"
                  ? `Resend${status.emailFromConfigured ? " · From configured" : ""}`
                  : "Console fallback (set RESEND_API_KEY)"}
              </p>
            </div>
            <div className="admin-placeholder-card">
              <h3>Stripe</h3>
              <p>
                {status.stripeConfigured
                  ? "Configured — Revenue + Checkout use live Stripe products"
                  : "Not configured — set STRIPE_SECRET_KEY and STRIPE_PRICE_*"}
              </p>
            </div>
            <div className="admin-placeholder-card">
              <h3>City rankings</h3>
              <p>
                {status.ranking.source}. Sort: {status.ranking.formula}.
                Excludes: {status.ranking.excludes.join(", ")}.
              </p>
            </div>
          </div>
        ) : null}
      </DashboardSection>
    </div>
  );
}
