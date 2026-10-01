"use client";

import type { SpecialistLead } from "@/types/specialist-dashboard";
import { InquiryInboxPanel } from "@/components/inquiry/InquiryInboxPanel";
import { isDemoInquiryConversationId } from "@/lib/inquiry/inquiry-paths";
import { RosterInviteButton } from "./clients/RosterInviteButton";

interface SpecialistInquiriesInboxProps {
  leads: SpecialistLead[];
  senderUserId: string;
  onOpenLead?: (lead: SpecialistLead) => void;
  initialConversationId?: string | null;
  onCloseThread?: () => void;
  onHideLead?: (id: string) => void | Promise<void>;
  onMarkRead?: (ids: string[]) => void | Promise<void>;
  onMarkUnread?: (ids: string[]) => void | Promise<void>;
  onBack?: () => void;
  /** Marketplace id; enables “Add to roster” in thread headers. */
  specialistId?: string | null;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

export function SpecialistInquiriesInbox({
  leads,
  senderUserId,
  onOpenLead,
  initialConversationId,
  onCloseThread,
  onHideLead,
  onMarkRead,
  onMarkUnread,
  onBack,
  specialistId = null,
  isPremium = false,
  onUpgrade,
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
        previewLeads={leads}
        onCloseThread={onCloseThread}
        onExitPage={onBack}
        onHideConversation={onHideLead}
        onMarkConversationsRead={onMarkRead}
        onMarkConversationsUnread={onMarkUnread}
        renderThreadAction={
          specialistId
            ? (conversationId) => (
                <RosterInviteButton
                  specialistId={specialistId}
                  conversationId={conversationId}
                  isPremium={isPremium}
                  onUpgrade={onUpgrade}
                />
              )
            : undefined
        }
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
          topicLabels: lead.topicLabels,
        }))}
      />
    </div>
  );
}
