import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InquiryConversationRow,
  InquiryMessageRow,
  InquiryThreadPayload,
} from "@/types/inquiry";
import type { SpecialistLead } from "@/types/specialist-dashboard";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { resolveSpecialistListingAvatar } from "@/lib/inquiry/inquiry-avatars";
import { displayInquiryMessageBody } from "@/lib/inquiry/inquiry-message-body";
import { isDemoInquiryConversationId } from "@/lib/inquiry/inquiry-paths";
import {
  getLocalInquiryRecord,
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
import { isInquiryHidden, listHiddenInquiryIds } from "@/lib/inquiry/inquiry-hidden-store";

export interface ClientInquiryListItem {
  id: string;
  specialist: string;
  specialistId: string;
  /** List subtitle — message preview or topics */
  preview: string;
  time: string;
  unread: boolean;
  actionLabel: string;
  topicLabels: string[];
  messagePreview: string;
  messageBody: string;
  avatarUrl: string;
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
  const display = displayInquiryMessageBody(body);
  const lines = display
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.join(" ").slice(0, 140);
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
    messageBody: displayInquiryMessageBody(body),
    avatarUrl: conversation.client_avatar_url?.trim() ?? "",
    clientUserId: conversation.client_user_id?.trim() ?? "",
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
  const query = supabase
    .from("inquiry_conversations")
    .select("*")
    .eq("specialist_id", specialistId)
    .order("last_message_at", { ascending: false })
    .limit(20);

  let { data, error } = await query.is("specialist_hidden_at", null);

  if (error && /42703|column.*does not exist|PGRST204/i.test(error.message)) {
    const retry = await supabase
      .from("inquiry_conversations")
      .select("*")
      .eq("specialist_id", specialistId)
      .order("last_message_at", { ascending: false })
      .limit(20);
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) return [];

  const rows = (data as InquiryConversationRow[]).filter(
    (conversation) => !conversation.specialist_hidden_at
  );
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

function conversationToClientItem(
  conversation: InquiryConversationRow,
  options: { unread: boolean; latestBody?: string }
): ClientInquiryListItem {
  const action = isInquiryActionId(conversation.inquiry_action)
    ? labelForInquiryAction(conversation.inquiry_action)
    : conversation.inquiry_action;
  const topics = labelsForInquiryTopics(conversation.inquiry_topics);
  const body = options.latestBody?.trim() || "";
  const messagePreview = body
    ? previewFromBody(body)
    : topics.length > 0
      ? topics.slice(0, 3).join(" · ")
      : action;

  return {
    id: conversation.id,
    specialist: conversation.specialist_name || "Specialist",
    specialistId: conversation.specialist_id,
    preview: messagePreview,
    time: relativeTime(conversation.last_message_at),
    unread: options.unread,
    actionLabel: action,
    topicLabels: topics,
    messagePreview,
    messageBody: displayInquiryMessageBody(body),
    avatarUrl: resolveSpecialistListingAvatar(conversation.specialist_id),
  };
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

  const rows = data as InquiryConversationRow[];
  const results: ClientInquiryListItem[] = [];

  for (const conversation of rows) {
    const { data: messages } = await supabase
      .from("inquiry_messages")
      .select("is_read, sender_role, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(8);

    const list = (messages as InquiryMessageRow[] | null) ?? [];
    const latest = list[0];
    const unreadSpecialist = list.some(
      (m) => m.sender_role === "specialist" && !m.is_read
    );

    results.push(
      conversationToClientItem(conversation, {
        unread: unreadSpecialist,
        latestBody: latest?.body ?? "",
      })
    );
  }

  return results;
}

function threadFromRecord(
  conversation: InquiryConversationRow,
  messages: InquiryMessageRow[],
  canReply: boolean
): InquiryThreadPayload {
  const action = isInquiryActionId(conversation.inquiry_action)
    ? labelForInquiryAction(conversation.inquiry_action)
    : conversation.inquiry_action;
  return {
    conversationId: conversation.id,
    specialistId: conversation.specialist_id,
    specialistName: conversation.specialist_name || "Specialist",
    clientFirstName: conversation.client_first_name || "Client",
    clientAvatarUrl: conversation.client_avatar_url?.trim() ?? "",
    specialistAvatarUrl: resolveSpecialistListingAvatar(conversation.specialist_id),
    actionLabel: action,
    topicLabels: labelsForInquiryTopics(conversation.inquiry_topics),
    messages: messages.map((message) => ({
      id: message.id,
      senderRole: message.sender_role,
      body: displayInquiryMessageBody(message.body),
      createdAt: message.created_at,
    })),
    canReply,
  };
}

export function threadFromDemoLead(lead: SpecialistLead): InquiryThreadPayload {
  return {
    conversationId: lead.id,
    specialistId: "",
    specialistName: "You",
    clientFirstName: lead.name,
    clientAvatarUrl: lead.avatarUrl,
    specialistAvatarUrl: "",
    actionLabel: lead.actionLabel,
    topicLabels: lead.topicLabels,
    messages: lead.messageBody
      ? [
          {
            id: `${lead.id}-msg`,
            senderRole: "client",
            body: displayInquiryMessageBody(lead.messageBody),
            createdAt: new Date().toISOString(),
          },
        ]
      : [],
    canReply: false,
  };
}

export async function loadInquiryThread(
  conversationId: string
): Promise<InquiryThreadPayload | null> {
  if (!conversationId || isDemoInquiryConversationId(conversationId)) {
    return null;
  }

  if (!isMarketplaceSupabaseActive()) {
    const record = getLocalInquiryRecord(conversationId);
    if (!record) return null;
    return threadFromRecord(record.conversation, record.messages, true);
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return null;

  const { data: conversation, error } = await supabase
    .from("inquiry_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation) return null;

  const { data: messages } = await supabase
    .from("inquiry_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return threadFromRecord(
    conversation as InquiryConversationRow,
    (messages as InquiryMessageRow[] | null) ?? [],
    true
  );
}

export async function loadSpecialistInquiryLeads(
  specialistId: string | null | undefined
): Promise<SpecialistLead[]> {
  if (!specialistId) return [];

  if (!isMarketplaceSupabaseActive()) {
    return listLocalInquiriesForSpecialist(specialistId)
      .filter((record) => !record.conversation.specialist_hidden_at)
      .filter((record) => !isInquiryHidden(specialistId, record.conversation.id))
      .map((record) => {
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
  const hidden = new Set(listHiddenInquiryIds(specialistId));
  const rows = await fetchSpecialistConversations(supabase, specialistId);
  return rows
    .filter(({ conversation }) => !hidden.has(conversation.id))
    .map(({ conversation, unread, latestBody }) =>
      conversationToLead(conversation, { unread, latestBody })
    );
}

export async function markInquiryThreadRead(
  conversationId: string,
  readerRole: "client" | "specialist"
): Promise<void> {
  const counterpart = readerRole === "client" ? "specialist" : "client";

  if (!isMarketplaceSupabaseActive()) {
    markLocalInquiryRead(conversationId, readerRole);
    return;
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;

  await supabase
    .from("inquiry_messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("sender_role", counterpart)
    .eq("is_read", false);
}

export async function markSpecialistInquiryRead(
  specialistId: string,
  conversationId: string
): Promise<void> {
  markSpecialistInquiryNotificationRead(specialistId, conversationId);
  await markInquiryThreadRead(conversationId, "specialist");
}

/** Mark every unread client message for this specialist as read (banner dismiss). */
export async function markAllSpecialistInquiriesRead(
  specialistId: string,
  conversationIds: readonly string[]
): Promise<void> {
  const ids = [...new Set(conversationIds.filter(Boolean))];
  if (!specialistId || ids.length === 0) return;

  await Promise.all(
    ids.map((conversationId) =>
      markSpecialistInquiryRead(specialistId, conversationId)
    )
  );
}

export async function loadClientInquiryMessages(
  clientUserId: string | null | undefined
): Promise<ClientInquiryListItem[]> {
  if (!clientUserId) return [];

  if (!isMarketplaceSupabaseActive()) {
    return listLocalInquiriesForClient(clientUserId).map((record) => {
      const latest = [...record.messages].reverse()[0];
      return conversationToClientItem(record.conversation, {
        unread: record.messages.some(
          (m) => m.sender_role === "specialist" && !m.is_read
        ),
        latestBody: latest?.body,
      });
    });
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return [];
  return fetchClientConversations(supabase, clientUserId);
}
