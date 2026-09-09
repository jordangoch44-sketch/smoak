import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { countAdminEmailAudience } from "@/lib/admin-email-audience";
import type { AdminEmailAudienceId } from "@/types/admin-email";

export const runtime = "nodejs";

const AUDIENCES = new Set<AdminEmailAudienceId>([
  "specialists_all",
  "clients_all",
  "specialists_pro",
  "specialists_free",
  "inactive",
]);

export async function GET(request: Request) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id): id is AdminEmailAudienceId =>
      AUDIENCES.has(id as AdminEmailAudienceId)
    );
  const count = await countAdminEmailAudience(ids);
  return NextResponse.json({ ok: true, count });
}
