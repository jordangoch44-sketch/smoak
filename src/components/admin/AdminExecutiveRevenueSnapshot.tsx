"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatRevenueCents } from "@/lib/admin-revenue-service";
import { getAdminExecutiveRevenueSnapshot } from "@/lib/admin-executive-revenue-service";
import { fetchAdminPlatformPulse } from "@/lib/admin-platform-pulse-service";
import type { AdminPlatformPulse, AdminWeeklyCount } from "@/types/admin-platform-pulse";
import type { AdminSpecialistRow } from "@/hooks/useAdminDashboard";
import { cn } from "@/lib/utils";

interface AdminExecutiveRevenueSnapshotProps {
  specialists: AdminSpecialistRow[];
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

export function AdminExecutiveRevenueSnapshot({
  specialists,
}: AdminExecutiveRevenueSnapshotProps) {
  const [pulse, setPulse] = useState<AdminPlatformPulse | null>(null);
  const [specialistBump, setSpecialistBump] = useState(false);
  const previousSpecialistTotal = useRef<number | null>(null);

  /* Refetch when the admin specialist list changes (e.g. an approval),
   * so live totals update without a page reload. */
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
  }, [specialists]);

  const snapshot = useMemo(
    () =>
      getAdminExecutiveRevenueSnapshot({
        specialistRows: specialists.map((row) => ({
          id: row.id,
          name: row.name,
          isPremium: row.isPremium,
          featured: row.featured,
        })),
      }),
    [specialists]
  );

  const growthPositive =
    snapshot.monthOverMonthPercent == null ||
    snapshot.monthOverMonthPercent >= 0;

  const livePulse = pulse?.dataSource === "live" ? pulse : null;
  const traffic = livePulse?.traffic ?? null;

  return (
    <section
      className="admin-exec-snapshot"
      aria-label="Executive revenue snapshot"
    >
      <header className="admin-exec-snapshot__header">
        <div>
          <h2 className="admin-exec-snapshot__title">Executive snapshot</h2>
          <p className="admin-exec-snapshot__period">{snapshot.periodLabel}</p>
        </div>
        {snapshot.dataSource === "mock" ? (
          <span className="admin-exec-snapshot__demo">Revenue: demo data</span>
        ) : null}
      </header>

      <div className="admin-exec-snapshot__grid">
        <article className="admin-exec-snapshot__card admin-exec-snapshot__card--hero">
          <p className="admin-exec-snapshot__label">Net Sales This Month</p>
          <p className="admin-exec-snapshot__value admin-exec-snapshot__value--hero">
            {formatRevenueCents(snapshot.netSalesCents)}
          </p>
          <p className="admin-exec-snapshot__sublabel">Subscribers + Ads</p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Subscriber Revenue</p>
          <p className="admin-exec-snapshot__value">
            {formatRevenueCents(snapshot.subscriberRevenueCents)}
          </p>
          <p className="admin-exec-snapshot__detail">
            {snapshot.paidSubscriberCount} paid subscriber
            {snapshot.paidSubscriberCount === 1 ? "" : "s"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Ad Revenue</p>
          <p className="admin-exec-snapshot__value">
            {formatRevenueCents(snapshot.adRevenueCents)}
          </p>
          <p className="admin-exec-snapshot__detail">
            {snapshot.dataSource === "mock"
              ? "Estimated from active placements"
              : "Active ad placements"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Monthly Growth</p>
          <p
            className={cn(
              "admin-exec-snapshot__value",
              "admin-exec-snapshot__value--growth",
              growthPositive
                ? "admin-exec-snapshot__value--up"
                : "admin-exec-snapshot__value--down"
            )}
          >
            {snapshot.monthOverMonthLabel}
          </p>
          <p className="admin-exec-snapshot__detail">vs. prior month</p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Specialists</p>
          <p
            className={cn(
              "admin-exec-snapshot__value",
              specialistBump && "admin-exec-snapshot__value--bump"
            )}
          >
            {livePulse ? livePulse.specialists.total : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {livePulse
              ? weeklyChangeLabel(livePulse.specialists)
              : "Live count unavailable"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Clients</p>
          <p className="admin-exec-snapshot__value">
            {livePulse ? livePulse.clients.total : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {livePulse
              ? weeklyChangeLabel(livePulse.clients)
              : "Live count unavailable"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Site Views (7d)</p>
          <p className="admin-exec-snapshot__value">
            {traffic ? traffic.views : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {traffic
              ? trafficChangeLabel(traffic.viewsPercentChange)
              : "Awaiting traffic capture"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card">
          <p className="admin-exec-snapshot__label">Visitors (7d)</p>
          <p className="admin-exec-snapshot__value">
            {traffic ? traffic.uniqueVisitors : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {traffic && traffic.topSources.length > 0
              ? `Top source: ${traffic.topSources[0].source}`
              : "Sources appear with traffic"}
          </p>
        </article>
      </div>
    </section>
  );
}
