"use client";

import type { ClientInquiryListItem } from "@/lib/inquiry/inquiry-inbox";
import { InquiryInboxPanel } from "@/components/inquiry/InquiryInboxPanel";
import {
  DashboardSection,
} from "@/components/dashboard/shared";

interface ClientInquiriesListProps {
  inquiries: ClientInquiryListItem[];
  userId: string;
  initialConversationId?: string | null;
  onConversationOpened?: (id: string) => void;
  onCloseThread?: () => void;
}

export function ClientInquiriesList({
  inquiries,
  userId,
  initialConversationId,
  onConversationOpened,
  onCloseThread,
}: ClientInquiriesListProps) {
  return (
    <DashboardSection
      title="Inquiries"
      description="Tap a specialist to open the conversation."
    >
      <InquiryInboxPanel
        viewer="client"
        senderUserId={userId}
        initialConversationId={initialConversationId}
        emptyMessage="Inquiries you send to specialists appear here. They’ll reply in this thread."
        emptyActionHref="/explore"
        emptyActionLabel="Find a specialist"
        onOpenConversation={onConversationOpened}
        onCloseThread={onCloseThread}
        rows={inquiries.map((inquiry) => ({
          id: inquiry.id,
          name: inquiry.specialist,
          avatarUrl: inquiry.avatarUrl,
          preview: inquiry.messagePreview || inquiry.preview,
          time: inquiry.time,
          unread: inquiry.unread,
        }))}
      />
    </DashboardSection>
  );
}
