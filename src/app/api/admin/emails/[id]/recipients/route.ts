import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { listAdminEmailRecipientsFromDb } from "@/lib/admin-email-db";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  const recipients = await listAdminEmailRecipientsFromDb(id);
  return NextResponse.json({ ok: true, recipients });
}
