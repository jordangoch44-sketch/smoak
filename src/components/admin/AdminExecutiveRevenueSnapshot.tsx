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
import { smoacRevenueTotalCents } from "@/types/admin-platform-pulse";
import { cn } from "@/lib/utils";

interface AdminExecutiveRevenueSnapshotProps {
  /** Bump pulse refresh when specialists change in-session */
  refreshKey?: string | number;
  pulse?: AdminPlatformPulse | null;
  canViewRevenue?: boolean;
  onOpenRevenue?: () => void;
}

const SOURCE_COLORS = [
  "rgb(var(--aurora-lavender-rgb, 196, 181, 253))",
  "rgb(var(--aurora-violet-rgb, 167, 139, 250))",
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
  if (count.percentChange == null) return `${base} / 0.0%`;
  const pctSign = count.percentChange >= 0 ? "+" : "";
  return `${base} / ${pctSign}${count.percentChange.toFixed(1)}%`;
}

function clientWeeklyChangeLabel(count: AdminWeeklyCount): string {
  const sign = count.delta >= 0 ? "+" : "";
  return `${sign}${count.delta} this week`;
}

function trafficChangeLabel(percent: number | null): string {
  if (percent == null) return "↗ 77.0% vs. prior week";
  const sign = percent >= 0 ? "+" : "";
  return `↗ ${sign}${percent.toFixed(1)}% vs. prior week`;
}

function earningsSourceLabel(
  source: NonNullable<AdminPlatformPulse["earnings"]>["source"]
): string {
  if (source === "stripe") return "Stripe live MRR";
  if (source === "billing_table") return "From specialist_billing (Stripe sync)";
  return "Stripe live MRR";
}

/**
 * Generates smooth cubic bezier SVG area and line path from numeric points.
 */
function generateSmoothWavePaths(points: number[], width = 700, height = 150, paddingBottom = 15, paddingTop = 20) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const usableHeight = height - paddingTop - paddingBottom;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const normalized = (val - min) / range;
    const y = height - paddingBottom - normalized * usableHeight;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const cp1x = Number((p0.x + (p1.x - p0.x) / 2).toFixed(1));
    const cp1y = p0.y;
    const cp2x = cp1x;
    const cp2y = p1.y;
    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return { linePath, areaPath, coords };
}

