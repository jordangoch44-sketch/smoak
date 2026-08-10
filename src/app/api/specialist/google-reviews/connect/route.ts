import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { fetchGooglePlaceSnapshot } from "@/lib/google-places";
import { applyGooglePlaceSnapshotToSocial } from "@/lib/google-reviews-display";
import { resolveAndSyncSpecialistPremiumAccess } from "@/lib/specialist-premium-trial";
import { specialistProfileFromRow } from "@/lib/profiles/specialist-profiles-db";
import type { SpecialistProfileRow } from "@/types/database";
import type { Trainer } from "@/types/trainer";

/**
 * Pro+ only: connect Google Reviews via Place ID / Maps URL.
 * Writes cached rating + count into specialist_profiles.profile_data.social.
 */

interface ConnectBody {
  placeIdOrUrl?: string;
}

export async function POST(request: Request) {
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

  const access = await resolveAndSyncSpecialistPremiumAccess(supabase, user.id);
  if (!access.isPremium) {
    return NextResponse.json(
      {
        ok: false,
        message: "Google Reviews connect is available on SMOAC Pro and higher.",
        code: "pro_required",
      },
      { status: 403 }
    );
  }

  let body: ConnectBody;
  try {
    body = (await request.json()) as ConnectBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const placeIdOrUrl = body.placeIdOrUrl?.trim() ?? "";
  if (!placeIdOrUrl) {
    return NextResponse.json(
      { ok: false, message: "Paste a Google Place ID or Maps link." },
      { status: 400 }
    );
  }

  const places = await fetchGooglePlaceSnapshot(placeIdOrUrl);
  if (!places.ok) {
    return NextResponse.json(
      { ok: false, message: places.message },
      { status: 422 }
    );
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Could not save Google connection." },
      { status: 503 }
    );
  }

  const { data: row, error: readError } = await service
    .from("specialist_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json(
      { ok: false, message: readError.message },
      { status: 502 }
    );
  }
  if (!row) {
    return NextResponse.json(
      {
        ok: false,
        message: "No live specialist profile found yet. Finish approval first.",
      },
      { status: 404 }
    );
  }

  const parsed = specialistProfileFromRow(row as SpecialistProfileRow);
  const trainer: Trainer = {
    ...parsed.trainer,
    social: applyGooglePlaceSnapshotToSocial(
      parsed.trainer.social,
      places.snapshot
    ),
  };

  const profileData = {
    ...((row.profile_data as Record<string, unknown> | null) ?? {}),
    ...trainer,
    id: trainer.id,
    social: trainer.social,
  };

  const { error: writeError } = await service
    .from("specialist_profiles")
    .update({
      profile_data: profileData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trainer.id)
    .eq("user_id", user.id);

  if (writeError) {
    return NextResponse.json(
      { ok: false, message: writeError.message },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    snapshot: places.snapshot,
    message: "Google Reviews connected.",
  });
}
