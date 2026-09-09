import { NextResponse } from "next/server";
import { runAdminEmailMaintenance } from "@/lib/admin-email-send";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runAdminEmailMaintenance();
  return NextResponse.json({ ok: true, ...result });
}