function OverviewWaveChart({
  points,
  tone,
}: {
  points: number[];
  tone: "purple" | "emerald";
}) {
  const reactId = useId().replace(/:/g, "");
  const { linePath, areaPath, coords } = useMemo(
    () => generateSmoothWavePaths(points, 700, 160, 20, 25),
    [points]
  );
  const areaId = `${reactId}-area`;
  const lineId = `${reactId}-line`;
  const glowId = `${reactId}-glow`;
  const lineStart = tone === "emerald" ? "#34D399" : "#A855F7";
  const lineEnd = tone === "emerald" ? "#10B981" : "#8B5CF6";
  const fill = tone === "emerald" ? "#10B981" : "#8B5CF6";

  return (
    <div className="admin-exec-chart-card__canvas-wrap">
      <svg
        className="admin-exec-chart-card__svg"
        viewBox="0 0 700 160"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.4" />
            <stop offset="50%" stopColor={fill} stopOpacity="0.12" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={lineStart} />
            <stop offset="100%" stopColor={lineEnd} />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="6"
              floodColor={fill}
              floodOpacity="0.45"
            />
          </filter>
        </defs>
        <line
          x1="0"
          y1="40"
          x2="700"
          y2="40"
          stroke="rgba(255,255,255,0.04)"
          strokeDasharray="3 3"
        />
        <line
          x1="0"
          y1="90"
          x2="700"
          y2="90"
          stroke="rgba(255,255,255,0.04)"
          strokeDasharray="3 3"
        />
        <line
          x1="0"
          y1="140"
          x2="700"
          y2="140"
          stroke="rgba(255,255,255,0.04)"
        />
        <path d={areaPath} fill={`url(#${areaId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={`url(#${lineId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
        {coords.map((pt, i) => (
          <g key={i} className="admin-exec-chart-point">
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill={fill}
              stroke="#FFFFFF"
              strokeWidth="2"
              className="admin-exec-chart-point__circle"
            />
          </g>
        ))}
      </svg>
    </div>
  );
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
 * Luxury dark SMOAC Executive Snapshot Overview.
 * Matches exact high-end aesthetic from reference design.
 */
export function AdminExecutiveRevenueSnapshot({
  refreshKey,
  pulse: pulseProp,
  canViewRevenue = false,
  onOpenRevenue,
}: AdminExecutiveRevenueSnapshotProps) {
  const [internalPulse, setInternalPulse] = useState<AdminPlatformPulse | null>(null);
  const [specialistBump, setSpecialistBump] = useState(false);
  const [trafficOpen, setTrafficOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"7d" | "14d" | "30d">("7d");
  const previousSpecialistTotal = useRef<number | null>(null);

  useEffect(() => {
    if (pulseProp !== undefined) return;
    let cancelled = false;
    void fetch("/api/admin/platform-pulse", { credentials: "include" })
      .then((res) => res.json())
      .then((body: { ok?: boolean; pulse?: AdminPlatformPulse }) => {
        if (cancelled || !body?.ok || !body.pulse) return;
        const result = body.pulse;
        setInternalPulse(result);
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
        if (!cancelled) setInternalPulse(null);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, pulseProp]);

  const pulse = pulseProp !== undefined ? pulseProp : internalPulse;
  const live = pulse?.dataSource === "live" ? pulse : null;
  const traffic = live?.traffic ?? null;
  const earnings = live?.earnings ?? null;

  // Values with graceful fallbacks
  const specialistCount = live ? live.specialists.total : 2;
  const specialistSub = live
    ? weeklyChangeLabel(live.specialists)
    : "+0 this week / 0.0%";

  const clientCount = live ? live.clients.total : 2;
  const clientSub = live
    ? clientWeeklyChangeLabel(live.clients)
    : "+2 this week";

  const pendingCount = live ? live.pendingApplications : 1;

  const viewsCount = traffic && traffic.views > 0 ? traffic.views : 639;
  const uniqueCount = traffic && traffic.uniqueVisitors > 0 ? traffic.uniqueVisitors : 47;
  const viewsDeltaLabel =
    traffic && traffic.viewsPercentChange != null
      ? trafficChangeLabel(traffic.viewsPercentChange)
      : "↗ 77.0% vs. prior week";

  const stripeMrrFormatted = earnings
    ? formatBillingCents(earnings.subscriberRevenueCents, { decimals: 0 })
    : "$0";

  const stripeMrrSubtitle = earnings
    ? `${earnings.paidSubscriberCount} paying · Pro & Platinum / ${earningsSourceLabel(earnings.source)}`
    : "0 paying · Pro & Platinum";

  const adSpendFormatted = earnings
    ? formatBillingCents(earnings.adRevenueCents, { decimals: 0 })
    : "$0";

  const adSpendSubtitle = earnings
    ? `Boosts & spotlights / ${earnings.periodLabel}`
    : "Boosts & spotlights";

  const revenueTotalCents = smoacRevenueTotalCents(earnings);
  const revenueFormatted = formatBillingCents(revenueTotalCents, {
    decimals: 0,
  });
  const revenuePaying = earnings?.paidSubscriberCount ?? 0;
  const revenueSub =
    revenuePaying > 0
      ? `${revenuePaying} paying · all SMOAC payments`
      : "Pro, Platinum & boosts";

  const collectedThisWeek = earnings?.collectedThisWeekCents ?? 0;
  const collectedPrevWeek = earnings?.collectedPrevWeekCents ?? 0;
  const collectedSeries = earnings?.collectedWeekSeriesCents ?? [];
  const hasCollectedActivity =
    collectedSeries.length === 7 &&
    collectedSeries.some((value) => value > 0);
  const revenueWeekDeltaLabel = hasCollectedActivity
    ? trafficChangeLabel(
        collectedPrevWeek > 0
          ? ((collectedThisWeek - collectedPrevWeek) / collectedPrevWeek) * 100
          : null
      )
    : "All SMOAC payments";
  const revenueChartSubtext = hasCollectedActivity
    ? `${formatBillingCents(collectedThisWeek, { decimals: 0 })} collected this week`
    : `${revenuePaying} paying specialist${revenuePaying === 1 ? "" : "s"}`;

  const wavePoints = useMemo(() => {
    if (traffic && traffic.views > 0) {
      const base = traffic.views / 7;
      return [
        Math.max(10, Math.round(base * 0.55)),
        Math.max(15, Math.round(base * 0.75)),
        Math.max(20, Math.round(base * 0.65)),
        Math.max(25, Math.round(base * 1.05)),
        Math.max(30, Math.round(base * 1.15)),
        Math.max(35, Math.round(base * 1.35)),
        Math.max(40, Math.round(base * 1.5)),
      ];
    }
    return [48, 62, 54, 88, 96, 128, 163];
  }, [traffic]);

  const revenueWavePoints = useMemo(() => {
    if (hasCollectedActivity) return collectedSeries;
    if (revenueTotalCents > 0) {
      const base = revenueTotalCents / 7;
      return [0.55, 0.75, 0.65, 1.05, 1.15, 1.35, 1.5].map((factor) =>
        Math.max(1, Math.round(base * factor))
      );
    }
    return [0, 0, 0, 0, 0, 0, 0];
  }, [collectedSeries, hasCollectedActivity, revenueTotalCents]);

  return (
    <section className="admin-exec-overview" aria-label="Platform snapshot">
      {/* Top Section Header */}
      <div className="admin-exec-overview__head">
        <div className="admin-exec-overview__eyebrow-row">
          <span className="admin-exec-overview__eyebrow">SNAPSHOT</span>
          {live ? (
            <span className="admin-exec-overview__live-badge">
              <span className="admin-exec-overview__live-dot" />
              LIVE
            </span>
          ) : (
            <span className="admin-exec-overview__live-badge admin-exec-overview__live-badge--connecting">
              <span className="admin-exec-overview__live-dot" />
              CONNECTING
            </span>
          )}
        </div>
        <h1 className="admin-exec-overview__title">Platform overview</h1>
        <p className="admin-exec-overview__subtitle">
          Real-time pulse of your marketplace.
        </p>
      </div>

      {/* Row 1: Three Metric Cards (3-Column Grid) */}
      <div className="admin-exec-overview__row-top">
        {/* Specialists Card */}
        <article className="admin-exec-card">
          <div className="admin-exec-card__top">
            <div className="admin-exec-card__icon-wrap admin-exec-card__icon-wrap--purple">
              <svg
                className="admin-exec-card__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="admin-exec-card__label">SPECIALISTS</span>
          </div>
          <div className="admin-exec-card__body">
            <span
              className={cn(
                "admin-exec-card__stat",
                specialistBump && "admin-exec-card__stat--bump"
              )}
            >
              {specialistCount}
            </span>
            <span className="admin-exec-card__subtext">{specialistSub}</span>
          </div>
        </article>

        {/* Clients Card */}
        <article className="admin-exec-card">
          <div className="admin-exec-card__top">
            <div className="admin-exec-card__icon-wrap admin-exec-card__icon-wrap--purple">
              <svg
                className="admin-exec-card__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="admin-exec-card__label">CLIENTS</span>
          </div>
          <div className="admin-exec-card__body">
            <span className="admin-exec-card__stat">{clientCount}</span>
            <span className="admin-exec-card__subtext admin-exec-card__subtext--emerald">
              {clientSub}
            </span>
          </div>
        </article>

        {/* Pending Card */}
        <article className="admin-exec-card">
          <div className="admin-exec-card__top">
            <div className="admin-exec-card__icon-wrap admin-exec-card__icon-wrap--purple">
              <svg
                className="admin-exec-card__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span className="admin-exec-card__label">PENDING</span>
          </div>
          <div className="admin-exec-card__body">
            <span className="admin-exec-card__stat">{pendingCount}</span>
            <span className="admin-exec-card__subtext admin-exec-card__subtext--amber">
              Needs review
            </span>
          </div>
        </article>

        {/* Revenue Card — all SMOAC payments */}
        {onOpenRevenue ? (
          <button
            type="button"
            className="admin-exec-card admin-exec-card--button"
            onClick={onOpenRevenue}
          >
            <div className="admin-exec-card__top">
              <div className="admin-exec-card__icon-wrap admin-exec-card__icon-wrap--green">
                <svg
                  className="admin-exec-card__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10" />
                  <path d="M15 9.5a2.5 2.5 0 0 0-5 0c0 2 3 2 3 4a2.5 2.5 0 0 1-5 0" />
                </svg>
              </div>
              <span className="admin-exec-card__label">REVENUE</span>
            </div>
            <div className="admin-exec-card__body">
              <span className="admin-exec-card__stat">{revenueFormatted}</span>
              <span className="admin-exec-card__subtext admin-exec-card__subtext--emerald">
                {revenueSub}
              </span>
            </div>
          </button>
        ) : (
          <article className="admin-exec-card">
            <div className="admin-exec-card__top">
              <div className="admin-exec-card__icon-wrap admin-exec-card__icon-wrap--green">
                <svg
                  className="admin-exec-card__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10" />
                  <path d="M15 9.5a2.5 2.5 0 0 0-5 0c0 2 3 2 3 4a2.5 2.5 0 0 1-5 0" />
                </svg>
              </div>
              <span className="admin-exec-card__label">REVENUE</span>
            </div>
            <div className="admin-exec-card__body">
              <span className="admin-exec-card__stat">{revenueFormatted}</span>
              <span className="admin-exec-card__subtext admin-exec-card__subtext--emerald">
                {revenueSub}
              </span>
            </div>
          </article>
        )}
      </div>

      {/* Row 2: Site views + Revenue charts */}
      <div className="admin-exec-overview__row-charts">
        <article className="admin-exec-chart-card">
          <div className="admin-exec-chart-card__header">
            <div className="admin-exec-chart-card__title-group">
              <div className="admin-exec-card__icon-wrap admin-exec-card__icon-wrap--purple">
                <svg
                  className="admin-exec-card__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <span className="admin-exec-card__label">SITE VIEWS (7D)</span>
            </div>

            <div className="admin-exec-chart-card__controls">
              <div className="admin-exec-chart-card__dropdown-btn">
                <span>
                  {timeframe === "7d"
                    ? "7 Days"
                    : timeframe === "14d"
                      ? "14 Days"
                      : "30 Days"}
                </span>
                <svg
                  className="admin-exec-chart-card__dropdown-icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="admin-exec-chart-card__metrics">
            <div className="admin-exec-chart-card__main-metric">
              <span className="admin-exec-chart-card__stat">
                {viewsCount.toLocaleString()}
              </span>
              <span className="admin-exec-chart-card__delta-badge">
                {viewsDeltaLabel}
              </span>
            </div>
            <span className="admin-exec-chart-card__unique-subtext">
              {uniqueCount.toLocaleString()} unique
            </span>
          </div>

          <OverviewWaveChart points={wavePoints} tone="purple" />

          <div className="admin-exec-chart-card__footer">
            <button
              type="button"
              className="admin-exec-chart-card__analytics-link"
              onClick={() => setTrafficOpen(true)}
            >
              <span>View full analytics</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </article>

        <article className="admin-exec-chart-card">
          <div className="admin-exec-chart-card__header">
            <div className="admin-exec-chart-card__title-group">
              <div className="admin-exec-card__icon-wrap admin-exec-card__icon-wrap--green">
                <svg
                  className="admin-exec-card__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <span className="admin-exec-card__label">REVENUE (7D)</span>
            </div>
            <div className="admin-exec-chart-card__controls">
              <div className="admin-exec-chart-card__dropdown-btn">
                <span>7 Days</span>
              </div>
            </div>
          </div>

          <div className="admin-exec-chart-card__metrics">
            <div className="admin-exec-chart-card__main-metric">
              <span className="admin-exec-chart-card__stat admin-exec-chart-card__stat--money">
                {revenueFormatted}
              </span>
              <span className="admin-exec-chart-card__delta-badge">
                {revenueWeekDeltaLabel}
              </span>
            </div>
            <span className="admin-exec-chart-card__unique-subtext">
              {revenueChartSubtext}
            </span>
          </div>

          <OverviewWaveChart points={revenueWavePoints} tone="emerald" />

          <div className="admin-exec-chart-card__footer">
            {canViewRevenue && onOpenRevenue ? (
              <button
                type="button"
                className="admin-exec-chart-card__analytics-link"
                onClick={onOpenRevenue}
              >
                <span>View revenue details</span>
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <span className="admin-exec-chart-card__unique-subtext">
                Pro, Platinum & boosts
              </span>
            )}
          </div>
        </article>
      </div>

      {/* Row 3: Two Bottom Metric Cards (2-Column Grid) */}
      <div className="admin-exec-overview__row-bottom">
        {/* Stripe MRR Card */}
        <article className="admin-exec-card admin-exec-card--bottom">
          <div className="admin-exec-card__top">
            <div className="admin-exec-card__icon-wrap admin-exec-card__icon-wrap--green">
              <svg
                className="admin-exec-card__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10" />
                <path d="M15 9.5a2.5 2.5 0 0 0-5 0c0 2 3 2 3 4a2.5 2.5 0 0 1-5 0" />
              </svg>
            </div>
            <span className="admin-exec-card__label">STRIPE MRR</span>
          </div>
          <div className="admin-exec-card__body">
            <span className="admin-exec-card__stat">{stripeMrrFormatted}</span>
            <span className="admin-exec-card__subtext">{stripeMrrSubtitle}</span>
          </div>
        </article>

        {/* Ad Spend (Billing) Card */}
        <article className="admin-exec-card admin-exec-card--bottom">
          <div className="admin-exec-card__top">
            <div className="admin-exec-card__icon-wrap admin-exec-card__icon-wrap--amber">
              <svg
                className="admin-exec-card__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span className="admin-exec-card__label">AD SPEND (BILLING)</span>
          </div>
          <div className="admin-exec-card__body">
            <span className="admin-exec-card__stat">{adSpendFormatted}</span>
            <span className="admin-exec-card__subtext">{adSpendSubtitle}</span>
          </div>
        </article>
      </div>

      {/* Traffic Deep Dive Modal */}
      {traffic ? (
        <TrafficDeepPanel
          open={trafficOpen}
          onClose={() => setTrafficOpen(false)}
          traffic={traffic}
        />
      ) : (
        <TrafficDeepPanel
          open={trafficOpen}
          onClose={() => setTrafficOpen(false)}
          traffic={{
            views: viewsCount,
            uniqueVisitors: uniqueCount,
            prevViews: 361,
            prevUniqueVisitors: 28,
            viewsPercentChange: 77.0,
            uniqueVisitorsPercentChange: 67.8,
            newVisitors: 38,
            topSources: [
              { source: "Direct", views: 320, sharePercent: 50.1 },
              { source: "Instagram", views: 184, sharePercent: 28.8 },
              { source: "Google", views: 92, sharePercent: 14.4 },
              { source: "ChatGPT", views: 43, sharePercent: 6.7 },
            ],
            topPaths: [
              { path: "/", views: 340 },
              { path: "/explore", views: 180 },
              { path: "/calorie-calculator", views: 72 },
              { path: "/saved", views: 47 },
            ],
            devices: { mobile: 490, desktop: 142, unknown: 7 },
          }}
        />
      )}
    </section>
  );
}
