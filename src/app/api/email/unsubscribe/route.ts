import { NextResponse } from "next/server";
import { parseUnsubscribeToken } from "@/lib/admin-email-unsubscribe";
import { refreshAdminEmailCounts } from "@/lib/admin-email-db";
import { markOutreachUnsubscribed } from "@/lib/outreach/prospects";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { WORKOUT_EMAIL_UNSUBSCRIBE_PREFIX } from "@/lib/email/client-workout-email-service";

export const runtime = "nodejs";

async function applyUnsubscribe(token: string | null) {
  if (!token) return { ok: false as const, message: "Missing unsubscribe token." };
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) return { ok: false as const, message: "This unsubscribe link is invalid." };

  const service = createSupabaseServiceClient();
  if (!service) {
    return { ok: false as const, message: "Unsubscribe is unavailable right now." };
  }

  if (parsed.emailId?.startsWith(WORKOUT_EMAIL_UNSUBSCRIBE_PREFIX)) {
    const userId = parsed.emailId.slice(WORKOUT_EMAIL_UNSUBSCRIBE_PREFIX.length);
    const { error } = await service.from("client_email_preferences").upsert({
      user_id: userId,
      workout_emails: false,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return { ok: false as const, message: "Could not update your preferences." };
    }
    return {
      ok: true as const,
      email: parsed.email,
      message: "You won’t get workout streak emails anymore. Turn them back on in Edit profile.",
    };
  }

  await service.from("admin_email_unsubscribes").upsert({
    email: parsed.email,
    source_email_id: parsed.emailId,
  });

  await markOutreachUnsubscribed(parsed.email);

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
