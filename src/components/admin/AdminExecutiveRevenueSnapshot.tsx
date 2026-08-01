"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdminDonutChart } from "@/components/admin/charts/AdminDonutChart";
import { formatBillingCents } from "@/lib/admin-specialist-billing-service";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";
import type {
  AdminPlatformPulse,
  AdminTrafficWeek,
  AdminWeeklyCount,
} from "@/types/admin-platform-pulse";
import { cn } from "@/lib/utils";

interface AdminExecutiveRevenueSnapshotProps {
  /** Bump pulse refresh when specialists change in-session */
  refreshKey?: string | number;
}

const SOURCE_COLORS = [
  "rgb(var(--aurora-lavender-rgb))",
  "rgb(var(--aurora-violet-rgb))",
  "rgb(167, 139, 250)",
  "rgb(196, 181, 253)",
  "rgb(221, 214, 254)",
  "rgb(139, 92, 246)",
  "rgb(124, 58, 237)",
  "rgb(109, 40, 217)",
] as const;

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

function earningsSourceLabel(
  source: NonNullable<AdminPlatformPulse["earnings"]>["source"]
): string {
  if (source === "stripe") return "Stripe live MRR";
  if (source === "billing_table") return "From specialist_billing (Stripe sync)";
  return "No paid Stripe subscriptions yet";
}

