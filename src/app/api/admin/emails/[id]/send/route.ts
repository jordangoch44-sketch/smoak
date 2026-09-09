import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { sendAdminEmailNow } from "@/lib/admin-email-send";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const caller = await requireAdminApiUser();
  if (!caller) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  const result = await sendAdminEmailNow(id);
  return NextResponse.json(
    { ok: result.ok, result, message: result.message },
    { status: result.ok ? 200 : 502 }
  );
}
