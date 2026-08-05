import type { ConfirmationEmailResult } from "@/lib/email/confirmation-email-service";
import { dispatchTransactionalEmail } from "@/lib/email/email-transport";
import {
  renderEmailDetailRows,
  renderEmailParagraphs,
  renderEmailQuote,
  renderEmailTextLink,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import {
  labelsForInquiryTopics,
  labelForInquiryAction,
  type InquiryActionId,
} from "@/lib/inquiry-options";

export interface InquiryClientEmailInput {
  to: string;
  clientFirstName: string;
  specialistName: string;
  inquiryAction: InquiryActionId;
  inquiryTopics: string[];
  message: string;
  messagesPath: string;
  /** Profile deep-link that opens the leave-review modal */
  leaveReviewPath?: string;
}

export interface InquirySpecialistEmailInput {
  to: string;
  clientFirstName: string;
  clientEmail: string;
  specialistName: string;
  inquiryAction: InquiryActionId;
  inquiryTopics: string[];
  message: string;
  dashboardPath: string;
}

export async function sendInquiryClientConfirmationEmail(
  input: InquiryClientEmailInput
): Promise<ConfirmationEmailResult> {
  try {
    const first = input.clientFirstName.trim() || "there";
    const topics = labelsForInquiryTopics(input.inquiryTopics);
    const action = labelForInquiryAction(input.inquiryAction);
    const topicText =
      topics.length > 0 ? topics.join(", ") : "None selected";
    const message = input.message.trim();

    const text = `Hi ${first},

Your inquiry was sent to ${input.specialistName}. They'll follow up with you by email.

Inquiry type: ${action}
Topics: ${topicText}

${message ? `Your message:\n${message}\n\n` : ""}Open your inquiries: ${input.messagesPath}
${
  input.leaveReviewPath
    ? `\nAfter you connect, leave a SMOAC review:\n${input.leaveReviewPath}\n`
    : ""
}
Thank you,
SMOAC`;

    const bodyHtml = [
      renderEmailParagraphs([
        `Hi ${first},`,
        `Your inquiry was sent to ${input.specialistName}. They’ll follow up with you by email.`,
      ]),
      renderEmailDetailRows([
        { label: "Inquiry", value: action },
        { label: "Topics", value: topicText },
      ]),
      renderEmailQuote("Your message", message),
      input.leaveReviewPath
        ? renderEmailParagraphs([
            "After you connect, you’re welcome to leave a SMOAC review — it helps city rankings and other clients choose with confidence.",
          ]) +
          renderEmailTextLink("Leave a SMOAC review", input.leaveReviewPath)
        : "",
    ].join("");

    const html = wrapTransactionalEmailHtml({
      preheader: `Inquiry sent to ${input.specialistName}`,
      eyebrow: "Inquiry confirmation",
      title: "Inquiry sent",
      bodyHtml,
      cta: {
        label: "View your inquiry",
        href: input.messagesPath,
      },
      footerNote:
        "Specialists reply by email. Your inquiry history stays in your SMOAC dashboard.",
    });

    return await dispatchTransactionalEmail({
      to: input.to.trim().toLowerCase(),
      subject: `Inquiry sent to ${input.specialistName}`,
      text,
      html,
      kind: "inquiry_client",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Client inquiry confirmation failed", error);
    return { success: false };
  }
}

export async function sendInquirySpecialistNotificationEmail(
  input: InquirySpecialistEmailInput
): Promise<ConfirmationEmailResult> {
  try {
    const first = input.clientFirstName.trim() || "A client";
    const clientEmail = input.clientEmail.trim().toLowerCase();
    const topics = labelsForInquiryTopics(input.inquiryTopics);
    const action = labelForInquiryAction(input.inquiryAction);
    const topicText =
      topics.length > 0 ? topics.join(", ") : "General inquiry";
    const message = input.message.trim();
    const specialistFirst =
      input.specialistName.trim().split(/\s+/)[0] || "there";

    const text = `Hi ${specialistFirst},

You have a new SMOAC inquiry from ${first}.

Reply to this client by email: ${clientEmail || "(email not provided)"}

Inquiry type: ${action}
Interested in: ${topicText}

${message ? `Message:\n${message}\n\n` : ""}Open your specialist portal: ${input.dashboardPath}

SMOAC`;

    const bodyHtml = [
      renderEmailParagraphs([
        `Hi ${specialistFirst},`,
        `You have a new inquiry from ${first}. Reply by email to start the conversation.`,
      ]),
      renderEmailDetailRows([
        { label: "Client", value: first },
        {
          label: "Reply to",
          value: clientEmail || "Email not provided",
        },
        { label: "Inquiry", value: action },
        { label: "Interested in", value: topicText },
      ]),
      renderEmailQuote("Message", message),
    ].join("");

    const html = wrapTransactionalEmailHtml({
      preheader: `New inquiry from ${first}`,
      eyebrow: "New client inquiry",
      title: `${first} reached out`,
      bodyHtml,
      cta: {
        label: "Open specialist portal",
        href: input.dashboardPath,
      },
      secondaryLink: clientEmail
        ? { label: `Email ${first}`, href: `mailto:${clientEmail}` }
        : undefined,
      footerNote: "Reply promptly — clients often compare a few specialists.",
    });

    return await dispatchTransactionalEmail({
      to: input.to.trim().toLowerCase(),
      subject: `New SMOAC inquiry from ${first}`,
      text,
      html,
      kind: "inquiry_specialist",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Specialist inquiry notification failed", error);
    return { success: false };
  }
}
