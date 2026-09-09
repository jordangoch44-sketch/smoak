import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { loadAdminEmailAnalytics } from "@/lib/admin-email-analytics";
import type { AdminEmailAnalyticsRange } from "@/types/admin-email";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const { searchParams } = new URL(request.url);
  const range: AdminEmailAnalyticsRange =
    searchParams.get("range") === "7d" ? "7d" : "30d";
  const analytics = await loadAdminEmailAnalytics(range);
  return NextResponse.json({ ok: true, analytics });
}
