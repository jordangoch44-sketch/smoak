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
  markLocalInquiryRead,
} from "@/lib/inquiry/inquiry-local-store";
import {
  labelForInquiryAction,
  isInquiryActionId,
  labelsForInquiryTopics,
} from "@/lib/inquiry-options";
import { markSpecialistInquiryNotificationRead } from "@/lib/inquiry/specialist-inquiry-notifications";

export interface ClientInquiryListItem {
  id: string;
  specialist: string;
  specialistId: string;
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

function previewFromBody(body: string): string {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const messageIdx = lines.findIndex((line) => /^message:?$/i.test(line));
  if (messageIdx >= 0) {
    const after = lines.slice(messageIdx + 1).join(" ").trim();
    if (after) return after.slice(0, 140);
  }
  return lines.slice(0, 2).join(" — ").slice(0, 140);
}

function conversationToLead(
  conversation: InquiryConversationRow,
  options: { unread: boolean; latestBody?: string }
): SpecialistLead {
  const action = isInquiryActionId(conversation.inquiry_action)
    ? labelForInquiryAction(conversation.inquiry_action)
    : conversation.inquiry_action;
  const topics = labelsForInquiryTopics(conversation.inquiry_topics);
  const topicBit = topics.length > 0 ? topics.slice(0, 2).join(", ") : action;
  const body = options.latestBody?.trim() || "";
  const messagePreview = body
    ? previewFromBody(body)
    : topicBit || "New inquiry";

  return {
    id: conversation.id,
    name: conversation.client_first_name || "Client",
    intent: topicBit || "New inquiry",
    receivedAt: relativeTime(conversation.last_message_at),
    unread: options.unread,
    clientEmail: conversation.client_email || "",
    actionLabel: action,
    topicLabels: topics,
    messagePreview,
    messageBody: body,
  };
}

async function fetchSpecialistConversations(
  supabase: SupabaseClient,
  specialistId: string
): Promise<
  {
    conversation: InquiryConversationRow;
    unread: boolean;
    latestBody: string;
  }[]
> {
  const { data, error } = await supabase
    .from("inquiry_conversations")
    .select("*")
    .eq("specialist_id", specialistId)
    .order("last_message_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  const rows = data as InquiryConversationRow[];
  const results: {
    conversation: InquiryConversationRow;
    unread: boolean;
    latestBody: string;
  }[] = [];

  for (const conversation of rows) {
    const { data: messages } = await supabase
      .from("inquiry_messages")
      .select("is_read, sender_role, body, created_at")
      .eq("conversation_id", conversation.id)
      .eq("sender_role", "client")
      .order("created_at", { ascending: false })
      .limit(5);

    const clientMessages = (messages as InquiryMessageRow[] | null) ?? [];
    const unread = clientMessages.some((m) => !m.is_read);
    results.push({
      conversation,
      unread,
      latestBody: clientMessages[0]?.body ?? "",
    });
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
      specialistId: conversation.specialist_id,
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
    return listLocalInquiriesForSpecialist(specialistId).map((record) => {
      const latest = [...record.messages]
        .reverse()
        .find((m) => m.sender_role === "client");
      return conversationToLead(record.conversation, {
        unread: record.messages.some(
          (m) => m.sender_role === "client" && !m.is_read
        ),
        latestBody: latest?.body,
      });
    });
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return [];
  const rows = await fetchSpecialistConversations(supabase, specialistId);
  return rows.map(({ conversation, unread, latestBody }) =>
    conversationToLead(conversation, { unread, latestBody })
  );
}

export async function markSpecialistInquiryRead(
  specialistId: string,
  conversationId: string
): Promise<void> {
  markSpecialistInquiryNotificationRead(specialistId, conversationId);

  if (!isMarketplaceSupabaseActive()) {
    markLocalInquiryRead(conversationId);
    return;
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;

  await supabase
    .from("inquiry_messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("sender_role", "client")
    .eq("is_read", false);
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
        specialistId: record.conversation.specialist_id,
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
