import type { SupabaseClient } from "@supabase/supabase-js";
import type { InquiryConversationRow, InquiryMessageRow } from "@/types/inquiry";
import type { SpecialistLead } from "@/types/specialist-dashboard";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import {
  listLocalInquiriesForClient,
  listLocalInquiriesForSpecialist,
} from "@/lib/inquiry/inquiry-local-store";
import { labelForInquiryAction, isInquiryActionId } from "@/lib/inquiry-options";
import { labelsForInquiryTopics } from "@/lib/inquiry-options";

export interface ClientInquiryListItem {
  id: string;
  specialist: string;
  preview: string;
  time: string;
  unread: boolean;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function conversationToLead(
  conversation: InquiryConversationRow
): SpecialistLead {
  const action = isInquiryActionId(conversation.inquiry_action)
    ? labelForInquiryAction(conversation.inquiry_action)
    : conversation.inquiry_action;
  const topics = labelsForInquiryTopics(conversation.inquiry_topics);
  const topicBit = topics.length > 0 ? topics.slice(0, 2).join(", ") : action;
  return {
    id: conversation.id,
    name: conversation.client_first_name || "Client",
    intent: topicBit || "New inquiry",
    receivedAt: relativeTime(conversation.last_message_at),
  };
}

async function fetchSpecialistConversations(
  supabase: SupabaseClient,
  specialistId: string
): Promise<
  { conversation: InquiryConversationRow; unread: boolean }[]
> {
  const { data, error } = await supabase
    .from("inquiry_conversations")
    .select("*")
    .eq("specialist_id", specialistId)
    .order("last_message_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  const rows = data as InquiryConversationRow[];
  const results: { conversation: InquiryConversationRow; unread: boolean }[] =
    [];

  for (const conversation of rows) {
    const { data: messages } = await supabase
      .from("inquiry_messages")
      .select("is_read, sender_role")
      .eq("conversation_id", conversation.id)
      .eq("sender_role", "client")
      .order("created_at", { ascending: false })
      .limit(5);

    const unread = (messages as InquiryMessageRow[] | null)?.some(
      (m) => !m.is_read
    );
    results.push({ conversation, unread: Boolean(unread) });
  }

  return results;
}

async function fetchClientConversations(
  supabase: SupabaseClient,
  clientUserId: string
): Promise<ClientInquiryListItem[]> {
  const { data, error } = await supabase
    .from("inquiry_conversations")
    .select("*")
    .eq("client_user_id", clientUserId)
    .order("last_message_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return (data as InquiryConversationRow[]).map((conversation) => {
    const topics = labelsForInquiryTopics(conversation.inquiry_topics);
    return {
      id: conversation.id,
      specialist: conversation.specialist_name || "Specialist",
      preview:
        topics.length > 0
          ? topics.slice(0, 3).join(" · ")
          : conversation.inquiry_action,
      time: relativeTime(conversation.last_message_at),
      unread: false,
    };
  });
}

export async function loadSpecialistInquiryLeads(
  specialistId: string | null | undefined
): Promise<SpecialistLead[]> {
  if (!specialistId) return [];

  if (!isMarketplaceSupabaseActive()) {
    return listLocalInquiriesForSpecialist(specialistId).map((record) =>
      conversationToLead(record.conversation)
    );
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return [];
  const rows = await fetchSpecialistConversations(supabase, specialistId);
  return rows.map(({ conversation }) => conversationToLead(conversation));
}

export async function loadClientInquiryMessages(
  clientUserId: string | null | undefined
): Promise<ClientInquiryListItem[]> {
  if (!clientUserId) return [];

  if (!isMarketplaceSupabaseActive()) {
    return listLocalInquiriesForClient(clientUserId).map((record) => {
      const topics = labelsForInquiryTopics(
        record.conversation.inquiry_topics
      );
      return {
        id: record.conversation.id,
        specialist: record.conversation.specialist_name || "Specialist",
        preview:
          topics.length > 0
            ? topics.slice(0, 3).join(" · ")
            : record.conversation.inquiry_action,
        time: relativeTime(record.conversation.last_message_at),
        unread: record.messages.some(
          (m) => m.sender_role === "specialist" && !m.is_read
        ),
      };
    });
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return [];
  return fetchClientConversations(supabase, clientUserId);
}
