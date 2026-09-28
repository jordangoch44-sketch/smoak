import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { applyOutreachProviderEvent } from "@/lib/outreach/campaigns";

export const runtime = "nodejs";

function secretMatches(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

const PROVIDER_EVENTS = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
  "email.clicked": "clicked",
} as const;

/**
 * Resend delivery events. Disabled until RESEND_WEBHOOK_SECRET is set.
 * Point Resend at /api/webhooks/resend?token=SECRET
 */
export async function POST(request: Request) {
  const expected = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!secretMatches(token, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    type?: string;
    created_at?: string;
    data?: { email_id?: string; click?: { link?: string } };
  } | null;
  const providerId = body?.data?.email_id?.trim() ?? "";
  const type = body?.type ?? "";
  const mapped = PROVIDER_EVENTS[type as keyof typeof PROVIDER_EVENTS];
  if (providerId && mapped) {
    await applyOutreachProviderEvent({
      providerId,
      type: mapped,
      at: body?.created_at,
      link: body?.data?.click?.link,
    });
  }
  return NextResponse.json({ ok: true });
}
