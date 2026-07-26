import { NextResponse } from "next/server";
import { expireDuePremiumTrials } from "@/lib/specialist-premium-trial";

export const runtime = "nodejs";

/**
 * Daily cron: drop expired complimentary Pro trials to free (unless Stripe paid).
 * Secure with CRON_SECRET header from Vercel Cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await expireDuePremiumTrials();
  return NextResponse.json({ ok: true, expired });
}
