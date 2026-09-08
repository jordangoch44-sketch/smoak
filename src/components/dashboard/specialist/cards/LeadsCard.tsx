"use client";

import type { SpecialistLead } from "@/types/specialist-dashboard";
import {
  DashboardCollapsibleSection,
  DashboardSectionIcon,
} from "@/components/dashboard/shared";
import { InquiryInboxPanel } from "@/components/inquiry/InquiryInboxPanel";
import { isDemoInquiryConversationId } from "@/lib/inquiry/inquiry-paths";

interface LeadsCardProps {
  leads: SpecialistLead[];
  senderUserId: string;
  onOpenLead?: (lead: SpecialistLead) => void;
  defaultOpen?: boolean;
  initialConversationId?: string | null;
  onCloseThread?: () => void;
}

export function LeadsCard({
  leads,
  senderUserId,
  onOpenLead,
  defaultOpen = true,
  initialConversationId,
  onCloseThread,
}: LeadsCardProps) {
  const unreadCount = leads.filter((lead) => lead.unread).length;
  const demoLeads = leads.filter((lead) => isDemoInquiryConversationId(lead.id));

  return (
    <div id="specialist-inquiries">
      <DashboardCollapsibleSection
        title="Inquiries"
        icon={<DashboardSectionIcon id="inquiries" />}
        description={
          unreadCount > 0
            ? `${unreadCount} waiting for your reply`
            : "Client conversations — reply in the thread"
        }
        summary={
          leads.length === 0
            ? "None yet"
            : unreadCount > 0
              ? `${unreadCount} new · ${leads.length} total`
              : `${leads.length} total`
        }
        defaultOpen={defaultOpen}
        span="full"
      >
        <InquiryInboxPanel
          viewer="specialist"
          senderUserId={senderUserId}
          initialConversationId={initialConversationId}
          emptyMessage="No inquiries yet. When a client contacts you, their messages show here."
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
      </DashboardCollapsibleSection>
    </div>
  );
}
