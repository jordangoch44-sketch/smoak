import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { persistSpecialistWelcomeInquiry } from "@/lib/inquiry/specialist-welcome-inquiry-server";

export const runtime = "nodejs";

interface WelcomeBody {
  specialistId?: string;
  specialistName?: string;
  firstName?: string;
}

/**
 * One-time SMOAC Team welcome thread for a newly approved specialist.
 * Idempotent. Does not email — the unread inquiry is the notification.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Authentication is not available.", localFallback: true },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in required.", localFallback: true },
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

  let body: WelcomeBody = {};
  try {
    body = (await request.json()) as WelcomeBody;
  } catch {
    body = {};
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileFirst =
    typeof profile?.first_name === "string" ? profile.first_name.trim() : "";
  const bodyFirst =
    typeof body.firstName === "string" ? body.firstName.trim() : "";

  const result = await persistSpecialistWelcomeInquiry({
    specialistUserId: user.id,
    specialistId:
      typeof body.specialistId === "string" ? body.specialistId.trim() : undefined,
    specialistName:
      typeof body.specialistName === "string"
        ? body.specialistName.trim()
        : undefined,
    firstName: profileFirst || bodyFirst,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}
