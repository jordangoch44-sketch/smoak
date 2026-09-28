import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { loadOutreachCampaignReport } from "@/lib/outreach/campaign-report";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const CAMPAIGN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: RouteContext) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const campaignId = id.trim();
  if (!CAMPAIGN_ID.test(campaignId)) {
    return NextResponse.json({ ok: false, message: "Missing campaign." }, { status: 400 });
  }

  const loaded = await loadOutreachCampaignReport(campaignId);
  if (!loaded.ok) {
    const status = loaded.message === "That campaign is gone." ? 404 : 503;
    return NextResponse.json({ ok: false, message: loaded.message }, { status });
  }
  return NextResponse.json({ ok: true, report: loaded.report });
}
