import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { readOutreachProspectHistory } from "@/lib/outreach/prospects";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  const loaded = await readOutreachProspectHistory(id);
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, message: loaded.message }, { status: 404 });
  }
  return NextResponse.json({ ok: true, prospect: loaded.prospect, events: loaded.events });
}
