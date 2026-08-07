import { dispatchTransactionalEmail } from "@/lib/email/email-transport";
import {
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import { getSiteUrlForStripe } from "@/lib/stripe/config";
import { LOGIN_PATH } from "@/lib/auth-routes";
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

function specialistLoginUrl(): string {
  return `${getSiteUrlForStripe()}${LOGIN_PATH}`;
}

function buildSpecialistConfirmationEmail(
  application: SpecialistApplication
): ConfirmationEmailPayload {
  const firstName = specialistFirstName(application);
  const text = `Hi ${firstName},

Welcome to SMOAC — we received your specialist application.

Every application is reviewed individually. We typically verify accounts within 24 hours. You'll receive another email when your account is approved — then you can log in and finish your full in-depth profile (pricing, availability, media, and more).

Thank you,
SMOAC`;

  const html = wrapTransactionalEmailHtml({
    preheader: "Welcome to SMOAC — your application is under review",
    eyebrow: "Welcome",
    title: "We received your application",
    bodyHtml: renderEmailParagraphs([
      `Hi ${firstName},`,
      "Welcome to SMOAC — thank you for applying as a specialist.",
      "Every application is reviewed individually. We typically verify accounts within 24 hours.",
      "You’ll receive another email when you’re approved — then you can log in and finish your in-depth profile, including pricing, availability, media, and credentials.",
    ]),
    footerNote: "No action needed right now — we’ll email you when you’re approved.",
  });

  return {
    to: application.email.trim(),
    subject: "Welcome to SMOAC — application received & under review",
    text,
    html,
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

  const html = wrapTransactionalEmailHtml({
    preheader: "You’re approved — log in to finish your profile",
    eyebrow: "You’re approved",
    title: "Welcome to SMOAC",
    bodyHtml: renderEmailParagraphs([
      `Hi ${firstName},`,
      "Your specialist account has been approved. Your profile can go live once you finish the details clients need to book with confidence.",
      "Log in with the email and password you used to apply. Choose Continue as Specialist, then open Edit profile to add pricing, availability, photos, credentials, and coaching details.",
    ]),
    cta: {
      label: "Log in to finish your profile",
      href: loginUrl,
    },
    footerNote: "Clients discover you on SMOAC once your listing is complete and live.",
  });

  return {
    to: application.email.trim(),
    subject: "You’re approved on SMOAC — log in to finish your profile",
    text,
    html,
    applicationId: application.id,
    kind: "specialist",
  };
}

function buildSpecialistRejectionEmail(
  application: SpecialistApplication
): ConfirmationEmailPayload {
  const firstName = specialistFirstName(application);
  const reason =
    application.rejectionReason?.trim() ||
    "Please update your application details and request another review.";
  const loginUrl = specialistLoginUrl();
  const text = `Hi ${firstName},

Thanks for applying to SMOAC. Your specialist application needs a few updates before it can go live.

What to fix:
${reason}

Log in, edit your submitted profile, then tap Request review:
${loginUrl}

We’ll look again as soon as you resubmit.

— The SMOAC team`;

  const html = wrapTransactionalEmailHtml({
    preheader: "Your SMOAC application needs a few updates",
    eyebrow: "Needs changes",
    title: "Update and resubmit your application",
    bodyHtml: renderEmailParagraphs([
      `Hi ${firstName},`,
      "Thanks for applying to SMOAC. Your specialist application needs a few updates before it can go live.",
      `What to fix: ${reason}`,
      "Log in, edit your submitted profile, then tap Request review so we can look again.",
    ]),
    cta: {
      label: "Log in to update your application",
      href: loginUrl,
    },
    footerNote: "We’ll review again as soon as you resubmit.",
  });

  return {
    to: application.email.trim(),
    subject: "SMOAC application needs updates — please revise and resubmit",
    text,
    html,
    applicationId: application.id,
    kind: "specialist",
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
      html: payload.html,
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
      html: payload.html,
      kind: "approval_specialist",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Specialist approval email failed", error);
    return { success: false };
  }
}

/** Notify specialist that their application was rejected and how to resubmit. */
export async function sendSpecialistApplicationRejectedEmail(
  application: SpecialistApplication
): Promise<ConfirmationEmailResult> {
  try {
    const payload = buildSpecialistRejectionEmail(application);
    return await dispatchTransactionalEmail({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      kind: "rejection_specialist",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Specialist rejection email failed", error);
    return { success: false };
  }
}
