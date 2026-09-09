import { NextResponse } from "next/server";
import { parseUnsubscribeToken } from "@/lib/admin-email-unsubscribe";
import { refreshAdminEmailCounts } from "@/lib/admin-email-db";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

async function applyUnsubscribe(token: string | null) {
  if (!token) return { ok: false as const, message: "Missing unsubscribe token." };
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) return { ok: false as const, message: "This unsubscribe link is invalid." };

  const service = createSupabaseServiceClient();
  if (!service) {
    return { ok: false as const, message: "Unsubscribe is unavailable right now." };
  }

  await service.from("admin_email_unsubscribes").upsert({
    email: parsed.email,
    source_email_id: parsed.emailId,
  });

  if (parsed.emailId) {
    await service
      .from("admin_email_recipients")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("email_id", parsed.emailId)
      .eq("to_email", parsed.email);
    await refreshAdminEmailCounts(parsed.emailId);
  }

  return { ok: true as const, email: parsed.email };
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const result = await applyUnsubscribe(token);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function POST(request: Request) {
  let token: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { token?: string } | null;
    token = body?.token ?? null;
  } else {
    token = new URL(request.url).searchParams.get("token");
  }
  const result = await applyUnsubscribe(token);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
