"use client";

import type { SpecialistLead } from "@/types/specialist-dashboard";
import { InquiryInboxPanel } from "@/components/inquiry/InquiryInboxPanel";
import { isDemoInquiryConversationId } from "@/lib/inquiry/inquiry-paths";

interface SpecialistInquiriesInboxProps {
  leads: SpecialistLead[];
  senderUserId: string;
  onOpenLead?: (lead: SpecialistLead) => void;
  initialConversationId?: string | null;
  onCloseThread?: () => void;
}

export function SpecialistInquiriesInbox({
  leads,
  senderUserId,
  onOpenLead,
  initialConversationId,
  onCloseThread,
}: SpecialistInquiriesInboxProps) {
  const demoLeads = leads.filter((lead) => isDemoInquiryConversationId(lead.id));

  return (
    <div id="specialist-inquiries" className="specialist-inquiries-page">
      <InquiryInboxPanel
        viewer="specialist"
        senderUserId={senderUserId}
        variant="page"
        listTitle="Inquiries"
        initialConversationId={initialConversationId}
        emptyMessage="No inquiries yet. When a client contacts you, their conversation shows up here."
        demoLeads={demoLeads}
        onCloseThread={onCloseThread}
        onOpenConversation={(id) => {
          const lead = leads.find((item) => item.id === id);
          if (lead) onOpenLead?.(lead);
        }}
        rows={leads.map((lead) => ({
          id: lead.id,
          name: lead.name,
          avatarUrl: lead.avatarUrl,
          preview: lead.messagePreview || lead.intent,
          time: lead.receivedAt,
          unread: lead.unread,
        }))}
      />
    </div>
  );
}
