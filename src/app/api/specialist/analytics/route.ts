import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const ANALYTICS_WINDOW_DAYS = 30;

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
  };

  const profileId = profile?.id as string | undefined;
  if (!profileId) {
    return NextResponse.json({ ok: true, counts: empty });
  }

  const sinceIso = new Date(
    Date.now() - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const profilePath = `/trainers/${profileId}`;

  const [visitsRes, savesRes, searchAppearances, contactClicks, bookingClicks] =
    await Promise.all([
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

  return NextResponse.json({
    ok: true,
    counts: {
      profileViews: visitsRes.count ?? 0,
      savedByClients: savesRes.count ?? 0,
      searchAppearances,
      contactClicks,
      bookingClicks,
    },
  });
}
