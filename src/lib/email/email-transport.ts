import {
  emailBrandInlineAttachments,
  rewriteEmailBrandImagesToCid,
} from "@/lib/email/email-inline-images";
import { SUPPORT_EMAIL } from "@/lib/site-contact";

/** Inquiry notices stay in-app — do not route Hit Reply to support. */
const NO_DEFAULT_REPLY_TO_KINDS = new Set([
  "inquiry_client",
  "inquiry_specialist",
  /* Recipient is already support — reply goes to the person who signed up or paid. */
  "ops_alert",
]);

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  /** Branded HTML multipart body — always prefer sending with text fallback */
  html?: string;
  /**
   * Resend reply_to. Informational mail defaults to `support@smoac.com`.
   * Inquiry notifications omit it so people reply in SMOAC, not email.
   */
  replyTo?: string;
  kind: string;
  tags?: Array<{ name: string; value: string }>;
}

/** Reply-To for transactional mail. From-address stays EMAIL_FROM (noreply). */
export function resolveTransactionalReplyTo(
  kind: string,
  explicit?: string
): string | undefined {
  const override = explicit?.trim().toLowerCase();
  if (override) return override;
  if (NO_DEFAULT_REPLY_TO_KINDS.has(kind)) return undefined;
  return process.env.EMAIL_REPLY_TO?.trim().toLowerCase() || SUPPORT_EMAIL;
}

export interface EmailSendResult {
  success: boolean;
  mode: EmailTransportMode;
  providerId?: string;
}

export type EmailTransportMode = "resend" | "console";

export function getEmailTransportMode(): EmailTransportMode {
  return process.env.RESEND_API_KEY?.trim() ? "resend" : "console";
}

/**
 * Server-side email send. Uses Resend when RESEND_API_KEY is set; otherwise
 * logs the payload (dev / until a provider is configured).
 */
export async function sendOutboundEmail(
  payload: OutboundEmail
): Promise<EmailSendResult> {
  const mode = getEmailTransportMode();
  const to = payload.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    console.warn("[SMOAC EMAIL] Invalid recipient — skipped", {
      kind: payload.kind,
      to: payload.to,
    });
    return { success: false, mode };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || "SMOAC <onboarding@resend.dev>";
  const rawHtml = payload.html?.trim() || undefined;
  const html = rawHtml ? rewriteEmailBrandImagesToCid(rawHtml) : undefined;
  const brandAttachments =
    html && /cid:smoac-(?:mark|wordmark)/i.test(html)
      ? emailBrandInlineAttachments()
      : [];
  const replyTo = resolveTransactionalReplyTo(payload.kind, payload.replyTo);

  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: payload.subject,
          text: payload.text,
          ...(html ? { html } : {}),
          ...(brandAttachments.length > 0
            ? { attachments: brandAttachments }
            : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
          ...(payload.tags && payload.tags.length > 0
            ? { tags: payload.tags }
            : {}),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn("[SMOAC EMAIL] Resend failed", {
          kind: payload.kind,
          status: response.status,
          detail: detail.slice(0, 300),
        });
        return { success: false, mode };
      }

      const sentBody = (await response.json().catch(() => null)) as {
        id?: string;
      } | null;
      const providerId =
        typeof sentBody?.id === "string" ? sentBody.id : undefined;

      console.info("[SMOAC EMAIL] Sent via Resend", {
        kind: payload.kind,
        to,
        subject: payload.subject,
        html: Boolean(html),
        replyTo: replyTo ?? null,
        providerId,
      });
      return { success: true, mode, providerId };
    } catch (error) {
      console.warn("[SMOAC EMAIL] Resend request error", error);
      return { success: false, mode };
    }
  }

  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  console.info("[SMOAC EMAIL TEST] Email queued (no RESEND_API_KEY)", {
    kind: payload.kind,
    to,
    subject: payload.subject,
    html: Boolean(html),
    replyTo: replyTo ?? null,
    bodyPreview: payload.text.split("\n").slice(0, 6).join(" "),
    fullText: payload.text,
  });

  /* In production, console mode must not look like a successful send */
  return { success: !isProd, mode: "console" };
}

/**
 * Browser → API route, server → direct transport.
 * Keeps RESEND_API_KEY off the client.
 */
export async function dispatchTransactionalEmail(
  payload: OutboundEmail
): Promise<EmailSendResult> {
  try {
    if (typeof window !== "undefined") {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        mode?: EmailTransportMode;
      } | null;
      return {
        success: Boolean(response.ok && data?.success),
        mode: data?.mode === "resend" ? "resend" : "console",
        providerId:
          typeof (data as { providerId?: string } | null)?.providerId ===
          "string"
            ? (data as { providerId?: string }).providerId
            : undefined,
      };
    }

    return sendOutboundEmail(payload);
  } catch (error) {
    console.warn("[SMOAC EMAIL] Dispatch failed", error);
    return { success: false, mode: getEmailTransportMode() };
  }
}
