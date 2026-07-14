import type { ConfirmationEmailResult } from "@/lib/email/confirmation-email-service";
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
}

export interface InquirySpecialistEmailInput {
  to: string;
  clientFirstName: string;
  specialistName: string;
  inquiryAction: InquiryActionId;
  inquiryTopics: string[];
  dashboardPath: string;
}

interface InquiryEmailPayload {
  to: string;
  subject: string;
  text: string;
  kind: "inquiry_client" | "inquiry_specialist";
}

/**
 * Placeholder transport — mirrors confirmation-email-service.
 * Wire RESEND_API_KEY / SendGrid / Edge Function when ready.
 */
async function dispatchInquiryEmail(
  payload: InquiryEmailPayload
): Promise<ConfirmationEmailResult> {
  console.info("[SMOAC EMAIL TEST] Inquiry email queued", {
    kind: payload.kind,
    to: payload.to,
    subject: payload.subject,
    bodyPreview: payload.text.split("\n").slice(0, 4).join(" "),
  });
  return { success: true };
}

export async function sendInquiryClientConfirmationEmail(
  input: InquiryClientEmailInput
): Promise<ConfirmationEmailResult> {
  try {
    const first = input.clientFirstName.trim() || "there";
    const topics = labelsForInquiryTopics(input.inquiryTopics);
    const action = labelForInquiryAction(input.inquiryAction);
    const topicLine =
      topics.length > 0 ? topics.map((t) => `- ${t}`).join("\n") : "- (none selected)";
    const text = `Hi ${first},

Your message was sent to ${input.specialistName}.

Inquiry type: ${action}

Topics:
${topicLine}

${input.message.trim() ? `Your message:\n${input.message.trim()}\n\n` : ""}Open your messages: ${input.messagesPath}

Thank you,
SMOAC`;

    return await dispatchInquiryEmail({
      to: input.to.trim().toLowerCase(),
      subject: `Message sent to ${input.specialistName}`,
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
    const topics = labelsForInquiryTopics(input.inquiryTopics);
    const action = labelForInquiryAction(input.inquiryAction);
    const topicLine =
      topics.length > 0 ? topics.map((t) => `- ${t}`).join("\n") : "- (general inquiry)";
    const text = `Hi ${input.specialistName.split(" ")[0] || "there"},

You have a new inquiry from ${first}.

Inquiry type: ${action}

Interested in:
${topicLine}

Open your dashboard: ${input.dashboardPath}

SMOAC`;

    return await dispatchInquiryEmail({
      to: input.to.trim().toLowerCase(),
      subject: `New inquiry from ${first}`,
      text,
      kind: "inquiry_specialist",
    });
  } catch (error) {
    console.warn("[SMOAC EMAIL] Specialist inquiry notification failed", error);
    return { success: false };
  }
}
