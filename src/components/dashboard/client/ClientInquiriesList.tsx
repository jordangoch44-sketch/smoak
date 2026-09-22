"use client";

import type { ClientInquiryListItem } from "@/lib/inquiry/inquiry-inbox";
import { InquiryInboxPanel } from "@/components/inquiry/InquiryInboxPanel";

interface ClientInquiriesListProps {
  inquiries: ClientInquiryListItem[];
  userId: string;
  initialConversationId?: string | null;
  onConversationOpened?: (id: string) => void;
  onCloseThread?: () => void;
  onHideConversation?: (id: string) => void | Promise<void>;
  onMarkRead?: (ids: string[]) => void | Promise<void>;
  onMarkUnread?: (ids: string[]) => void | Promise<void>;
  onBack?: () => void;
}

export function ClientInquiriesList({
  inquiries,
  userId,
  initialConversationId,
  onConversationOpened,
  onCloseThread,
  onHideConversation,
  onMarkRead,
  onMarkUnread,
  onBack,
}: ClientInquiriesListProps) {
  return (
    <InquiryInboxPanel
      viewer="client"
      senderUserId={userId}
      variant="page"
      listTitle="Inquiries"
      initialConversationId={initialConversationId}
      emptyMessage="Inquiries you send to specialists appear here. They’ll reply in this thread."
      emptyActionHref="/explore"
      emptyActionLabel="Find a specialist"
      onOpenConversation={onConversationOpened}
      onCloseThread={onCloseThread}
      onHideConversation={onHideConversation}
      onMarkConversationsRead={onMarkRead}
      onMarkConversationsUnread={onMarkUnread}
      onExitPage={onBack}
      rows={inquiries.map((inquiry) => ({
        id: inquiry.id,
        name: inquiry.specialist,
        avatarUrl: inquiry.avatarUrl,
        preview: inquiry.messagePreview || inquiry.preview,
        time: inquiry.time,
        unread: inquiry.unread,
        topicLabels: inquiry.topicLabels,
      }))}
    />
  );
}
