"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAdminPlatformPulse } from "@/lib/admin-platform-pulse-service";
import { formatBillingCents } from "@/lib/admin-specialist-billing-service";
import type { AdminPlatformPulse, AdminWeeklyCount } from "@/types/admin-platform-pulse";
import { cn } from "@/lib/utils";

interface AdminExecutiveRevenueSnapshotProps {
  /** Bump pulse refresh when specialists change in-session */
  refreshKey?: string | number;
}

function weeklyChangeLabel(count: AdminWeeklyCount): string {
  const sign = count.delta >= 0 ? "+" : "";
  const base = `${sign}${count.delta} this week`;
  if (count.percentChange == null) return base;
  const pctSign = count.percentChange >= 0 ? "+" : "";
  return `${base} (${pctSign}${count.percentChange.toFixed(1)}%)`;
}

function trafficChangeLabel(percent: number | null): string {
  if (percent == null) return "vs. prior week: —";
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}% vs. prior week`;
}

/**
 * Top-of-admin core pulse — six cards from live Supabase (not demo seeds).
 */
export function AdminExecutiveRevenueSnapshot({
  refreshKey,
}: AdminExecutiveRevenueSnapshotProps) {
  const [pulse, setPulse] = useState<AdminPlatformPulse | null>(null);
  const [specialistBump, setSpecialistBump] = useState(false);
  const previousSpecialistTotal = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminPlatformPulse().then((result) => {
      if (cancelled) return;
      setPulse(result);
      if (result.dataSource === "live") {
        const prev = previousSpecialistTotal.current;
        if (prev != null && result.specialists.total > prev) {
          setSpecialistBump(true);
          window.setTimeout(() => setSpecialistBump(false), 1400);
        }
        previousSpecialistTotal.current = result.specialists.total;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const live = pulse?.dataSource === "live" ? pulse : null;
  const traffic = live?.traffic ?? null;
  const earnings = live?.earnings ?? null;

  return (
    <section className="admin-exec-snapshot" aria-label="Platform snapshot">
      <header className="admin-exec-snapshot__header">
        <div>
          <h2 className="admin-exec-snapshot__title">Snapshot</h2>
          <p className="admin-exec-snapshot__period">
            {live ? "Live platform pulse" : "Connecting to live data…"}
          </p>
        </div>
        {live ? (
          <span className="admin-exec-snapshot__live">Live</span>
        ) : (
          <span className="admin-exec-snapshot__demo">Unavailable</span>
        )}
      </header>

      <div className="admin-exec-snapshot__grid admin-exec-snapshot__grid--core6">
        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Specialists</p>
          <p
            className={cn(
              "admin-exec-snapshot__value",
              specialistBump && "admin-exec-snapshot__value--bump"
            )}
          >
            {live ? live.specialists.total : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {live
              ? weeklyChangeLabel(live.specialists)
              : "Live count unavailable"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Clients</p>
          <p className="admin-exec-snapshot__value">
            {live ? live.clients.total : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {live ? weeklyChangeLabel(live.clients) : "Live count unavailable"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Pending applications</p>
          <p className="admin-exec-snapshot__value">
            {live ? live.pendingApplications : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">Needs review</p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Site views (7d)</p>
          <p className="admin-exec-snapshot__value">
            {traffic ? traffic.views : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {traffic
              ? trafficChangeLabel(traffic.viewsPercentChange)
              : "Awaiting traffic capture"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card admin-exec-snapshot__card--earn">
          <p className="admin-exec-snapshot__label">Paid specialists</p>
          <p className="admin-exec-snapshot__value">
            {earnings
              ? formatBillingCents(earnings.subscriberRevenueCents, {
                  decimals: 0,
                })
              : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {earnings
              ? `${earnings.paidSubscriberCount} paying · ${earnings.periodLabel}`
              : "From live premium flags"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card admin-exec-snapshot__card--earn">
          <p className="admin-exec-snapshot__label">Ad revenue</p>
          <p className="admin-exec-snapshot__value">
            {earnings
              ? formatBillingCents(earnings.adRevenueCents, { decimals: 0 })
              : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {earnings
              ? `Catalog est. · ${earnings.periodLabel}`
              : "From live placement flags"}
          </p>
        </article>
      </div>
    </section>
  );
}
