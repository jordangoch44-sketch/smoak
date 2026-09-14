import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { grantSpecialistPremiumTrialIfNeeded } from "@/lib/specialist-premium-trial";
import { isAdminAppRole } from "@/types/auth-roles";

interface Body {
  userId?: string;
  specialistId?: string;
}

/**
 * Admin: start the one-time Pro trial when a specialist goes live.
 * Founding 100 get 60 days; everyone else gets 30. Idempotent — skips if
 * already claimed, and extends an active shorter founding trial to 60 days.
 */
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

  if (!roleRow || !isAdminAppRole(String(roleRow.role))) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const userId = body.userId?.trim() || "";
  const specialistId = body.specialistId?.trim() || "";
  if (!userId) {
    return NextResponse.json(
      { ok: false, message: "userId is required." },
      { status: 400 }
    );
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const result = await grantSpecialistPremiumTrialIfNeeded(
    service,
    userId,
    specialistId || null
  );

  return NextResponse.json({
    ok: true,
    granted: result.granted,
    extended: result.extended,
    founding: result.founding,
    trialDays: result.trialDays,
    trialEndsAt: result.trialEndsAt,
    message: result.granted
      ? `Pro trial started for ${result.trialDays} days.`
      : result.extended
        ? `Pro trial extended to ${result.trialDays} days.`
        : result.trialEndsAt
          ? "Pro trial already started previously."
          : "Could not start Pro trial (check specialist role).",
  });
}
