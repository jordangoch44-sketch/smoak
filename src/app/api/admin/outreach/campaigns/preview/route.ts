import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { previewOutreachCampaign } from "@/lib/outreach/campaigns";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const body = (await request.json().catch(() => null)) as {
    templateId?: unknown;
    prospectIds?: unknown;
    sample?: { name?: unknown; business?: unknown; email?: unknown };
  } | null;
  const prospectIds = Array.isArray(body?.prospectIds)
    ? body.prospectIds.filter((id): id is string => typeof id === "string")
    : [];
  const result = await previewOutreachCampaign({
    templateId: typeof body?.templateId === "string" ? body.templateId : "",
    prospectIds,
    sample: body?.sample
      ? {
          name: typeof body.sample.name === "string" ? body.sample.name : "",
          business: typeof body.sample.business === "string" ? body.sample.business : "",
          email: typeof body.sample.email === "string" ? body.sample.email : "",
        }
      : undefined,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    preview: result.preview,
    subject: result.subject,
    html: result.html,
    text: result.text,
    liveSends: result.liveSends,
  });
}
