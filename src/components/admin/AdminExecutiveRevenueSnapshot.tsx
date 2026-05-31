"use client";

import { useMemo } from "react";
import { formatRevenueCents } from "@/lib/admin-revenue-service";
import { getAdminExecutiveRevenueSnapshot } from "@/lib/admin-executive-revenue-service";
import type { AdminSpecialistRow } from "@/hooks/useAdminDashboard";
import { cn } from "@/lib/utils";

interface AdminExecutiveRevenueSnapshotProps {
  specialists: AdminSpecialistRow[];
}

export function AdminExecutiveRevenueSnapshot({
  specialists,
}: AdminExecutiveRevenueSnapshotProps) {
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
          <span className="admin-exec-snapshot__demo">Demo data</span>
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
      </div>
    </section>
  );
}
