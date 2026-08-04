import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { grantSpecialistPremiumTrialIfNeeded } from "@/lib/specialist-premium-trial";

/**
 * Claim the one-time complimentary SMOAC Pro trial (no card).
 * Idempotent — if already claimed, returns alreadyUsed.
 */
export async function POST() {
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
    .select("role, premium_trial_started_at, premium_trial_ends_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleRow?.role !== "specialist") {
    return NextResponse.json(
      { ok: false, message: "Specialist access required." },
      { status: 403 }
    );
  }

  if (roleRow.premium_trial_started_at) {
    return NextResponse.json({
      ok: true,
      granted: false,
      alreadyUsed: true,
      trialEndsAt: roleRow.premium_trial_ends_at ?? null,
      message: "Your free Pro month was already claimed.",
    });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Could not start free Pro trial. Try again." },
      { status: 503 }
    );
  }

  const { data: profile } = await service
    .from("specialist_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const result = await grantSpecialistPremiumTrialIfNeeded(
    service,
    user.id,
    profile?.id ?? null
  );

  if (!result.granted) {
    if (result.trialEndsAt) {
      return NextResponse.json({
        ok: true,
        granted: false,
        alreadyUsed: true,
        trialEndsAt: result.trialEndsAt,
        message: "Your free Pro month was already claimed.",
      });
    }
    return NextResponse.json(
      {
        ok: false,
        message: "Could not start free Pro trial. Try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    granted: true,
    alreadyUsed: false,
    trialEndsAt: result.trialEndsAt,
    message: "Pro unlocked for 30 days — no card required.",
  });
}
