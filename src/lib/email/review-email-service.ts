import type { ConfirmationEmailResult } from "@/lib/email/confirmation-email-service";
import { dispatchTransactionalEmail } from "@/lib/email/email-transport";
import {
  renderEmailDetailRows,
  renderEmailParagraphs,
  renderEmailQuote,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";

export interface SpecialistReviewNotificationEmailInput {
  to: string;
  specialistName: string;
  authorDisplayName: string;
  rating: number;
  reviewText: string;
  profilePath: string;
  dashboardPath: string;
}

export async function sendSpecialistReviewNotificationEmail(
  input: SpecialistReviewNotificationEmailInput
): Promise<ConfirmationEmailResult> {
  try {
    const specialistFirst =
      input.specialistName.trim().split(/\s+/)[0] || "there";
    const author = input.authorDisplayName.trim() || "A SMOAC client";
    const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
    const review = input.reviewText.trim();

    const text = `Hi ${specialistFirst},

You received a new SMOAC client review — it is live on your profile now and counts toward city rankings.

Rating: ${input.rating}/5 (${stars})
From: ${author}

${review ? `Review:\n${review}\n\n` : ""}View your profile: ${input.profilePath}
Open your specialist portal: ${input.dashboardPath}

SMOAC`;

    const bodyHtml = [
      renderEmailParagraphs([
        `Hi ${specialistFirst},`,
        `${author} left a new SMOAC review on your profile. It is published immediately and updates your marketplace rating and rankings.`,
      ]),
      renderEmailDetailRows([
        { label: "Rating", value: `${input.rating} / 5` },
        { label: "Client", value: author },
      ]),
      renderEmailQuote("Review", review),
    ].join("");

    const html = wrapTransactionalEmailHtml({
      preheader: `New ${input.rating}-star SMOAC review from ${author}`,
      eyebrow: "New client review",
      title: `${author} reviewed you`,
      bodyHtml,
      cta: {
        label: "View your profile",
        href: input.profilePath,
      },
      secondaryLink: {
        label: "Open specialist portal",
        href: input.dashboardPath,
      },
      footerNote:
        "SMOAC reviews are from verified client accounts and appear on your public profile.",
    });

    return await dispatchTransactionalEmail({
      to: input.to.trim().toLowerCase(),
      subject: `New SMOAC review — ${input.rating} stars from ${author}`,
      text,
      html,
      kind: "review_specialist",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Specialist review notification failed", error);
    return { success: false };
  }
}
