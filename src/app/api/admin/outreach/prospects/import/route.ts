import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import {
  importOutreachProspects,
  type ImportProspectRow,
} from "@/lib/outreach/prospects";

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
    rows?: ImportProspectRow[];
    commit?: boolean;
  } | null;
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ ok: false, message: "Missing rows." }, { status: 400 });
  }

  const result = await importOutreachProspects(
    body.rows,
    body.commit === true,
    caller.userId
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    preview: result.preview,
    imported: result.imported,
  });
}
