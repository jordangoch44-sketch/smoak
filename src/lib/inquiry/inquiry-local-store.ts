import type {
  InquiryConversationRow,
  InquiryMessageRow,
  SubmitInquiryInput,
} from "@/types/inquiry";
import {
  labelsForInquiryTopics,
  labelForInquiryAction,
  isInquiryActionId,
} from "@/lib/inquiry-options";
import {
  sanitizeInquiryMessage,
  validateInquiryDraft,
} from "@/lib/pending-inquiry-storage";
import { LOCAL_INQUIRIES_STORAGE_KEY } from "@/lib/dev-storage-keys";

export interface LocalInquiryRecord {
  conversation: InquiryConversationRow;
  messages: InquiryMessageRow[];
}

function readLocalAll(): LocalInquiryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_INQUIRIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalInquiryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAll(records: LocalInquiryRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LOCAL_INQUIRIES_STORAGE_KEY,
    JSON.stringify(records)
  );
}

export function formatInquiryMessageBody(input: {
  inquiryAction: string;
  inquiryTopics: string[];
  message: string;
  clientFirstName: string;
}): string {
  const actionLabel = isInquiryActionId(input.inquiryAction)
    ? labelForInquiryAction(input.inquiryAction)
    : input.inquiryAction;
  const topicLabels = labelsForInquiryTopics(input.inquiryTopics);
  const lines = [
    `New inquiry from ${input.clientFirstName.trim() || "a client"}`,
    "",
    `Interested in: ${actionLabel}`,
  ];
  if (topicLabels.length > 0) {
    lines.push("");
    lines.push("Topics:");
    for (const label of topicLabels) {
      lines.push(`- ${label}`);
    }
  }
  const message = sanitizeInquiryMessage(input.message);
  if (message) {
    lines.push("");
    lines.push("Message:");
    lines.push(message);
  }
  return lines.join("\n");
}

export function saveLocalInquiry(
  input: SubmitInquiryInput
): { conversationId: string; messageId: string } {
  const validation = validateInquiryDraft(input);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const now = new Date().toISOString();
  const all = readLocalAll();
  let record = all.find(
    (row) =>
      row.conversation.client_user_id === input.clientUserId &&
      row.conversation.specialist_id === input.specialistId
  );

  if (!record) {
    const conversationId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `local-conv-${Date.now()}`;
    record = {
      conversation: {
        id: conversationId,
        client_user_id: input.clientUserId,
        specialist_id: input.specialistId,
        specialist_user_id: null,
        specialist_name: input.specialistName,
        inquiry_action: input.inquiryAction,
        inquiry_topics: [...input.inquiryTopics],
        source: "specialist_profile",
        client_first_name: input.clientFirstName,
        client_email: input.clientEmail,
        last_message_at: now,
        created_at: now,
        updated_at: now,
      },
      messages: [],
    };
    all.unshift(record);
  } else {
    record.conversation.inquiry_action = input.inquiryAction;
    record.conversation.inquiry_topics = [...input.inquiryTopics];
    record.conversation.client_first_name = input.clientFirstName;
    record.conversation.client_email = input.clientEmail;
    record.conversation.specialist_name = input.specialistName;
    record.conversation.last_message_at = now;
    record.conversation.updated_at = now;
  }

  const messageId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `local-msg-${Date.now()}`;

  record.messages.push({
    id: messageId,
    conversation_id: record.conversation.id,
    sender_user_id: input.clientUserId,
    sender_role: "client",
    body: formatInquiryMessageBody(input),
    inquiry_action: input.inquiryAction,
    inquiry_topics: [...input.inquiryTopics],
    is_read: false,
    created_at: now,
  });

  writeLocalAll(all);
  return { conversationId: record.conversation.id, messageId };
}

export function listLocalInquiriesForSpecialist(
  specialistId: string
): LocalInquiryRecord[] {
  return readLocalAll().filter(
    (row) => row.conversation.specialist_id === specialistId
  );
}

export function listLocalInquiriesForClient(
  clientUserId: string
): LocalInquiryRecord[] {
  return readLocalAll().filter(
    (row) => row.conversation.client_user_id === clientUserId
  );
}
