/** Calendar bucketing for specialist analytics. Days are Pacific dates, not a fitted curve. */

export const ANALYTICS_TIME_ZONE = "America/Los_Angeles";

export type AnalyticsRangeDays = 7 | 30 | 90;

export type TrafficSliceId = "search" | "direct" | "other";

export interface AnalyticsDayPoint {
  date: string;
  value: number;
}

export interface AnalyticsPeriodChange {
  total: number;
  previous: number;
  direction: "up" | "down" | "flat";
  /** Null when the prior period was zero, so we do not invent a percent. */
  percentChange: number | null;
}

const SEARCH_HOST =
  /(?:^|\.)(?:google|bing|duckduckgo|yahoo|brave|ecosia|baidu|yandex)\./i;

export function parseAnalyticsRangeDays(raw: string | null): AnalyticsRangeDays {
  if (raw === "7" || raw === "30" || raw === "90") return Number(raw) as AnalyticsRangeDays;
  return 30;
}

export function calendarDayKey(
  date: Date,
  timeZone = ANALYTICS_TIME_ZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftDayKey(key: string, deltaDays: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + deltaDays);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inclusive Pacific calendar days ending today, oldest first. */
export function listDayKeys(
  end: Date,
  days: number,
  timeZone = ANALYTICS_TIME_ZONE
): string[] {
  const endKey = calendarDayKey(end, timeZone);
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.push(shiftDayKey(endKey, -offset));
  }
  return keys;
}

function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - instant.getTime();
}

/** Start of a Pacific calendar day as an absolute instant. */
export function zonedDayStart(
  key: string,
  timeZone = ANALYTICS_TIME_ZONE
): Date {
  const [year, month, day] = key.split("-").map(Number);
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = timeZoneOffsetMs(utcMidnight, timeZone);
  return new Date(utcMidnight.getTime() - offset);
}

export function countByDay(
  timestamps: readonly string[],
  keys: readonly string[],
  timeZone = ANALYTICS_TIME_ZONE
): AnalyticsDayPoint[] {
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const stamp of timestamps) {
    const key = calendarDayKey(new Date(stamp), timeZone);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, value: counts.get(date) ?? 0 }));
}

export function periodChange(current: number, previous: number): AnalyticsPeriodChange {
  if (previous <= 0) {
    return {
      total: current,
      previous,
      direction: current > 0 ? "up" : "flat",
      percentChange: null,
    };
  }
  if (current === previous) {
    return { total: current, previous, direction: "flat", percentChange: 0 };
  }
  const raw = Math.round(((current - previous) / previous) * 100);
  return {
    total: current,
    previous,
    direction: raw > 0 ? "up" : "down",
    percentChange: Math.abs(raw),
  };
}

export function classifyProfileVisit(row: {
  referrer_host?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
}): TrafficSliceId {
  const host = (row.referrer_host ?? "").trim();
  const source = (row.utm_source ?? "").trim().toLowerCase();
  const medium = (row.utm_medium ?? "").trim().toLowerCase();
  if (
    SEARCH_HOST.test(host) ||
    medium === "organic" ||
    source === "google" ||
    source === "bing"
  ) {
    return "search";
  }
  if (!host && !source && !medium) return "direct";
  return "other";
}

/** Views per 100 of the previous step. Null when the denominator is zero. */
export function perHundred(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}
