import type { ConfirmationEmailResult } from "@/lib/email/confirmation-email-service";
import { dispatchTransactionalEmail } from "@/lib/email/email-transport";
import {
  renderEmailDetailRows,
  renderEmailParagraphs,
  renderEmailQuote,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import {
  labelsForInquiryTopics,
  labelForInquiryAction,
  type InquiryActionId,
} from "@/lib/inquiry-options";

export interface InquiryReceivedEmailInput {
  to: string;
  kind: "inquiry_client" | "inquiry_specialist";
  recipientFirstName: string;
  senderName: string;
  message: string;
  threadPath: string;
  inquiryAction?: InquiryActionId;
  inquiryTopics?: string[];
}

/** Notify the recipient that a new SMOAC thread message is waiting. */
export async function sendInquiryMessageReceivedEmail(
  input: InquiryReceivedEmailInput
): Promise<ConfirmationEmailResult> {
  try {
    const recipient = input.recipientFirstName.trim() || "there";
    const sender = input.senderName.trim() || "Someone";
    const message = input.message.trim();
    const action =
      input.inquiryAction != null
        ? labelForInquiryAction(input.inquiryAction)
        : "";
    const topics = labelsForInquiryTopics(input.inquiryTopics ?? []);
    const topicText = topics.length > 0 ? topics.join(", ") : "";
    const isSpecialist = input.kind === "inquiry_specialist";

    const text = `Hi ${recipient},

${sender} sent you a new message on SMOAC.

${action ? `Inquiry: ${action}\n` : ""}${topicText ? `Topics: ${topicText}\n` : ""}${
      message ? `\nMessage:\n${message}\n` : ""
    }
Open the conversation: ${input.threadPath}

Reply in SMOAC so the full thread stays in one place.

SMOAC`;

    const bodyHtml = [
      renderEmailParagraphs([
        `Hi ${recipient},`,
        `${sender} sent you a new message on SMOAC. Open the conversation to read and reply.`,
      ]),
      renderEmailDetailRows(
        [
          { label: "From", value: sender },
          action ? { label: "Inquiry", value: action } : null,
          topicText ? { label: "Topics", value: topicText } : null,
        ].filter((row): row is { label: string; value: string } => row != null)
      ),
      renderEmailQuote("Message", message),
    ].join("");

    const html = wrapTransactionalEmailHtml({
      preheader: `New message from ${sender}`,
      eyebrow: isSpecialist ? "New client message" : "New specialist message",
      title: `${sender} sent a message`,
      bodyHtml,
      cta: {
        label: "Open conversation",
        href: input.threadPath,
      },
      footerNote:
        "Reply in SMOAC to keep the conversation in one thread. This email is a notification only.",
    });

    return await dispatchTransactionalEmail({
      to: input.to.trim().toLowerCase(),
      subject: `New SMOAC message from ${sender}`,
      text,
      html,
      kind: input.kind,
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Inquiry message notify failed", error);
    return { success: false };
  }
}
