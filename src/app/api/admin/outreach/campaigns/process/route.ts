import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { processOutreachCampaign } from "@/lib/outreach/campaigns";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const body = (await request.json().catch(() => null)) as { campaignId?: unknown } | null;
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId.trim() : "";
  if (!campaignId) {
    return NextResponse.json({ ok: false, message: "Missing campaign." }, { status: 400 });
  }
  const result = await processOutreachCampaign(campaignId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    processed: result.processed,
    remaining: result.remaining,
    status: result.status,
    paused: result.paused,
  });
}
