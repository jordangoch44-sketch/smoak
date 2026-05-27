"use client";

import { DashboardSection } from "@/components/dashboard";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import type { AdminClientRecord } from "@/types/admin";

interface AdminClientsPanelProps {
  clients: AdminClientRecord[];
}

export function AdminClientsPanel({ clients }: AdminClientsPanelProps) {
  return (
    <DashboardSection
      title="Clients"
      description="Client accounts and saved specialist counts."
    >
      <ul className="admin-card-list admin-mobile-only">
        {clients.map((client) => (
          <li key={client.id} className="admin-entity-card">
            <div className="admin-entity-card__head">
              <div>
                <h3 className="admin-entity-card__title">{client.displayName}</h3>
                <p className="admin-entity-card__sub">{client.email}</p>
              </div>
              <AdminStatusBadge label={client.status} />
            </div>
            <dl className="admin-entity-card__meta">
              <div>
                <dt>Saved specialists</dt>
                <dd>{client.savedSpecialistsCount}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{client.source}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="admin-table-wrap admin-desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Saved</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.displayName}</td>
                  <td>{client.email}</td>
                  <td>{client.savedSpecialistsCount}</td>
                  <td>
                    <AdminStatusBadge label={client.status} />
                  </td>
                  <td>{client.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </DashboardSection>
  );
}
