import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  classifyProfileVisit,
  countByDay,
  listDayKeys,
  parseAnalyticsRangeDays,
  periodChange,
  perHundred,
  shiftDayKey,
  zonedDayStart,
  type TrafficSliceId,
} from "@/lib/specialist-analytics-series";

const PAGE = 1000;
const CAP = 8000;

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

async function loadStamps(
  service: ServiceClient,
  table: "site_visits" | "specialist_engagement_events",
  filters: {
    path?: string;
    specialistId?: string;
    eventType?: string;
    sinceIso: string;
    untilIso: string;
  }
): Promise<{ stamps: string[]; capped: boolean }> {
  const stamps: string[] = [];
  for (let from = 0; from < CAP; from += PAGE) {
    let query = service
      .from(table)
      .select("occurred_at")
      .gte("occurred_at", filters.sinceIso)
      .lt("occurred_at", filters.untilIso)
      .order("occurred_at", { ascending: true })
      .range(from, from + PAGE - 1);

    if (filters.path) query = query.eq("path", filters.path);
    if (filters.specialistId) query = query.eq("specialist_id", filters.specialistId);
    if (filters.eventType) query = query.eq("event_type", filters.eventType);

    const { data, error } = await query;
    if (error) {
      console.warn(`[SMOAC analytics] ${table} series failed:`, error.message);
      return { stamps, capped: false };
    }
    const batch = data ?? [];
    for (const row of batch) {
      if (typeof row.occurred_at === "string") stamps.push(row.occurred_at);
    }
    if (batch.length < PAGE) return { stamps, capped: false };
  }
  return { stamps, capped: true };
}

