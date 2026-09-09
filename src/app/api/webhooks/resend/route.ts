import { NextResponse } from "next/server";
import { refreshAdminEmailCounts } from "@/lib/admin-email-db";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface ResendWebhookEvent {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    tags?: Record<string, string> | Array<{ name?: string; value?: string }>;
  };
}

function tagValue(
  tags:
    | Record<string, string>
    | Array<{ name?: string; value?: string }>
    | undefined,
  name: string
): string | null {
  if (!tags) return null;
  if (Array.isArray(tags)) {
    const found = tags.find((tag) => tag?.name === name);
    return found?.value ? String(found.value) : null;
  }
  const value = tags[name];
  return typeof value === "string" ? value : null;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  if (isProd && !secret) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let event: ResendWebhookEvent;
  try {
    event = (await request.json()) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = String(event.type ?? "");
  const data = event.data ?? {};
  const providerId = typeof data.email_id === "string" ? data.email_id : "";
  const recipientId = tagValue(data.tags, "recipient_id");
  const catalogEmailId = tagValue(data.tags, "email_id");
  const to = Array.isArray(data.to) ? data.to[0] : data.to;

  const service = createSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: true });

  let query = service.from("admin_email_recipients").select("id, email_id, status");
  if (recipientId) query = query.eq("id", recipientId);
  else if (providerId) query = query.eq("provider_id", providerId);
  else if (catalogEmailId && to) {
    query = query.eq("email_id", catalogEmailId).eq("to_email", String(to).toLowerCase());
  } else {
    return NextResponse.json({ ok: true });
  }

  const { data: rows } = await query.limit(1);
  const row = rows?.[0];
  if (!row) return NextResponse.json({ ok: true });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (type === "email.opened") {
    patch.opened_at = now;
    if (row.status === "sent" || row.status === "queued") patch.status = "opened";
  } else if (type === "email.clicked") {
    patch.clicked_at = now;
    patch.opened_at = now;
    patch.status = "clicked";
  } else if (type === "email.bounced") {
    patch.bounced_at = now;
    patch.status = "bounced";
  } else if (type === "email.complained") {
    patch.complained_at = now;
    patch.status = "complained";
  }

  if (Object.keys(patch).length > 0) {
    await service.from("admin_email_recipients").update(patch).eq("id", row.id);
    await refreshAdminEmailCounts(String(row.email_id));
  }

  return NextResponse.json({ ok: true });
}
