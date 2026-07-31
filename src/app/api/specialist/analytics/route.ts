import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const ANALYTICS_WINDOW_DAYS = 30;

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
};

function surfaceLabel(raw: string | null | undefined): string {
  const key = (raw ?? "").trim() || "unknown";
  return SURFACE_LABELS[key] ?? key;
}

async function countEngagement(
  service: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  specialistId: string,
  eventType: string,
  sinceIso: string
): Promise<number> {
  const { count, error } = await service
    .from("specialist_engagement_events")
    .select("*", { count: "exact", head: true })
    .eq("specialist_id", specialistId)
    .eq("event_type", eventType)
    .gte("occurred_at", sinceIso);

  if (error) {
    console.warn(
      `[SMOAC analytics] ${eventType} count failed:`,
      error.message
    );
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
  };

  const profileId = profile?.id as string | undefined;
  if (!profileId) {
    return NextResponse.json({ ok: true, counts: empty });
  }

  const sinceIso = new Date(
    Date.now() - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const profilePath = `/trainers/${profileId}`;

  const [
    visitsRes,
    savesRes,
    searchAppearances,
    contactClicks,
    bookingClicks,
    engagementRows,
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

  return NextResponse.json({
    ok: true,
    counts: {
      profileViews: visitsRes.count ?? 0,
      savedByClients: savesRes.count ?? 0,
      searchAppearances,
      contactClicks,
      bookingClicks,
      breakdown: {
        topSurfaces,
        mobileViews,
        desktopViews,
        mobilePercent:
          deviceTotal > 0
            ? Math.round((mobileViews / deviceTotal) * 100)
            : null,
      },
    },
  });
}
