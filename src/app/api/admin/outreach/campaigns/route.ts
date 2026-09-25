import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import {
  createOutreachCampaign,
  listOutreachCampaigns,
} from "@/lib/outreach/campaigns";

export const runtime = "nodejs";

function denied() {
  return NextResponse.json(
    { ok: false, message: "Admin access required." },
    { status: 403 }
  );
}

export async function GET() {
  const caller = await requireAdminApiUser();
  if (!caller) return denied();
  const loaded = await listOutreachCampaigns();
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, message: loaded.message }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    campaigns: loaded.campaigns,
    liveSends: loaded.liveSends,
  });
}

export async function POST(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) return denied();
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    templateId?: unknown;
    prospectIds?: unknown;
    scheduledAt?: unknown;
    confirm?: unknown;
  } | null;

  if (!body || body.confirm !== true) {
    return NextResponse.json(
      { ok: false, message: "Confirm the campaign before it can be queued." },
      { status: 400 }
    );
  }

  const prospectIds = Array.isArray(body.prospectIds)
    ? body.prospectIds.filter((id): id is string => typeof id === "string")
    : [];

  const created = await createOutreachCampaign({
    name: typeof body.name === "string" ? body.name : "",
    templateId: typeof body.templateId === "string" ? body.templateId : "",
    prospectIds,
    scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : null,
    userId: caller.userId,
  });
  if (!created.ok) {
    return NextResponse.json({ ok: false, message: created.message }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    campaign: created.campaign,
    preview: created.preview,
    liveSends: created.liveSends,
  });
}
