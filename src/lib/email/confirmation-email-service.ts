import { dispatchTransactionalEmail } from "@/lib/email/email-transport";
import { getSiteUrlForStripe } from "@/lib/stripe/config";
import { LOGIN_PATH } from "@/lib/auth-routes";
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

/** @deprecated Prefer EmailSendResult from email-transport — kept for existing callers */
export type ConfirmationEmailResult = {
  success: boolean;
  mode?: "resend" | "console";
};

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

function specialistLoginUrl(): string {
  return `${getSiteUrlForStripe()}${LOGIN_PATH}`;
}

function buildSpecialistConfirmationEmail(
  application: SpecialistApplication
): ConfirmationEmailPayload {
  const firstName = specialistFirstName(application);
  const text = `Hi ${firstName},

We received your SMOAC specialist application.

Every application is reviewed individually. We typically verify accounts within 24 hours. You'll receive another email when your account is approved — then you can log in and finish your full in-depth profile (pricing, availability, media, and more).

Thank you,
SMOAC`;

  return {
    to: application.email.trim(),
    subject: "SMOAC application received — under review",
    text,
    applicationId: application.id,
    kind: "specialist",
  };
}

function buildSpecialistApprovalEmail(
  application: SpecialistApplication
): ConfirmationEmailPayload {
  const firstName = specialistFirstName(application);
  const loginUrl = specialistLoginUrl();
  const text = `Hi ${firstName},

Great news — your SMOAC specialist account has been approved and your profile can go live.

Log in with the email and password you used to apply:
${loginUrl}

Choose Continue as Specialist, then open Edit profile to finish your in-depth profile — pricing, availability, photos, credentials, and coaching details. Clients discover you on SMOAC once your listing is live.

Welcome to SMOAC,
The SMOAC team`;

  return {
    to: application.email.trim(),
    subject: "You’re approved on SMOAC — log in to finish your profile",
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

/** Send specialist Join Now confirmation — Resend when configured. */
export async function sendSpecialistApplicationConfirmationEmail(
  application: SpecialistApplication
): Promise<ConfirmationEmailResult> {
  try {
    const payload = buildSpecialistConfirmationEmail(application);
    return await dispatchTransactionalEmail({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      kind: "confirmation_specialist",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Specialist confirmation email failed", error);
    return { success: false };
  }
}

/** Notify specialist that their application was approved — invite them back to log in. */
export async function sendSpecialistApplicationApprovedEmail(
  application: SpecialistApplication
): Promise<ConfirmationEmailResult> {
  try {
    const payload = buildSpecialistApprovalEmail(application);
    return await dispatchTransactionalEmail({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      kind: "approval_specialist",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Specialist approval email failed", error);
    return { success: false };
  }
}

/** Send client Join Now confirmation — Resend when configured. */
export async function sendClientApplicationConfirmationEmail(
  application: ClientApplication
): Promise<ConfirmationEmailResult> {
  try {
    const payload = buildClientConfirmationEmail(application);
    return await dispatchTransactionalEmail({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      kind: "confirmation_client",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Client confirmation email failed", error);
    return { success: false };
  }
}
