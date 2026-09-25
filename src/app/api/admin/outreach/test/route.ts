import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { sendOutreachTest } from "@/lib/outreach/campaigns";

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
    toEmail?: unknown;
    name?: unknown;
    business?: unknown;
    confirm?: unknown;
  } | null;
  if (!body || body.confirm !== true) {
    return NextResponse.json(
      { ok: false, message: "Confirm the test send first." },
      { status: 400 }
    );
  }
  const result = await sendOutreachTest({
    templateId: typeof body.templateId === "string" ? body.templateId : "",
    toEmail: typeof body.toEmail === "string" ? body.toEmail : "",
    name: typeof body.name === "string" ? body.name : "",
    business: typeof body.business === "string" ? body.business : "",
    userId: caller.userId,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    message: result.message,
    delivered: result.delivered,
  });
}
