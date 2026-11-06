import { NextResponse } from "next/server";
import { sendDueSpecialistProfileReminders } from "@/lib/specialist-profile-reminder-cron";

export const runtime = "nodejs";

/**
 * Daily cron: incomplete specialist profile reminders at 48 hours and around day 5.
 * Secure with CRON_SECRET header from Vercel Cron.
 * Requires the specialist_profile_reminder_sends table.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent = await sendDueSpecialistProfileReminders();
  return NextResponse.json({ ok: true, sent });
}
