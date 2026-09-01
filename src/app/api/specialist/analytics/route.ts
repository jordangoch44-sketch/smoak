import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildWeekOverWeekTrend } from "@/lib/specialist-live-analytics";

const ANALYTICS_WINDOW_DAYS = 30;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const SURFACE_LABELS: Record<string, string> = {
  explore: "Explore",
  saved: "Saved list",
  home_sponsored: "Homepage sponsored",
  home_featured: "Homepage spotlight",
  home_new: "Homepage new",
  home_top50: "Homepage Top 50",
  home_ranking_boost: "Homepage ranking boost",
  profile_rail: "Profile discovery",
  profile: "Your profile",
  rankings: "Rankings",
  rankings_boost: "Rankings boost",
  client_dashboard: "Client dashboard",
  tools_calories: "Calorie tool",
};

function surfaceLabel(raw: string | null | undefined): string {
  const key = (raw ?? "").trim() || "unknown";
  return SURFACE_LABELS[key] ?? key;
}

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

async function countEngagement(
  service: ServiceClient,
  specialistId: string,
  eventType: string,
  sinceIso: string,
  untilIso?: string
): Promise<number> {
  let query = service
    .from("specialist_engagement_events")
    .select("*", { count: "exact", head: true })
    .eq("specialist_id", specialistId)
    .eq("event_type", eventType)
    .gte("occurred_at", sinceIso);

  if (untilIso) {
    query = query.lt("occurred_at", untilIso);
  }

  const { count, error } = await query;

  if (error) {
    console.warn(
      `[SMOAC analytics] ${eventType} count failed:`,
      error.message
    );
    return 0;
  }
  return count ?? 0;
}

