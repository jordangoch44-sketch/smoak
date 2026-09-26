import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { isOutreachStatus } from "@/lib/outreach/catalog";
import {
  deleteOutreachProspects,
  logOutreachInstagram,
  setOutreachProspectStatus,
  undoOutreachInstagram,
  setOutreachProspectsArchived,
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
    ids?: unknown;
    action?: unknown;
    status?: unknown;
  } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : [];
  const action = typeof body?.action === "string" ? body.action : "";

  const result =
    action === "archive"
      ? await setOutreachProspectsArchived(ids, true)
      : action === "restore"
        ? await setOutreachProspectsArchived(ids, false)
        : action === "delete"
          ? await deleteOutreachProspects(ids)
          : action === "status" && typeof body?.status === "string" && isOutreachStatus(body.status)
            ? await setOutreachProspectStatus(ids, body.status)
            : action === "instagram_messaged"
              ? await logOutreachInstagram(ids, "messaged")
              : action === "instagram_responded"
                ? await logOutreachInstagram(ids, "responded")
                : action === "instagram_undo"
                  ? await undoOutreachInstagram(ids)
                  : { ok: false as const, message: "Choose a bulk action." };

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, count: result.count });
}
