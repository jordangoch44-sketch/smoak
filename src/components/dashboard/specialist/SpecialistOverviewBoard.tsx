"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GoogleReviewsCard } from "@/components/dashboard/specialist/cards/GoogleReviewsCard";
import { ReviewsCard } from "@/components/dashboard/specialist/cards/ReviewsCard";
import { VisibilityRankingCard } from "@/components/dashboard/specialist/cards/VisibilityRankingCard";
import { OverviewPerformanceChart } from "@/components/dashboard/specialist/OverviewPerformanceChart";
import {
  EyeIcon,
  HeartIcon,
  MessageBubbleIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { SPECIALIST_DASHBOARD_EDIT_HREF } from "@/lib/auth-routes";
import { formatAnalyticsMetricValue } from "@/lib/specialist-dashboard-stats";
import type { AnalyticsDayPoint, AnalyticsPeriodChange } from "@/lib/specialist-analytics-series";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";
import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";
import type { SpecialistDashboardRanking } from "@/types/specialist-dashboard";
import type { ProfileWelcomeTask } from "@/lib/specialist-profile-welcome";

interface SpecialistOverviewBoardProps {
  analytics: SpecialistProfileAnalytics;
  isPremium: boolean;
  ranking: SpecialistDashboardRanking | null;
  city?: string;
  trainer: Trainer | undefined;
  smoacRating?: number | null;
  smoacReviewCount?: number;
  sampleReputation?: boolean;
  categoryLabel?: string;
  /** Real profile gaps. Sample dashboards pass none and skip the live chart. */
  welcomeTasks?: ProfileWelcomeTask[];
  live?: boolean;
  /** Real plan, separate from the free-tier preview that renders numbers underneath the lock. */
  canSuggestIntroVideo?: boolean;
  onOpenBoost?: () => void;
  onUpgrade?: () => void;
}

type RangeDays = 7 | 30 | 90;
type ChartMetricId = "searchAppearances" | "profileViews" | "contactClicks";
type TrafficId = "search" | "direct" | "other";

interface ChartPayload {
  days: number;
  capped: boolean;
  series: Record<ChartMetricId, AnalyticsDayPoint[]>;
  metrics: Record<ChartMetricId | "savedByClients", AnalyticsPeriodChange>;
  traffic: { total: number; slices: Array<{ id: TrafficId; count: number }> };
  funnel: {
    searchAppearances: number;
    profileViews: number;
    contactClicks: number;
    viewsPerHundredAppearances: number | null;
    contactsPerHundredViews: number | null;
  };
}

const METRICS: Array<{ id: ChartMetricId; label: string }> = [
  { id: "searchAppearances", label: "Search appearances" },
  { id: "profileViews", label: "Profile views" },
  { id: "contactClicks", label: "Contact clicks" },
];

const RANGES: RangeDays[] = [7, 30, 90];

const TRAFFIC_LABEL: Record<TrafficId, string> = {
  search: "Search",
  direct: "Direct / in SMOAC",
  other: "Other",
};

const TRAFFIC_COLOR: Record<TrafficId, string> = {
  search: "#ff7a6a",
  direct: "#67e8f9",
  other: "#a78bfa",
};

const NEXT_STEP: Record<string, { message: string; action: string; focus: string }> = {
  avatar: {
    message: "Add a profile photo so clients recognize you in search.",
    action: "Add photo",
    focus: "avatar",
  },
  hero: {
    message: "Add photos that show how you train.",
    action: "Add photos",
    focus: "hero",
  },
  specialties: {
    message: "Add your specialties so the right clients can find you.",
    action: "Add specialties",
    focus: "specialties",
  },
  credentials: {
    message: "Add certifications so clients can see your qualifications.",
    action: "Add credentials",
    focus: "credentials",
  },
  pricing: {
    message: "Add pricing so clients know what a session costs.",
    action: "Add pricing",
    focus: "pricing",
  },
  bio: {
    message: "Expand your bio so clients understand how you work.",
    action: "Edit bio",
    focus: "bio",
  },
  "service-area": {
    message: "Add your city or service area.",
    action: "Add location",
    focus: "service-area",
  },
  "ideal-clients": {
    message: "Describe who you work best with.",
    action: "Edit profile",
    focus: "ideal-clients",
  },
  philosophy: {
    message: "Add your coaching style.",
    action: "Add style",
    focus: "philosophy",
  },
  "session-experience": {
    message: "Add the training options you offer.",
    action: "Add options",
    focus: "session-experience",
  },
  headline: {
    message: "Add a headline that says what you do.",
    action: "Add headline",
    focus: "headline",
  },
  "intro-video": {
    message: "Upload a short introduction video.",
    action: "Add video",
    focus: "intro-video",
  },
};

export function OverviewPeriodChip({ label }: { label: string }) {
  return <p className="overview-period">{label}</p>;
}

function trendText(change: AnalyticsPeriodChange | undefined): {
  label: string;
  direction: "up" | "down" | "flat";
} {
  if (!change) return { label: "—", direction: "flat" };
  if (change.percentChange == null) {
    return {
      label: change.total > 0 ? "New" : "0%",
      direction: change.direction,
    };
  }
  const sign = change.direction === "down" ? "−" : change.direction === "up" ? "+" : "";
  return { label: `${sign}${change.percentChange}%`, direction: change.direction };
}

export function SpecialistOverviewBoard({
  analytics,
  isPremium,
  ranking,
  city,
  trainer,
  smoacRating = null,
  smoacReviewCount = 0,
  sampleReputation = false,
  categoryLabel,
  welcomeTasks = [],
  live = false,
  canSuggestIntroVideo = false,
  onOpenBoost,
  onUpgrade,
}: SpecialistOverviewBoardProps) {
  const router = useRouter();
  const [days, setDays] = useState<RangeDays>(30);
  const [metric, setMetric] = useState<ChartMetricId>("profileViews");
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    live ? "loading" : "idle"
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    setStatus("loading");
    void fetch(`/api/specialist/analytics/series?days=${days}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("analytics");
        const body = (await response.json()) as { ok?: boolean; chart?: ChartPayload };
        if (!body.ok || !body.chart) throw new Error("analytics");
        if (!cancelled) {
          setChart(body.chart);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [days, live, reloadKey]);

  const cityLabel = city?.trim() || "";
  const rankValue = ranking ? `#${ranking.rank}` : "—";
  const rankDetail = ranking
    ? cityLabel
      ? `in ${cityLabel}`
      : ranking.listingTitle
    : "Not on a city board yet";
  const metricMeta = METRICS.find((item) => item.id === metric) ?? METRICS[1];
  const series = chart?.series[metric] ?? [];
  const selectedChange = chart?.metrics[metric];
  const selectedTrend = trendText(selectedChange);
  const nextTask = welcomeTasks[0];
  const introMissing = live && canSuggestIntroVideo && !trainer?.introVideo?.src;
  const sampleTotals: Record<ChartMetricId | "savedByClients", number> = {
    searchAppearances: analytics.searchAppearances,
    profileViews: analytics.profileViews,
    contactClicks: analytics.contactClicks,
    savedByClients: analytics.savedByClients,
  };
  const suggestion = nextTask
    ? NEXT_STEP[nextTask.id] ?? {
        message: `Finish ${nextTask.label.toLowerCase()} on your profile.`,
        action: "Edit profile",
        focus: nextTask.id,
      }
    : introMissing
      ? NEXT_STEP["intro-video"]
      : null;

  function openFocus(focus: string) {
    router.push(`${SPECIALIST_DASHBOARD_EDIT_HREF}&focus=${focus}`);
  }

  return (
    <div className="specialist-overview-board">
      <section className="overview-chart" aria-label="Performance">
        <div className="overview-chart__metrics" role="tablist" aria-label="Metric">
          {METRICS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={metric === item.id}
              className={cn(
                "overview-chart__metric",
                metric === item.id && "overview-chart__metric--on"
              )}
              onClick={() => setMetric(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="overview-chart__head">
          <div>
            <p className="overview-chart__total">
              {live && status === "ready" && selectedChange
                ? formatAnalyticsMetricValue(selectedChange.total)
                : live
                  ? "—"
                  : formatAnalyticsMetricValue(sampleTotals[metric])}
            </p>
            <p className={cn("overview-chart__delta", `overview-chart__delta--${selectedTrend.direction}`)}>
              {live && status === "ready" ? (
                <>
                  <span>{selectedTrend.label}</span>
                  <span>vs the previous {days} days</span>
                </>
              ) : live && status === "error" ? (
                "Couldn’t load this period."
              ) : live ? (
                "Loading performance…"
              ) : (
                "Example total. Daily history is only shown from tracked events."
              )}
            </p>
          </div>
          <div className="overview-chart__ranges" role="group" aria-label="Time range">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                className={cn(
                  "overview-chart__range",
                  days === range && "overview-chart__range--on"
                )}
                aria-pressed={days === range}
                onClick={() => setDays(range)}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>
        {live && status === "ready" ? (
          <OverviewPerformanceChart points={series} metricLabel={metricMeta.label} />
        ) : (
          <div className="overview-chart__empty">
            {live && status === "error" ? (
              <button type="button" className="overview-chart__retry" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </button>
            ) : (
              <p>
                {live
                  ? "Loading the daily chart…"
                  : "A daily line appears once this profile is collecting its own events."}
              </p>
            )}
          </div>
        )}
        {chart?.capped ? (
          <p className="overview-chart__note">
            The daily line includes the latest events we could chart. The totals above are complete.
          </p>
        ) : null}
      </section>

      <section className="overview-boost" aria-label="Boost your performance">
        <p className="overview-boost__label">Boost your performance</p>
        {suggestion ? (
          <div className="overview-boost__row">
            <p>{suggestion.message}</p>
            <button type="button" className="overview-boost__action" onClick={() => openFocus(suggestion.focus)}>
              {suggestion.action}
            </button>
          </div>
        ) : (
          <p className="overview-boost__done">
            {live && selectedChange && selectedChange.direction === "down" && selectedChange.percentChange
              ? `${metricMeta.label} are down ${selectedChange.percentChange}% from the previous ${days} days.`
              : live && selectedChange && selectedChange.direction === "up" && selectedChange.percentChange
                ? `${metricMeta.label} are up ${selectedChange.percentChange}% from the previous ${days} days.`
                : "Your profile sections are filled in. Use the chart to see whether discovery is moving."}
          </p>
        )}
      </section>

      <div className="overview-split">
        <TrafficDonut traffic={chart?.traffic ?? null} live={live} ready={status === "ready"} />
        <ul className="overview-metrics">
          <MetricCard
            label="Profile views"
            icon={<EyeIcon className="h-3.5 w-3.5" />}
            change={chart?.metrics.profileViews}
            sample={sampleTotals.profileViews}
            live={live}
            ready={status === "ready"}
          />
          <MetricCard
            label="Search appearances"
            icon={<SearchIcon className="h-3.5 w-3.5" />}
            change={chart?.metrics.searchAppearances}
            sample={sampleTotals.searchAppearances}
            live={live}
            ready={status === "ready"}
          />
          <MetricCard
            label="Saved by clients"
            icon={<HeartIcon className="h-3.5 w-3.5" />}
            change={chart?.metrics.savedByClients}
            sample={sampleTotals.savedByClients}
            live={live}
            ready={status === "ready"}
          />
          <MetricCard
            label="Contact clicks"
            icon={<MessageBubbleIcon className="h-3.5 w-3.5" />}
            change={chart?.metrics.contactClicks}
            sample={sampleTotals.contactClicks}
            live={live}
            ready={status === "ready"}
          />
        </ul>
      </div>

      <Funnel funnel={chart?.funnel ?? null} live={live} ready={status === "ready"} />

      <article className="overview-rank" aria-label={`City ranking ${rankValue}`}>
        <p className="overview-rank__label">City ranking</p>
        <div className="overview-rank__row">
          <p className="overview-rank__value">{rankValue}</p>
          <p className="overview-rank__detail">{rankDetail}</p>
          {ranking?.rank === 1 ? <span className="overview-rank__badge">Top in city</span> : null}
        </div>
      </article>

      <div className="dashboard-overview-accordions">
        <ReviewsCard
          trainer={trainer}
          isPremium={isPremium}
          smoacRating={smoacRating}
          smoacReviewCount={smoacReviewCount}
          sampleReputation={sampleReputation}
        />
        <VisibilityRankingCard
          ranking={ranking}
          isPremium={isPremium}
          smoacRating={smoacRating}
          smoacReviewCount={smoacReviewCount}
          categoryLabel={categoryLabel}
          onOpenBoost={onOpenBoost}
        />
        <GoogleReviewsCard
          trainer={trainer}
          isPremium={isPremium}
          onUpgrade={onUpgrade}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  icon,
  change,
  sample,
  live,
  ready,
}: {
  label: string;
  icon: ReactNode;
  change: AnalyticsPeriodChange | undefined;
  sample: number;
  live: boolean;
  ready: boolean;
}) {
  const trend = trendText(change);
  return (
    <li>
      <article className="overview-metric" aria-label={label}>
        <span className="overview-metric__icon" aria-hidden>
          {icon}
        </span>
        <p className="overview-metric__label">{label}</p>
        <p className="overview-metric__value">
          {live && ready && change
            ? formatAnalyticsMetricValue(change.total)
            : live
              ? "—"
              : formatAnalyticsMetricValue(sample)}
        </p>
        <p className={cn("overview-metric__trend", `overview-metric__trend--${live ? trend.direction : "flat"}`)}>
          {live && ready ? trend.label : live ? "" : "Example"}
        </p>
      </article>
    </li>
  );
}

function TrafficDonut({
  traffic,
  live,
  ready,
}: {
  traffic: ChartPayload["traffic"] | null;
  live: boolean;
  ready: boolean;
}) {
  const slices = traffic?.slices ?? [];
  const total = traffic?.total ?? 0;
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <section className="overview-traffic" aria-label="Traffic sources">
      <h2>Traffic sources</h2>
      <p className="overview-traffic__measure">Profile views</p>
      <div className="overview-traffic__donut">
        <svg viewBox="0 0 88 88" aria-hidden>
          <circle className="overview-traffic__track" cx="44" cy="44" r={radius} />
          {total > 0
            ? slices.map((slice) => {
                const length = (slice.count / total) * circ;
                const dash = `${length} ${circ - length}`;
                const node = (
                  <circle
                    key={slice.id}
                    cx="44"
                    cy="44"
                    r={radius}
                    fill="none"
                    stroke={TRAFFIC_COLOR[slice.id]}
                    strokeWidth="9"
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                    transform="rotate(-90 44 44)"
                  />
                );
                offset += length;
                return node;
              })
            : null}
        </svg>
        <p className="overview-traffic__total">
          <strong>{live && ready ? total.toLocaleString() : "—"}</strong>
          <span>views</span>
        </p>
      </div>
      <ul className="overview-traffic__legend">
        {(["search", "direct", "other"] as const).map((id) => {
          const count = slices.find((slice) => slice.id === id)?.count ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={id}>
              <i style={{ background: TRAFFIC_COLOR[id] }} />
              <span>{TRAFFIC_LABEL[id]}</span>
              <b>{live && ready && total > 0 ? `${pct}%` : "—"}</b>
            </li>
          );
        })}
      </ul>
      <p className="overview-traffic__note">
        Direct includes opens with no external referrer, including most visits from inside SMOAC. In-app search and marketplace are not stored separately on a profile view.
      </p>
    </section>
  );
}

function Funnel({
  funnel,
  live,
  ready,
}: {
  funnel: ChartPayload["funnel"] | null;
  live: boolean;
  ready: boolean;
}) {
  const steps = [
    {
      label: "Search appearances",
      value: funnel?.searchAppearances ?? 0,
      note: "Times your card was shown",
    },
    {
      label: "Profile views",
      value: funnel?.profileViews ?? 0,
      note:
        funnel?.viewsPerHundredAppearances == null
          ? "Separate from appearances"
          : funnel.viewsPerHundredAppearances > 100
            ? `${funnel.viewsPerHundredAppearances} views per 100 appearances. These are separate counts, not one visitor path.`
            : `${funnel.viewsPerHundredAppearances} views per 100 appearances`,
    },
    {
      label: "Contact clicks",
      value: funnel?.contactClicks ?? 0,
      note:
        funnel?.contactsPerHundredViews == null
          ? "Taps, not confirmed clients"
          : `${funnel.contactsPerHundredViews} taps per 100 views`,
    },
  ];
  const max = Math.max(1, ...steps.map((step) => step.value));
  return (
    <section className="overview-funnel" aria-label="Discovery funnel">
      <h2>Discovery</h2>
      <p className="overview-funnel__note">
        Event counts for this period, not unique people. A contact click is not a booking.
      </p>
      <ol>
        {steps.map((step) => (
          <li key={step.label}>
            <div className="overview-funnel__top">
              <span>{step.label}</span>
              <strong>{live && ready ? step.value.toLocaleString() : "—"}</strong>
            </div>
            <div className="overview-funnel__track" aria-hidden>
              <span style={{ width: live && ready ? `${(step.value / max) * 100}%` : "0%" }} />
            </div>
            <p>{step.note}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
