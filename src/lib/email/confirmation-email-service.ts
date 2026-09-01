import { dispatchTransactionalEmail } from "@/lib/email/email-transport";
import {
  emailAbsoluteUrl,
  renderEmailBioLinkBubble,
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import { buildJoinFlowHref } from "@/lib/join-flow";
import { getSiteUrlForStripe } from "@/lib/stripe/config";
import { CLIENT_DASHBOARD_PATH, LOGIN_PATH } from "@/lib/auth-routes";
import { CLIENT_WELCOME_EMAIL_SENT_PREFIX } from "@/lib/dev-storage-keys";
import type { SpecialistApplication } from "@/types/specialist-application";

export interface ConfirmationEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  applicationId: string;
  kind: "specialist" | "client";
}

export interface ClientWelcomeEmailInput {
  to: string;
  firstName?: string | null;
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

Every application is reviewed individually. We typically verify accounts within 24 hours. You'll receive another email when your account is approved — then your profile goes live on Marketplace, and you can deepen availability, media, and more anytime from your dashboard.

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
      "You’ll receive another email when you’re approved — your profile goes live on Marketplace, and you can deepen availability, media, and credentials anytime from your dashboard.",
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
  const profileUrl = emailAbsoluteUrl(
    `/trainers/${encodeURIComponent(application.id)}`
  );
  const text = `Hi ${firstName},

Great news — your SMOAC specialist account is approved and your profile is live on Marketplace.

Add your link to your Instagram bio:
Your personal landing page is live. Share this link on your Instagram bio, TikTok, or website so clients can view your verified credentials and book you directly:
${profileUrl}

View Your Live Page:
${profileUrl}

Log in to Dashboard:
${loginUrl}

Choose Continue as Specialist to open your dashboard. You can deepen your listing anytime from Edit profile — availability, extra photos, credentials, and coaching details.

Welcome to SMOAC,
The SMOAC team`;

  const bioLinkBubbleHtml = renderEmailBioLinkBubble({
    title: "Add your link to your Instagram bio",
    description:
      "Your personal landing page is live. Share this link on your Instagram bio, TikTok, or website so clients can view your verified credentials and book you directly:",
    profileUrl,
    viewPageLabel: "View Your Live Page",
  });

  const bodyHtml = [
    renderEmailParagraphs([
      `Hi ${firstName},`,
      "Your specialist account is approved and your profile is live on Marketplace for clients to discover.",
    ]),
    bioLinkBubbleHtml,
    renderEmailParagraphs([
      "Log in with the email and password you used to apply. Choose Continue as Specialist, then use Edit profile anytime to deepen availability, photos, credentials, and coaching details.",
    ]),
  ].join("");

  const html = wrapTransactionalEmailHtml({
    preheader: "You’re approved — your profile is live on SMOAC",
    eyebrow: "You’re live",
    title: "Welcome to SMOAC",
    bodyHtml,
    cta: {
      label: "Log in to Dashboard",
      href: loginUrl,
    },
    secondaryLink: {
      label: "View Your Live Page",
      href: profileUrl,
    },
    footerNote: "You’re discoverable now — keep strengthening your profile as you grow.",
  });

  return {
    to: application.email.trim(),
    subject: "You’re live on SMOAC — your profile is approved",
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
    "Your application did not meet SMOAC listing requirements at this time.";
  const joinUrl = `${getSiteUrlForStripe()}${buildJoinFlowHref({
    role: "specialist",
  })}`;
  const text = `Hi ${firstName},

Thanks for applying to SMOAC. After review, we are not moving this application forward.

Why:
${reason}

Your application and specialist login for this email have been removed. If you want to try again later, you can start a new specialist application with the same email:
${joinUrl}

— The SMOAC team`;

  const html = wrapTransactionalEmailHtml({
    preheader: "Your SMOAC specialist application was not approved",
    eyebrow: "Application closed",
    title: "We’re not moving this application forward",
    bodyHtml: renderEmailParagraphs([
      `Hi ${firstName},`,
      "Thanks for applying to SMOAC. After review, we are not moving this application forward.",
      `Why: ${reason}`,
      "Your application and specialist login for this email have been removed. You can start a fresh application with the same email whenever you’re ready.",
    ]),
    cta: {
      label: "Start a new application",
      href: joinUrl,
    },
    footerNote: "This decision closes the current application completely.",
  });

  return {
    to: application.email.trim(),
    subject: "SMOAC application update — application closed",
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

/** Notify specialist that their application was closed and the account removed. */
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

function clientWelcomeAlreadySent(email: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(
        `${CLIENT_WELCOME_EMAIL_SENT_PREFIX}${email.trim().toLowerCase()}`
      ) === "1"
    );
  } catch {
    return false;
  }
}

function markClientWelcomeSent(email: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${CLIENT_WELCOME_EMAIL_SENT_PREFIX}${email.trim().toLowerCase()}`,
      "1"
    );
  } catch {
    /* ignore quota */
  }
}

function buildClientWelcomeEmail(
  input: ClientWelcomeEmailInput
): Omit<ConfirmationEmailPayload, "applicationId" | "kind"> {
  const firstName = firstNameFromFullName(input.firstName?.trim() || "", "there");
  const exploreUrl = `${getSiteUrlForStripe()}/explore`;
  const dashboardUrl = `${getSiteUrlForStripe()}${CLIENT_DASHBOARD_PATH}`;

  const text = `Hi ${firstName},

Welcome to SMOAC — your account is ready.

Browse vetted wellness specialists near you, save favorites, and send inquiries when you’re ready to connect.

Explore specialists: ${exploreUrl}
Your dashboard: ${dashboardUrl}

Glad you’re here,
SMOAC`;

  const html = wrapTransactionalEmailHtml({
    preheader: "Welcome to SMOAC — your account is ready",
    eyebrow: "Welcome",
    title: "You’re in",
    bodyHtml: renderEmailParagraphs([
      `Hi ${firstName},`,
      "Welcome to SMOAC — your account is ready.",
      "Browse vetted wellness specialists near you, save favorites, and send inquiries when you’re ready to connect.",
    ]),
    cta: {
      label: "Explore specialists",
      href: exploreUrl,
    },
    footerNote: "You can edit your profile anytime from your dashboard.",
  });

  return {
    to: input.to.trim().toLowerCase(),
    subject: "Welcome to SMOAC — your account is ready",
    text,
    html,
  };
}

/**
 * Client Join Now / complete-account welcome.
 * Deduped per browser email so confirm-email → login doesn’t double-send.
 */
export async function sendClientWelcomeEmail(
  input: ClientWelcomeEmailInput
): Promise<ConfirmationEmailResult> {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return { success: false };
  }

  if (clientWelcomeAlreadySent(to)) {
    return { success: true, mode: "console" };
  }

  try {
    const payload = buildClientWelcomeEmail({ ...input, to });
    const result = await dispatchTransactionalEmail({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      kind: "confirmation_client",
    });
    if (result.success) {
      markClientWelcomeSent(to);
    }
    return result;
  } catch (error) {
    console.warn("[SMOAC EMAIL] Client welcome email failed", error);
    return { success: false };
  }
}
