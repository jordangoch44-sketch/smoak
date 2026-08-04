import { NextResponse } from "next/server";
import { processPremiumTrialLifecycle } from "@/lib/specialist-premium-trial";

export const runtime = "nodejs";

/**
 * Daily cron: Pro trial reminder emails (day 10 / 20 / last day), then expire
 * due complimentary trials to Free (unless Stripe paid).
 * Secure with CRON_SECRET header from Vercel Cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  /* Always require a configured secret so the endpoint cannot be invoked openly. */
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reminders, expired } = await processPremiumTrialLifecycle();
  return NextResponse.json({ ok: true, reminders, expired });
}
