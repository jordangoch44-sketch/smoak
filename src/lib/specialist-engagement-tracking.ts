/**
 * Anonymous specialist engagement capture for specialist dashboard analytics.
 * No PII: visitor key + specialist id + event type only.
 */
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { getOrCreateVisitorKey } from "@/lib/site-visit-tracking";

export type SpecialistEngagementEventType =
  | "search_appearance"
  | "contact_click"
  | "booking_click";

export type SpecialistEngagementSurface =
  | "explore"
  | "saved"
  | "home_sponsored"
  | "home_new"
  | "home_top50"
  | "profile_rail"
  | "profile"
  | "rankings"
  | "client_dashboard";

const SESSION_SEEN = new Set<string>();

function clamp(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function sessionKey(
  event: SpecialistEngagementEventType,
  specialistId: string,
  surface?: string | null
): string {
  return `${event}:${specialistId}:${surface ?? ""}`;
}

/** Fire-and-forget engagement insert — never blocks UI. */
export function recordSpecialistEngagement(input: {
  event: SpecialistEngagementEventType;
  specialistId: string;
  surface?: SpecialistEngagementSurface | string;
  inquiryAction?: string;
  /** When true, only once per browser session for this event+specialist+surface. */
  oncePerSession?: boolean;
}): void {
  if (typeof window === "undefined") return;
  if (!isMarketplaceSupabaseActive()) return;

  const specialistId = clamp(input.specialistId, 120);
  if (!specialistId) return;

  if (input.oncePerSession !== false) {
    const key = sessionKey(input.event, specialistId, input.surface);
    if (SESSION_SEEN.has(key)) return;
    SESSION_SEEN.add(key);
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;

  const { key: visitorKey } = getOrCreateVisitorKey();

  void supabase
    .from("specialist_engagement_events")
    .insert({
      specialist_id: specialistId,
      event_type: input.event,
      surface: clamp(input.surface ?? null, 60),
      path: clamp(window.location.pathname, 300),
      visitor_key: visitorKey,
      device: window.innerWidth < 768 ? "mobile" : "desktop",
      inquiry_action: clamp(input.inquiryAction ?? null, 60),
    })
    .then(({ error }) => {
      if (error) {
        console.warn("[SMOAC engagement] insert failed:", error.message);
      }
    });
}