function TrafficDeepPanel({
  open,
  onClose,
  traffic,
}: {
  open: boolean;
  onClose: () => void;
  traffic: AdminTrafficWeek;
}) {
  useBlockingModalOpen(open);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const chartSegments = useMemo(
    () =>
      traffic.topSources.slice(0, 5).map((row, index) => ({
        id: row.source,
        label: row.source,
        value: row.views,
        color: SOURCE_COLORS[index] ?? SOURCE_COLORS[0],
      })),
    [traffic.topSources]
  );

  const deviceTotal =
    traffic.devices.mobile +
      traffic.devices.desktop +
      traffic.devices.unknown || 1;

  if (!open || typeof document === "undefined") return null;

  const sheet = (
    <div
      className="admin-traffic-popover"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="admin-traffic-popover__backdrop"
        aria-label="Close traffic panel"
        onClick={onClose}
      />
      <div className="admin-traffic-popover__panel admin-traffic-popover__panel--deep">
        <header className="admin-traffic-popover__header">
          <div>
            <p className="admin-traffic-popover__eyebrow">Last 7 days</p>
            <h3 id={titleId} className="admin-traffic-popover__title">
              Traffic deep dive
            </h3>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="admin-btn smoac-control"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="admin-traffic-deep__stats">
          <div className="admin-traffic-deep__stat">
            <span className="admin-traffic-deep__stat-label">Views</span>
            <span className="admin-traffic-deep__stat-value">
              {traffic.views.toLocaleString()}
            </span>
            <span className="admin-traffic-deep__stat-detail">
              {trafficChangeLabel(traffic.viewsPercentChange)}
            </span>
          </div>
          <div className="admin-traffic-deep__stat">
            <span className="admin-traffic-deep__stat-label">Unique</span>
            <span className="admin-traffic-deep__stat-value">
              {traffic.uniqueVisitors.toLocaleString()}
            </span>
            <span className="admin-traffic-deep__stat-detail">
              {trafficChangeLabel(traffic.uniqueVisitorsPercentChange)}
            </span>
          </div>
          <div className="admin-traffic-deep__stat">
            <span className="admin-traffic-deep__stat-label">New visitors</span>
            <span className="admin-traffic-deep__stat-value">
              {traffic.newVisitors.toLocaleString()}
            </span>
            <span className="admin-traffic-deep__stat-detail">First visit</span>
          </div>
        </div>

        {chartSegments.length === 0 ? (
          <p className="admin-empty">
            No attributed sources yet. Direct visits and links without UTMs
            show as Direct once traffic starts flowing.
          </p>
        ) : (
          <AdminDonutChart
            title="Top sources"
            segments={chartSegments}
            centerLabel="Views"
          />
        )}

        {traffic.topSources.length > 0 ? (
          <div className="admin-traffic-deep__section">
            <h4 className="admin-traffic-deep__section-title">All sources</h4>
            <ul className="admin-traffic-deep__bars">
              {traffic.topSources.map((row) => (
                <li key={row.source} className="admin-traffic-deep__bar-row">
                  <div className="admin-traffic-deep__bar-meta">
                    <span className="admin-traffic-deep__bar-label">
                      {row.source}
                    </span>
                    <span className="admin-traffic-deep__bar-value">
                      {row.views.toLocaleString()} · {row.sharePercent}%
                    </span>
                  </div>
                  <div
                    className="admin-traffic-deep__bar-track"
                    aria-hidden
                  >
                    <span
                      className="admin-traffic-deep__bar-fill"
                      style={{ width: `${Math.min(100, row.sharePercent)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="admin-traffic-deep__section">
          <h4 className="admin-traffic-deep__section-title">Devices</h4>
          <ul className="admin-traffic-deep__devices">
            {(
              [
                ["Mobile", traffic.devices.mobile],
                ["Desktop", traffic.devices.desktop],
                ["Unknown", traffic.devices.unknown],
              ] as const
            )
              .filter(([, count]) => count > 0)
              .map(([label, count]) => (
                <li key={label} className="admin-traffic-deep__device">
                  <span>{label}</span>
                  <strong>
                    {count.toLocaleString()} ·{" "}
                    {Math.round((count / deviceTotal) * 100)}%
                  </strong>
                </li>
              ))}
            {traffic.devices.mobile +
              traffic.devices.desktop +
              traffic.devices.unknown ===
            0 ? (
              <li className="admin-empty">No device data yet.</li>
            ) : null}
          </ul>
        </div>

        {traffic.topPaths.length > 0 ? (
          <div className="admin-traffic-deep__section">
            <h4 className="admin-traffic-deep__section-title">Top pages</h4>
            <ul className="admin-traffic-deep__paths">
              {traffic.topPaths.map((row) => (
                <li key={row.path} className="admin-traffic-deep__path">
                  <code className="admin-traffic-deep__path-code">
                    {row.path}
                  </code>
                  <span>{row.views.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="admin-traffic-popover__note">
          Sources come from UTM tags and external referrers (Google, Instagram,
          ChatGPT, etc.). In-app browsers often hide referrers — use UTMs on
          share links for cleaner attribution.
        </p>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}

/**
 * Top-of-admin core pulse — live Supabase counts + Stripe settlement dollars.
 */
export function AdminExecutiveRevenueSnapshot({
  refreshKey,
}: AdminExecutiveRevenueSnapshotProps) {
  const [pulse, setPulse] = useState<AdminPlatformPulse | null>(null);
  const [specialistBump, setSpecialistBump] = useState(false);
  const [trafficOpen, setTrafficOpen] = useState(false);
  const previousSpecialistTotal = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/platform-pulse", { credentials: "include" })
      .then((res) => res.json())
      .then((body: { ok?: boolean; pulse?: AdminPlatformPulse }) => {
        if (cancelled || !body?.ok || !body.pulse) return;
        const result = body.pulse;
        setPulse(result);
        if (result.dataSource === "live") {
          const prev = previousSpecialistTotal.current;
          if (prev != null && result.specialists.total > prev) {
            setSpecialistBump(true);
            window.setTimeout(() => setSpecialistBump(false), 1400);
          }
          previousSpecialistTotal.current = result.specialists.total;
        }
      })
      .catch(() => {
        if (!cancelled) setPulse(null);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const live = pulse?.dataSource === "live" ? pulse : null;
  const traffic = live?.traffic ?? null;
  const earnings = live?.earnings ?? null;
  const engagement = live?.engagement ?? null;
  const canOpenTraffic = Boolean(traffic);

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
          <span className="admin-exec-snapshot__unavailable">Unavailable</span>
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

        {canOpenTraffic ? (
          <button
            type="button"
            className="admin-exec-snapshot__card admin-exec-snapshot__card--button"
            onClick={() => setTrafficOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={trafficOpen}
          >
            <p className="admin-exec-snapshot__label">Site views (7d)</p>
            <p className="admin-exec-snapshot__value">{traffic!.views}</p>
            <p className="admin-exec-snapshot__detail">
              {trafficChangeLabel(traffic!.viewsPercentChange)}
              {traffic!.uniqueVisitors > 0
                ? ` · ${traffic!.uniqueVisitors} unique`
                : ""}
            </p>
            <p className="admin-exec-snapshot__hint">Tap for deep dive</p>
          </button>
        ) : (
          <article className="admin-exec-snapshot__card">
            <p className="admin-exec-snapshot__label">Site views (7d)</p>
            <p className="admin-exec-snapshot__value">—</p>
            <p className="admin-exec-snapshot__detail">Awaiting traffic capture</p>
          </article>
        )}

        <article className="admin-exec-snapshot__card admin-exec-snapshot__card--earn">
          <p className="admin-exec-snapshot__label">Stripe MRR</p>
          <p className="admin-exec-snapshot__value">
            {earnings
              ? formatBillingCents(earnings.subscriberRevenueCents, {
                  decimals: 0,
                })
              : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {earnings
              ? `${earnings.paidSubscriberCount} paying · ${earningsSourceLabel(earnings.source)}`
              : "Stripe settlement"}
          </p>
        </article>

        <article className="admin-exec-snapshot__card admin-exec-snapshot__card--earn">
          <p className="admin-exec-snapshot__label">Ad spend (billing)</p>
          <p className="admin-exec-snapshot__value">
            {earnings
              ? formatBillingCents(earnings.adRevenueCents, { decimals: 0 })
              : "—"}
          </p>
          <p className="admin-exec-snapshot__detail">
            {earnings?.source === "stripe"
              ? "Included in Stripe MRR above · Owner Revenue for detail"
              : earnings
                ? `Boost add-ons · ${earnings.periodLabel}`
                : "From Stripe-synced billing"}
          </p>
        </article>
      </div>

      <div className="admin-exec-snapshot__engagement">
        <h3 className="admin-exec-snapshot__engagement-title">
          Marketplace engagement (7d)
        </h3>
        <p className="admin-exec-snapshot__engagement-note">
          Site-wide anonymous totals — not individual specialists.
        </p>
        <div className="admin-exec-snapshot__grid admin-exec-snapshot__grid--core4">
          <article className="admin-exec-snapshot__card">
            <p className="admin-exec-snapshot__label">Search appearances</p>
            <p className="admin-exec-snapshot__value">
              {engagement ? engagement.searchAppearances : "—"}
            </p>
            <p className="admin-exec-snapshot__detail">
              {engagement
                ? trafficChangeLabel(engagement.searchAppearancesPercentChange)
                : "Awaiting engagement capture"}
            </p>
          </article>
          <article className="admin-exec-snapshot__card">
            <p className="admin-exec-snapshot__label">Contact clicks</p>
            <p className="admin-exec-snapshot__value">
              {engagement ? engagement.contactClicks : "—"}
            </p>
            <p className="admin-exec-snapshot__detail">Inquiry CTA taps</p>
          </article>
          <article className="admin-exec-snapshot__card">
            <p className="admin-exec-snapshot__label">Booking clicks</p>
            <p className="admin-exec-snapshot__value">
              {engagement ? engagement.bookingClicks : "—"}
            </p>
            <p className="admin-exec-snapshot__detail">Book intent in inquiry</p>
          </article>
          <article className="admin-exec-snapshot__card">
            <p className="admin-exec-snapshot__label">Top surfaces</p>
            <p className="admin-exec-snapshot__value admin-exec-snapshot__value--surfaces">
              {engagement && engagement.topSurfaces.length > 0
                ? engagement.topSurfaces
                    .map((row) => `${row.surface} (${row.count})`)
                    .join(" · ")
                : "—"}
            </p>
            <p className="admin-exec-snapshot__detail">
              Where cards appear most
            </p>
          </article>
        </div>
      </div>

      {traffic ? (
        <TrafficDeepPanel
          open={trafficOpen}
          onClose={() => setTrafficOpen(false)}
          traffic={traffic}
        />
      ) : null}
    </section>
  );
}
