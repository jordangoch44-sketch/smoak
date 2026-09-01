import { NextResponse } from "next/server";
import { getAdminDataClient } from "@/lib/admin-api-auth";
import { buildAdminPlatformPulse } from "@/lib/admin-platform-pulse-service";

/** Live admin Snapshot pulse — Stripe MRR + site_visits via service role. */
export async function GET() {
  const supabase = await getAdminDataClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const pulse = await buildAdminPlatformPulse(supabase);
  return NextResponse.json({ ok: true, pulse });
}
