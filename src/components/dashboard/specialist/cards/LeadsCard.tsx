import type { SpecialistLead } from "@/types/specialist-dashboard";
import {
  DashboardListItem,
  DashboardSection,
} from "@/components/dashboard/shared";

interface LeadsCardProps {
  leads: SpecialistLead[];
}

export function LeadsCard({ leads }: LeadsCardProps) {
  return (
    <DashboardSection title="New leads" description="Recent client interest">
      <ul className="dashboard-list">
        {leads.map((lead) => (
          <li key={lead.id}>
            <DashboardListItem
              title={lead.name}
              subtitle={lead.intent}
              meta={lead.receivedAt}
              badge={<span className="dashboard-badge">Lead</span>}
            />
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}
