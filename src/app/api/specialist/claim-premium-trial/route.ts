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

  if (result.granted || result.extended) {
    return NextResponse.json({
      ok: true,
      granted: result.granted || result.extended,
      alreadyUsed: false,
      founding: result.founding,
      trialDays: result.trialDays,
      trialEndsAt: result.trialEndsAt,
      message: `Pro unlocked for ${result.trialDays} days — no card required.`,
    });
  }

  if (result.trialEndsAt) {
    return NextResponse.json({
      ok: true,
      granted: false,
      alreadyUsed: true,
      founding: result.founding,
      trialDays: result.trialDays,
      trialEndsAt: result.trialEndsAt,
      message: "Your free Pro trial was already claimed.",
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
