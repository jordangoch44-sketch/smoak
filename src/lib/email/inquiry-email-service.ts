import type { ConfirmationEmailResult } from "@/lib/email/confirmation-email-service";
import { dispatchTransactionalEmail } from "@/lib/email/email-transport";
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
    const topicLine =
      topics.length > 0
        ? topics.map((t) => `- ${t}`).join("\n")
        : "- (none selected)";
    const reviewLine = input.leaveReviewPath
      ? `\nAfter you connect, leave a SMOAC review (helps city rankings):\n${input.leaveReviewPath}\n`
      : "";
    const text = `Hi ${first},

Your inquiry was sent to ${input.specialistName}. They'll follow up with you by email.

Inquiry type: ${action}

Topics:
${topicLine}

${input.message.trim() ? `Your message:\n${input.message.trim()}\n\n` : ""}Open your messages: ${input.messagesPath}
${reviewLine}
Thank you,
SMOAC`;

    return await dispatchTransactionalEmail({
      to: input.to.trim().toLowerCase(),
      subject: `Inquiry sent to ${input.specialistName}`,
      text,
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
    const topicLine =
      topics.length > 0
        ? topics.map((t) => `- ${t}`).join("\n")
        : "- (general inquiry)";
    const message = input.message.trim();
    const text = `Hi ${input.specialistName.split(" ")[0] || "there"},

You have a new SMOAC inquiry from ${first}.

Reply to this client by email: ${clientEmail || "(email not provided)"}

Inquiry type: ${action}

Interested in:
${topicLine}

${message ? `Message:\n${message}\n\n` : ""}Open your specialist portal: ${input.dashboardPath}

SMOAC`;

    return await dispatchTransactionalEmail({
      to: input.to.trim().toLowerCase(),
      subject: `New SMOAC inquiry from ${first}`,
      text,
      kind: "inquiry_specialist",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Specialist inquiry notification failed", error);
    return { success: false };
  }
}
