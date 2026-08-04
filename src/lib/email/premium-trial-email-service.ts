/**
 * Complimentary Pro trial lifecycle emails — day 10, day 20, and last-day warning.
 */
import { dispatchTransactionalEmail } from "@/lib/email/email-transport";
import {
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import { SMOAC_PRO_PRICE_LABEL } from "@/lib/specialist-premium";
import { getSiteUrlForStripe } from "@/lib/stripe/config";

export type PremiumTrialReminderKind =
  | "day10"
  | "day20"
  | "last_day";

export interface PremiumTrialReminderInput {
  to: string;
  firstName: string;
  daysRemaining: number;
  kind: PremiumTrialReminderKind;
}

function dashboardUpgradeUrl(): string {
  return `${getSiteUrlForStripe()}/specialist-dashboard?promo=pro`;
}

function greeting(firstName: string): string {
  const name = firstName.trim() || "there";
  return `Hi ${name},`;
}

function buildDay10(input: PremiumTrialReminderInput) {
  const days = Math.max(0, input.daysRemaining);
  const upgradeUrl = dashboardUpgradeUrl();
  const subject = `SMOAC Pro trial — ${days} day${days === 1 ? "" : "s"} left`;
  const text = `${greeting(input.firstName)}

You're 10 days into your complimentary SMOAC Pro month.

You have about ${days} day${days === 1 ? "" : "s"} left of full analytics, ranking intelligence, and growth insights.

When the trial ends, your account returns to Free and Pro insights lock away unless you upgrade to Pro (${SMOAC_PRO_PRICE_LABEL}).

Upgrade anytime:
${upgradeUrl}

— SMOAC`;

  const html = wrapTransactionalEmailHtml({
    preheader: `${days} days left on your free Pro month`,
    eyebrow: "Pro trial",
    title: `${days} days left on Pro`,
    bodyHtml: renderEmailParagraphs([
      greeting(input.firstName),
      "You're 10 days into your complimentary SMOAC Pro month.",
      `You have about ${days} day${days === 1 ? "" : "s"} left of full analytics, ranking intelligence, and growth insights.`,
      `When the trial ends, you return to Free and Pro insights lock away unless you upgrade (${SMOAC_PRO_PRICE_LABEL}).`,
    ]),
    cta: { label: `Upgrade to Pro · ${SMOAC_PRO_PRICE_LABEL}`, href: upgradeUrl },
    footerNote: "One-time free month — cancel anytime after you upgrade.",
  });

  return { subject, text, html, kind: "premium_trial_day10" as const };
}

function buildDay20(input: PremiumTrialReminderInput) {
  const days = Math.max(0, input.daysRemaining);
  const upgradeUrl = dashboardUpgradeUrl();
  const subject = `SMOAC Pro trial — ${days} day${days === 1 ? "" : "s"} left`;
  const text = `${greeting(input.firstName)}

You're 20 days into your complimentary SMOAC Pro month.

About ${days} day${days === 1 ? "" : "s"} remain. Keep ranking intelligence, engagement metrics, and growth insights by upgrading before the trial ends.

Without Pro, those analytics lock and you return to the Free plan.

Upgrade:
${upgradeUrl}

— SMOAC`;

  const html = wrapTransactionalEmailHtml({
    preheader: `${days} days left — upgrade to keep Pro insights`,
    eyebrow: "Pro trial",
    title: `${days} days left on Pro`,
    bodyHtml: renderEmailParagraphs([
      greeting(input.firstName),
      "You're 20 days into your complimentary SMOAC Pro month.",
      `About ${days} day${days === 1 ? "" : "s"} remain of full analytics and growth insights.`,
      "Without an upgrade, those Pro insights lock and your account returns to Free.",
    ]),
    cta: { label: `Upgrade to Pro · ${SMOAC_PRO_PRICE_LABEL}`, href: upgradeUrl },
    footerNote: "Paid Pro keeps your analytics and marketplace perks.",
  });

  return { subject, text, html, kind: "premium_trial_day20" as const };
}

function buildLastDay(input: PremiumTrialReminderInput) {
  const upgradeUrl = dashboardUpgradeUrl();
  const subject = "LAST CHANCE — your SMOAC Pro trial ends today";
  const text = `${greeting(input.firstName)}

This is your final notice — your complimentary SMOAC Pro month ends today.

Without upgrading:
• Full Pro analytics and growth insights lock away
• Ranking intelligence and engagement metrics return to Free
• Marketplace Pro perks end

Upgrade now to keep your Pro stats and perks (${SMOAC_PRO_PRICE_LABEL}):
${upgradeUrl}

If you don't upgrade, your account moves to Free after today.

— SMOAC`;

  const html = wrapTransactionalEmailHtml({
    preheader: "Last chance — Pro trial ends today",
    eyebrow: "Last chance",
    title: "Your Pro trial ends today",
    bodyHtml: renderEmailParagraphs([
      greeting(input.firstName),
      "This is your final notice — your complimentary SMOAC Pro month ends today.",
      "Without upgrading, Pro analytics, ranking intelligence, engagement metrics, and marketplace Pro perks lock away as you return to Free.",
      `Upgrade now to keep your Pro stats and perks (${SMOAC_PRO_PRICE_LABEL}).`,
    ]),
    cta: {
      label: `LAST CHANCE — Upgrade · ${SMOAC_PRO_PRICE_LABEL}`,
      href: upgradeUrl,
    },
    footerNote: "No upgrade today → Free plan after your trial ends.",
  });

  return { subject, text, html, kind: "premium_trial_last_day" as const };
}

export async function sendPremiumTrialReminderEmail(
  input: PremiumTrialReminderInput
): Promise<{ success: boolean }> {
  try {
    const built =
      input.kind === "day10"
        ? buildDay10(input)
        : input.kind === "day20"
          ? buildDay20(input)
          : buildLastDay(input);

    return await dispatchTransactionalEmail({
      to: input.to,
      subject: built.subject,
      text: built.text,
      html: built.html,
      kind: built.kind,
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Premium trial reminder failed", {
      kind: input.kind,
      error,
    });
    return { success: false };
  }
}
