import {
  INQUIRY_MESSAGE_MAX_LENGTH,
  isInquiryActionId,
  labelForInquiryAction,
  labelsForInquiryTopics,
} from "@/lib/inquiry-options";

/** Preserve line breaks for thread replies; cap length. */
export function sanitizeThreadMessage(message: string): string {
  return message
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, INQUIRY_MESSAGE_MAX_LENGTH);
}

export function validateThreadMessage(
  message: string
): { ok: true; message: string } | { ok: false; message: string } {
  const sanitized = sanitizeThreadMessage(message);
  if (!sanitized) {
    return { ok: false, message: "Write a message to send." };
  }
  return { ok: true, message: sanitized };
}

/** Body stored on the first client message — the actual note, not an email template. */
export function composeInquiryThreadBody(input: {
  inquiryAction: string;
  inquiryTopics: string[];
  message: string;
}): string {
  const message = sanitizeThreadMessage(input.message);
  if (message) return message;
  const topics = labelsForInquiryTopics(input.inquiryTopics);
  if (topics.length > 0) {
    return `I'm interested in ${topics.join(", ")}.`;
  }
  const action = isInquiryActionId(input.inquiryAction)
    ? labelForInquiryAction(input.inquiryAction)
    : input.inquiryAction.trim();
  return action
    ? `Hi — I'd like to connect (${action.toLowerCase()}).`
    : "Hi, I'd like to connect.";
}

/** Show the client's note from legacy formatted inquiry blobs. */
export function displayInquiryMessageBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (/^New inquiry from /i.test(trimmed) && /\nMessage:\n/i.test(trimmed)) {
    const after = trimmed.split(/\nMessage:\n/i).slice(1).join("\n").trim();
    if (after) return after;
  }
  return trimmed;
}
