export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  kind: string;
}

export interface EmailSendResult {
  success: boolean;
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
  const to = payload.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    console.warn("[SMOAC EMAIL] Invalid recipient — skipped", {
      kind: payload.kind,
      to: payload.to,
    });
    return { success: false };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || "SMOAC <onboarding@resend.dev>";

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
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn("[SMOAC EMAIL] Resend failed", {
          kind: payload.kind,
          status: response.status,
          detail: detail.slice(0, 300),
        });
        return { success: false };
      }

      console.info("[SMOAC EMAIL] Sent via Resend", {
        kind: payload.kind,
        to,
        subject: payload.subject,
      });
      return { success: true };
    } catch (error) {
      console.warn("[SMOAC EMAIL] Resend request error", error);
      return { success: false };
    }
  }

  console.info("[SMOAC EMAIL TEST] Email queued (no RESEND_API_KEY)", {
    kind: payload.kind,
    to,
    subject: payload.subject,
    bodyPreview: payload.text.split("\n").slice(0, 6).join(" "),
    fullText: payload.text,
  });
  return { success: true };
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
      } | null;
      return { success: Boolean(response.ok && data?.success) };
    }

    return sendOutboundEmail(payload);
  } catch (error) {
    console.warn("[SMOAC EMAIL] Dispatch failed", error);
    return { success: false };
  }
}
