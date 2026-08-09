/**
 * Anonymous site-visit capture for admin traffic analytics.
 * No PII: a random per-device key, path, and traffic source only.
 * Browser posts to first-party `/api/analytics/site-visit` (Safari-friendly).
 */
import { postAnalyticsBeacon } from "@/lib/analytics-beacon";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";

const VISITOR_KEY_STORAGE = "smoac_visitor_key";
const SESSION_SOURCE_FLAG = "smoac_visit_source_recorded";

/** Skip repeat inserts for the same path in quick succession (soft-nav churn). */
const DUPLICATE_WINDOW_MS = 30_000;

let lastTrackedPath: string | null = null;
let lastTrackedAt = 0;

/** crypto.randomUUID is unavailable in non-secure contexts (e.g. LAN HTTP on iPhone). */
function randomVisitorKey(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getOrCreateVisitorKey(): { key: string; isNew: boolean } {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY_STORAGE);
    if (existing && existing.length >= 8) {
      return { key: existing, isNew: false };
    }
    const key = randomVisitorKey();
    window.localStorage.setItem(VISITOR_KEY_STORAGE, key);
    return { key, isNew: true };
  } catch {
    /* storage blocked — still count the view under a throwaway key */
    return { key: randomVisitorKey(), isNew: true };
  }
}

/** External referrer host — own-site referrers are internal navigation, not a source. */
function externalReferrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).host;
    if (!host || host === window.location.host) return null;
    return host.slice(0, 200);
  } catch {
    return null;
  }
}

function clamp(value: string | null, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Source attribution belongs to the session landing hit only. */
function readSessionSource(): {
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
} {
  const empty = {
    referrerHost: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
  };
  try {
    if (window.sessionStorage.getItem(SESSION_SOURCE_FLAG)) return empty;
    window.sessionStorage.setItem(SESSION_SOURCE_FLAG, "1");
  } catch {
    /* if sessionStorage is blocked, attribute this hit anyway */
  }

  const params = new URLSearchParams(window.location.search);
  return {
    referrerHost: externalReferrerHost(),
    utmSource: clamp(params.get("utm_source"), 100),
    utmMedium: clamp(params.get("utm_medium"), 100),
    utmCampaign: clamp(params.get("utm_campaign"), 150),
  };
}

/** Fire-and-forget page view insert — never blocks or breaks navigation. */
export function recordSiteVisit(path: string): void {
  if (typeof window === "undefined") return;
  if (!isMarketplaceSupabaseActive()) return;

  const now = Date.now();
  if (path === lastTrackedPath && now - lastTrackedAt < DUPLICATE_WINDOW_MS) {
    return;
  }
  lastTrackedPath = path;
  lastTrackedAt = now;

  const { key, isNew } = getOrCreateVisitorKey();
  const source = readSessionSource();

  postAnalyticsBeacon("/api/analytics/site-visit", {
    path: path.slice(0, 300),
    referrer_host: source.referrerHost,
    utm_source: source.utmSource,
    utm_medium: source.utmMedium,
    utm_campaign: source.utmCampaign,
    visitor_key: key,
    is_new_visitor: isNew,
    device: window.innerWidth < 768 ? "mobile" : "desktop",
  });
}
