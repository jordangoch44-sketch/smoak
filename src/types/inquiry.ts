import type { InquiryActionId, InquiryTopicId } from "@/lib/inquiry-options";

export interface InquiryConversationRow {
  id: string;
  client_user_id: string;
  specialist_id: string;
  specialist_user_id: string | null;
  specialist_name: string;
  inquiry_action: string;
  inquiry_topics: string[];
  source: string;
  client_first_name: string;
  client_email: string;
  /** Snapshot of the client's avatar at last client send (optional until migrated). */
  client_avatar_url?: string;
  /** Specialist inbox hide — client still has the thread. */
  specialist_hidden_at?: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface InquiryMessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_role: "client" | "specialist";
  body: string;
  inquiry_action: string | null;
  inquiry_topics: string[];
  is_read: boolean;
  created_at: string;
}

export interface SubmitInquiryInput {
  specialistId: string;
  specialistName: string;
  inquiryAction: InquiryActionId;
  inquiryTopics: InquiryTopicId[];
  message: string;
  clientUserId: string;
  clientFirstName: string;
  clientEmail: string;
  /** Optional snapshot for local/dev inboxes */
  clientAvatarUrl?: string;
  /** Optional client-side idempotency token to block double-submit */
  idempotencyKey?: string;
}

export interface SubmitInquiryReplyInput {
  conversationId: string;
  message: string;
}

export type SubmitInquiryReplyResult =
  | {
      ok: true;
      conversationId: string;
      messageId: string;
      emailMode?: "resend" | "console";
    }
  | { ok: false; message: string };

export interface InquiryThreadMessage {
  id: string;
  senderRole: "client" | "specialist";
  body: string;
  createdAt: string;
}

export interface InquiryThreadPayload {
  conversationId: string;
  specialistId: string;
  specialistName: string;
  clientFirstName: string;
  clientAvatarUrl: string;
  specialistAvatarUrl: string;
  actionLabel: string;
  topicLabels: string[];
  messages: InquiryThreadMessage[];
  canReply: boolean;
}

export type SubmitInquiryResult =
  | {
      ok: true;
      conversationId: string;
      messageId: string;
      /** Email transport used for confirmation / specialist notify */
      emailMode?: "resend" | "console";
      specialistEmailSent?: boolean;
    }
  | { ok: false; message: string };
