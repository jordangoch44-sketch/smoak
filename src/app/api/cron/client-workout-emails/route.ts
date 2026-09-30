import { NextResponse } from "next/server";
import { sendDueClientWorkoutEmails } from "@/lib/workouts/client-workout-email-cron";

export const runtime = "nodejs";

/**
 * Hourly cron: client workout streak emails, timed to each client's zone.
 * Secure with CRON_SECRET header from Vercel Cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent = await sendDueClientWorkoutEmails();
  return NextResponse.json({ ok: true, sent });
}
