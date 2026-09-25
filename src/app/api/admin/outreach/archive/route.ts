import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { setAdminOutreachTemplateArchived } from "@/lib/admin-outreach";

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
    id?: unknown;
    archived?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const result = await setAdminOutreachTemplateArchived(id, body?.archived !== false);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
