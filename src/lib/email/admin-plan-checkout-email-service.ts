/**
 * Email a specialist a Stripe Checkout link created by an admin.
 */
import { dispatchTransactionalEmail } from "@/lib/email/email-transport";
import {
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";

export interface AdminPlanCheckoutEmailInput {
  to: string;
  firstName: string;
  planLabel: string;
  checkoutUrl: string;
}

export async function sendAdminPlanCheckoutEmail(
  input: AdminPlanCheckoutEmailInput
): Promise<{ success: boolean; mode: "resend" | "console" }> {
  const name = input.firstName.trim() || "there";
  const subject = `SMOAC — complete your ${input.planLabel} checkout`;
  const text = `Hi ${name},

An admin invited you to switch to ${input.planLabel}.

Complete checkout here:
${input.checkoutUrl}

This secure Stripe link is unique to your account. If you did not expect this email, you can ignore it.

— SMOAC`;

  const html = wrapTransactionalEmailHtml({
    preheader: `Complete your ${input.planLabel} checkout`,
    eyebrow: "Membership",
    title: `Switch to ${input.planLabel}`,
    bodyHtml: renderEmailParagraphs([
      `Hi ${name},`,
      `An admin invited you to switch to ${input.planLabel}. Use the button below to complete secure checkout.`,
    ]),
    cta: { label: `Continue to ${input.planLabel}`, href: input.checkoutUrl },
    footerNote: "This Stripe link is unique to your SMOAC account.",
  });

  return dispatchTransactionalEmail({
    to: input.to,
    subject,
    text,
    html,
    kind: "admin_plan_checkout",
  });
}
