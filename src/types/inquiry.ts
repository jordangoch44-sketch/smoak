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
  /** Optional client-side idempotency token to block double-submit */
  idempotencyKey?: string;
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