async function countRows(
  service: ServiceClient,
  table: "site_visits" | "specialist_engagement_events" | "saved_trainers",
  column: "occurred_at" | "created_at",
  filters: {
    path?: string;
    specialistId?: string;
    eventType?: string;
    sinceIso: string;
    untilIso: string;
  }
): Promise<number> {
  let query = service
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(column, filters.sinceIso)
    .lt(column, filters.untilIso);

  if (filters.path) query = query.eq("path", filters.path);
  if (table === "saved_trainers" && filters.specialistId) {
    query = query.eq("specialist_id", filters.specialistId);
  }
  if (table === "specialist_engagement_events" && filters.specialistId) {
    query = query.eq("specialist_id", filters.specialistId);
  }
  if (filters.eventType) query = query.eq("event_type", filters.eventType);

  const { count, error } = await query;
  if (error) {
    console.warn(`[SMOAC analytics] ${table} count failed:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Auth unavailable." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
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
    return NextResponse.json({ ok: false, message: "Analytics unavailable." }, { status: 503 });
  }

  const days = parseAnalyticsRangeDays(new URL(request.url).searchParams.get("days"));
  const now = new Date();
  const keys = listDayKeys(now, days);
  const previousStartKey = shiftDayKey(keys[0] ?? "", -days);
  const since = zonedDayStart(previousStartKey);
  const currentStart = zonedDayStart(keys[0] ?? previousStartKey);
  const until = zonedDayStart(shiftDayKey(keys[keys.length - 1] ?? previousStartKey, 1));
  const sinceIso = since.toISOString();
  const currentIso = currentStart.toISOString();
  const untilIso = until.toISOString();

  const { data: profile, error: profileError } = await service
    .from("specialist_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, message: profileError.message }, { status: 502 });
  }

  const emptySeries = keys.map((date) => ({ date, value: 0 }));
  const emptyChange = periodChange(0, 0);
  if (!profile?.id) {
    return NextResponse.json({
      ok: true,
      chart: emptyChart(days, emptySeries, emptyChange),
    });
  }

  const profileId = profile.id as string;
  const profilePath = `/trainers/${profileId}`;
  const currentWindow = { sinceIso: currentIso, untilIso };

  const [
    viewStamps,
    searchStamps,
    contactStamps,
    viewsNow,
    viewsPrev,
    searchNow,
    searchPrev,
    contactNow,
    contactPrev,
    savesNow,
    savesPrev,
    visitSources,
  ] = await Promise.all([
    loadStamps(service, "site_visits", { path: profilePath, ...currentWindow }),
    loadStamps(service, "specialist_engagement_events", {
      specialistId: profileId,
      eventType: "search_appearance",
      ...currentWindow,
    }),
    loadStamps(service, "specialist_engagement_events", {
      specialistId: profileId,
      eventType: "contact_click",
      ...currentWindow,
    }),
    countRows(service, "site_visits", "occurred_at", { path: profilePath, ...currentWindow }),
    countRows(service, "site_visits", "occurred_at", {
      path: profilePath,
      sinceIso,
      untilIso: currentIso,
    }),
    countRows(service, "specialist_engagement_events", "occurred_at", {
      specialistId: profileId,
      eventType: "search_appearance",
      ...currentWindow,
    }),
    countRows(service, "specialist_engagement_events", "occurred_at", {
      specialistId: profileId,
      eventType: "search_appearance",
      sinceIso,
      untilIso: currentIso,
    }),
    countRows(service, "specialist_engagement_events", "occurred_at", {
      specialistId: profileId,
      eventType: "contact_click",
      ...currentWindow,
    }),
    countRows(service, "specialist_engagement_events", "occurred_at", {
      specialistId: profileId,
      eventType: "contact_click",
      sinceIso,
      untilIso: currentIso,
    }),
    countRows(service, "saved_trainers", "created_at", {
      specialistId: profileId,
      ...currentWindow,
    }),
    countRows(service, "saved_trainers", "created_at", {
      specialistId: profileId,
      sinceIso,
      untilIso: currentIso,
    }),
    loadVisitSources(service, profilePath, currentIso, untilIso),
  ]);

  const capped =
    viewStamps.capped || searchStamps.capped || contactStamps.capped;

  return NextResponse.json({
    ok: true,
    chart: {
      days,
      capped,
      series: {
        searchAppearances: countByDay(searchStamps.stamps, keys),
        profileViews: countByDay(viewStamps.stamps, keys),
        contactClicks: countByDay(contactStamps.stamps, keys),
      },
      metrics: {
        searchAppearances: periodChange(searchNow, searchPrev),
        profileViews: periodChange(viewsNow, viewsPrev),
        contactClicks: periodChange(contactNow, contactPrev),
        savedByClients: periodChange(savesNow, savesPrev),
      },
      traffic: visitSources,
      funnel: {
        searchAppearances: searchNow,
        profileViews: viewsNow,
        contactClicks: contactNow,
        viewsPerHundredAppearances: perHundred(viewsNow, searchNow),
        contactsPerHundredViews: perHundred(contactNow, viewsNow),
      },
    },
  });
}

function emptyChart(
  days: number,
  series: Array<{ date: string; value: number }>,
  change: ReturnType<typeof periodChange>
) {
  return {
    days,
    capped: false,
    series: {
      searchAppearances: series,
      profileViews: series,
      contactClicks: series,
    },
    metrics: {
      searchAppearances: change,
      profileViews: change,
      contactClicks: change,
      savedByClients: change,
    },
    traffic: {
      total: 0,
      slices: [] as Array<{ id: TrafficSliceId; count: number }>,
    },
    funnel: {
      searchAppearances: 0,
      profileViews: 0,
      contactClicks: 0,
      viewsPerHundredAppearances: null,
      contactsPerHundredViews: null,
    },
  };
}

async function loadVisitSources(
  service: ServiceClient,
  profilePath: string,
  sinceIso: string,
  untilIso: string
) {
  const counts: Record<TrafficSliceId, number> = { search: 0, direct: 0, other: 0 };
  for (let from = 0; from < CAP; from += PAGE) {
    const { data, error } = await service
      .from("site_visits")
      .select("referrer_host, utm_source, utm_medium")
      .eq("path", profilePath)
      .gte("occurred_at", sinceIso)
      .lt("occurred_at", untilIso)
      .order("occurred_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.warn("[SMOAC analytics] traffic sources failed:", error.message);
      break;
    }
    const batch = data ?? [];
    for (const row of batch) {
      const id = classifyProfileVisit(row);
      counts[id] += 1;
    }
    if (batch.length < PAGE) break;
  }
  const total = counts.search + counts.direct + counts.other;
  const slices = (["search", "direct", "other"] as const)
    .map((id) => ({ id, count: counts[id] }))
    .filter((slice) => slice.count > 0);
  return { total, slices };
}
