import type { ClientApplication } from "@/types/client-application";
import type { SpecialistApplication } from "@/types/specialist-application";

export interface ConfirmationEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  applicationId: string;
  kind: "specialist" | "client";
}

export interface ConfirmationEmailResult {
  success: boolean;
}

function firstNameFromFullName(fullName: string, fallback = "there"): string {
  const trimmed = fullName.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0] ?? fallback;
}

function specialistFirstName(application: SpecialistApplication): string {
  return (
    firstNameFromFullName(application.fullName) ||
    firstNameFromFullName(application.displayName) ||
    "there"
  );
}

function clientFirstName(application: ClientApplication): string {
  return firstNameFromFullName(application.fullName) || "there";
}

function buildSpecialistConfirmationEmail(
  application: SpecialistApplication
): ConfirmationEmailPayload {
  const firstName = specialistFirstName(application);
  const text = `Hi ${firstName},

We received your SMOAC specialist application.

Your profile is now pending internal review. Once approved, your profile may become visible in the SMOAC marketplace.

Thank you,
SMOAC`;

  return {
    to: application.email.trim(),
    subject: "SMOAC application received",
    text,
    applicationId: application.id,
    kind: "specialist",
  };
}

function buildClientConfirmationEmail(
  application: ClientApplication
): ConfirmationEmailPayload {
  const firstName = clientFirstName(application);
  const text = `Hi ${firstName},

Your SMOAC client account/application has been received.

You can now continue exploring specialists and saving profiles.

Thank you,
SMOAC`;

  return {
    to: application.email.trim(),
    subject: "Welcome to SMOAC",
    text,
    applicationId: application.id,
    kind: "client",
  };
}

/**
 * Placeholder transport — logs payload and returns success until a provider is wired.
 *
 * TODO(Resend): import { Resend } from "resend";
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *   await resend.emails.send({ from: "SMOAC <noreply@smoac.com>", to: payload.to, subject: payload.subject, text: payload.text });
 *
 * TODO(SendGrid): use @sendgrid/mail with SENDGRID_API_KEY and a verified sender.
 *
 * TODO(Supabase Edge Function): await fetch(`${SUPABASE_URL}/functions/v1/send-confirmation-email`, {
 *   method: "POST",
 *   headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
 *   body: JSON.stringify(payload),
 * });
 */
async function dispatchConfirmationEmail(
  payload: ConfirmationEmailPayload,
  testLogLabel: string
): Promise<ConfirmationEmailResult> {
  console.info(testLogLabel);
  console.info("[SMOAC EMAIL] Confirmation email payload:", {
    kind: payload.kind,
    applicationId: payload.applicationId,
    to: payload.to,
    subject: payload.subject,
    bodyPreview: payload.text.split("\n").slice(0, 3).join(" "),
    fullText: payload.text,
  });

  // When a real provider is connected, replace the block above with the provider call.
  // Throw or return { success: false } on provider failure so callers can console.warn.

  return { success: true };
}

/** Send specialist Join Now confirmation — non-blocking; logs in dev when no provider */
export async function sendSpecialistApplicationConfirmationEmail(
  application: SpecialistApplication
): Promise<ConfirmationEmailResult> {
  try {
    const payload = buildSpecialistConfirmationEmail(application);
    return await dispatchConfirmationEmail(
      payload,
      "[SMOAC EMAIL TEST] Specialist confirmation email queued"
    );
  } catch (error) {
    console.warn("[SMOAC EMAIL] Specialist confirmation email failed", error);
    return { success: false };
  }
}

/** Send client Join Now confirmation — non-blocking; logs in dev when no provider */
export async function sendClientApplicationConfirmationEmail(
  application: ClientApplication
): Promise<ConfirmationEmailResult> {
  try {
    const payload = buildClientConfirmationEmail(application);
    return await dispatchConfirmationEmail(
      payload,
      "[SMOAC EMAIL TEST] Client confirmation email queued"
    );
  } catch (error) {
    console.warn("[SMOAC EMAIL] Client confirmation email failed", error);
    return { success: false };
  }
}
