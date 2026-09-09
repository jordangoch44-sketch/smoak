import { createHmac, timingSafeEqual } from "node:crypto";
import { emailAbsoluteUrl } from "@/lib/email/email-html-shell";

function secret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "smoac-email-unsubscribe-dev"
  );
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createUnsubscribeToken(
  email: string,
  emailId?: string | null
): string {
  const payload = toBase64Url(
    JSON.stringify({
      e: email.trim().toLowerCase(),
      i: emailId ?? "",
    })
  );
  return `${payload}.${sign(payload)}`;
}

export function parseUnsubscribeToken(
  token: string
): { email: string; emailId: string | null } | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = trimmed.slice(0, dot);
  const signature = trimmed.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as {
      e?: string;
      i?: string;
    };
    const email = String(parsed.e ?? "").trim().toLowerCase();
    if (!email.includes("@")) return null;
    return { email, emailId: parsed.i ? String(parsed.i) : null };
  } catch {
    return null;
  }
}

export function unsubscribeUrlFor(
  email: string,
  emailId?: string | null
): string {
  const token = createUnsubscribeToken(email, emailId);
  return emailAbsoluteUrl(
    `/email/unsubscribe?token=${encodeURIComponent(token)}`
  );
}
