import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendCoachWorkoutFinishedPush } from "@/lib/push/coaching-push";

export const runtime = "nodejs";

/** Client finished a workout a specialist sent. Alerts that specialist once. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Sign in to continue." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to continue." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { workoutId?: unknown } | null;
  const workoutId = typeof body?.workoutId === "string" ? body.workoutId.trim() : "";
  if (!workoutId) {
    return NextResponse.json({ ok: false, message: "Workout not found." }, { status: 400 });
  }

  await sendCoachWorkoutFinishedPush({ clientUserId: user.id, workoutId });
  return NextResponse.json({ ok: true });
}
