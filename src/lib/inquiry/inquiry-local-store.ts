import type {
  InquiryConversationRow,
  InquiryMessageRow,
  SubmitInquiryInput,
} from "@/types/inquiry";
import { composeInquiryThreadBody } from "@/lib/inquiry/inquiry-message-body";
import { validateInquiryDraft } from "@/lib/pending-inquiry-storage";
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
        client_avatar_url: input.clientAvatarUrl?.trim() ?? "",
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
    record.conversation.client_avatar_url =
      input.clientAvatarUrl?.trim() || record.conversation.client_avatar_url;
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
    body: composeInquiryThreadBody(input),
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
    (row) =>
      row.conversation.specialist_id === specialistId &&
      !row.conversation.specialist_hidden_at
  );
}

export function listLocalInquiriesForClient(
  clientUserId: string
): LocalInquiryRecord[] {
  return readLocalAll().filter(
    (row) => row.conversation.client_user_id === clientUserId
  );
}

export function getLocalInquiryRecord(
  conversationId: string
): LocalInquiryRecord | null {
  return (
    readLocalAll().find((row) => row.conversation.id === conversationId) ?? null
  );
}

export function saveLocalReply(input: {
  conversationId: string;
  senderUserId: string;
  senderRole: "client" | "specialist";
  message: string;
}): { conversationId: string; messageId: string } | null {
  const all = readLocalAll();
  const record = all.find((row) => row.conversation.id === input.conversationId);
  if (!record) return null;

  const now = new Date().toISOString();
  const messageId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `local-msg-${Date.now()}`;

  record.conversation.last_message_at = now;
  record.conversation.updated_at = now;
  record.messages.push({
    id: messageId,
    conversation_id: record.conversation.id,
    sender_user_id: input.senderUserId,
    sender_role: input.senderRole,
    body: input.message,
    inquiry_action: null,
    inquiry_topics: [],
    is_read: false,
    created_at: now,
  });
  writeLocalAll(all);
  return { conversationId: record.conversation.id, messageId };
}

export function markLocalInquiryRead(
  conversationId: string,
  readerRole: "client" | "specialist" = "specialist"
): void {
  const counterpart = readerRole === "client" ? "specialist" : "client";
  const all = readLocalAll();
  let changed = false;
  for (const record of all) {
    if (record.conversation.id !== conversationId) continue;
    for (const message of record.messages) {
      if (message.sender_role === counterpart && !message.is_read) {
        message.is_read = true;
        changed = true;
      }
    }
  }
  if (changed) writeLocalAll(all);
}

export function hideLocalInquiryForSpecialist(conversationId: string): void {
  const all = readLocalAll();
  const record = all.find((row) => row.conversation.id === conversationId);
  if (!record) return;
  record.conversation.specialist_hidden_at = new Date().toISOString();
  record.conversation.updated_at = new Date().toISOString();
  writeLocalAll(all);
}