async function countProfileVisits(
  service: ServiceClient,
  profilePath: string,
  sinceIso: string,
  untilIso?: string
): Promise<number> {
  let query = service
    .from("site_visits")
    .select("*", { count: "exact", head: true })
    .eq("path", profilePath)
    .gte("occurred_at", sinceIso);

  if (untilIso) {
    query = query.lt("occurred_at", untilIso);
  }

  const { count, error } = await query;
  if (error) {
    console.warn("[SMOAC analytics] site_visits count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countSavesInRange(
  service: ServiceClient,
  profileId: string,
  sinceIso: string,
  untilIso?: string
): Promise<number> {
  let query = service
    .from("saved_trainers")
    .select("*", { count: "exact", head: true })
    .eq("specialist_id", profileId)
    .gte("created_at", sinceIso);

  if (untilIso) {
    query = query.lt("created_at", untilIso);
  }

  const { count, error } = await query;
  if (error) {
    console.warn("[SMOAC analytics] saved_trainers count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countInquiriesInRange(
  service: ServiceClient,
  profileId: string,
  sinceIso: string,
  untilIso?: string
): Promise<number> {
  let query = service
    .from("inquiry_conversations")
    .select("*", { count: "exact", head: true })
    .eq("specialist_id", profileId)
    .gte("created_at", sinceIso);

  if (untilIso) {
    query = query.lt("created_at", untilIso);
  }

  const { count, error } = await query;
  if (error) {
    console.warn("[SMOAC analytics] inquiry_conversations count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Auth unavailable." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in required." },
      { status: 401 }
    );
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleRow?.role !== "specialist") {
    return NextResponse.json(
      { ok: false, message: "Specialist access required." },
      { status: 403 }
    );
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Analytics unavailable." },
      { status: 503 }
    );
  }

  const { data: profile, error: profileError } = await service
    .from("specialist_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { ok: false, message: profileError.message },
      { status: 502 }
    );
  }

  const empty = {
    profileViews: 0,
    savedByClients: 0,
    searchAppearances: 0,
    contactClicks: 0,
    bookingClicks: 0,
    breakdown: {
      topSurfaces: [] as Array<{ surface: string; count: number }>,
      mobileViews: 0,
      desktopViews: 0,
      mobilePercent: null as number | null,
    },
    weeklyTrends: {
      profileViews: buildWeekOverWeekTrend(0, 0),
      searchAppearances: buildWeekOverWeekTrend(0, 0),
      savedByClients: buildWeekOverWeekTrend(0, 0),
      contactClicks: buildWeekOverWeekTrend(0, 0),
      bookingClicks: buildWeekOverWeekTrend(0, 0),
    },
  };

  const profileId = profile?.id as string | undefined;
  if (!profileId) {
    return NextResponse.json({ ok: true, counts: empty });
  }

  const now = Date.now();
  const sinceIso = new Date(
    now - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const thisWeekSince = new Date(now - WEEK_MS).toISOString();
  const prevWeekSince = new Date(now - 2 * WEEK_MS).toISOString();
  const profilePath = `/trainers/${profileId}`;

  const [
    visitsRes,
    savesRes,
    searchAppearances,
    contactClicks,
    bookingClicks,
    engagementRows,
    viewsThisWeek,
    viewsPrevWeek,
    searchThisWeek,
    searchPrevWeek,
    contactThisWeek,
    contactPrevWeek,
    bookingThisWeek,
    bookingPrevWeek,
    savesThisWeek,
    savesPrevWeek,
    inquiriesInRange,
  ] = await Promise.all([
    service
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .eq("path", profilePath)
      .gte("occurred_at", sinceIso),
    service
      .from("saved_trainers")
      .select("*", { count: "exact", head: true })
      .eq("specialist_id", profileId),
    countEngagement(service, profileId, "search_appearance", sinceIso),
    countEngagement(service, profileId, "contact_click", sinceIso),
    countEngagement(service, profileId, "booking_click", sinceIso),
    service
      .from("specialist_engagement_events")
      .select("event_type, surface, device")
      .eq("specialist_id", profileId)
      .gte("occurred_at", sinceIso)
      .limit(5000),
    countProfileVisits(service, profilePath, thisWeekSince),
    countProfileVisits(service, profilePath, prevWeekSince, thisWeekSince),
    countEngagement(service, profileId, "search_appearance", thisWeekSince),
    countEngagement(
      service,
      profileId,
      "search_appearance",
      prevWeekSince,
      thisWeekSince
    ),
    countEngagement(service, profileId, "contact_click", thisWeekSince),
    countEngagement(
      service,
      profileId,
      "contact_click",
      prevWeekSince,
      thisWeekSince
    ),
    countEngagement(service, profileId, "booking_click", thisWeekSince),
    countEngagement(
      service,
      profileId,
      "booking_click",
      prevWeekSince,
      thisWeekSince
    ),
    countSavesInRange(service, profileId, thisWeekSince),
    countSavesInRange(service, profileId, prevWeekSince, thisWeekSince),
    countInquiriesInRange(service, profileId, sinceIso),
  ]);

  if (visitsRes.error) {
    console.warn(
      "[SMOAC analytics] site_visits count failed:",
      visitsRes.error.message
    );
  }
  if (savesRes.error) {
    console.warn(
      "[SMOAC analytics] saved_trainers count failed:",
      savesRes.error.message
    );
  }
  if (engagementRows.error) {
    console.warn(
      "[SMOAC analytics] engagement breakdown failed:",
      engagementRows.error.message
    );
  }

  const surfaceCounts = new Map<string, number>();
  let mobileViews = 0;
  let desktopViews = 0;

  for (const row of engagementRows.data ?? []) {
    if (row.event_type === "search_appearance") {
      const label = surfaceLabel(row.surface as string | null);
      surfaceCounts.set(label, (surfaceCounts.get(label) ?? 0) + 1);
    }
    if (row.device === "mobile") mobileViews += 1;
    else if (row.device === "desktop") desktopViews += 1;
  }

  const deviceTotal = mobileViews + desktopViews;
  const topSurfaces = [...surfaceCounts.entries()]
    .map(([surface, count]) => ({ surface, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const pViews = visitsRes.count ?? 0;
  const pSaves = savesRes.count ?? 0;
  const inqStarts = contactClicks + bookingClicks;
  const inqSubs = inquiriesInRange ?? 0;
  const viewToInquiryRate =
    pViews > 0 ? Number(((inqSubs / pViews) * 100).toFixed(1)) : 0;

  return NextResponse.json({
    ok: true,
    counts: {
      profileViews: pViews,
      savedByClients: pSaves,
      searchAppearances,
      contactClicks,
      bookingClicks,
      funnel: {
        searchAppearances,
        profileViews: pViews,
        highIntentActions: pSaves + inqStarts,
        inquiryStarts: inqStarts,
        inquiriesSubmitted: inqSubs,
        viewToInquiryRate,
      },
      breakdown: {
        topSurfaces,
        mobileViews,
        desktopViews,
        mobilePercent:
          deviceTotal > 0
            ? Math.round((mobileViews / deviceTotal) * 100)
            : null,
      },
      weeklyTrends: {
        profileViews: buildWeekOverWeekTrend(viewsThisWeek, viewsPrevWeek),
        searchAppearances: buildWeekOverWeekTrend(
          searchThisWeek,
          searchPrevWeek
        ),
        savedByClients: buildWeekOverWeekTrend(savesThisWeek, savesPrevWeek),
        contactClicks: buildWeekOverWeekTrend(contactThisWeek, contactPrevWeek),
        bookingClicks: buildWeekOverWeekTrend(bookingThisWeek, bookingPrevWeek),
      },
    },
  });
}
