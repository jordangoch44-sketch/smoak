"use client";

import { DashboardSection } from "@/components/dashboard";

export function AdminTeamPanel() {
  return (
    <DashboardSection
      title="Admin users"
      description="Team access and roles — coming soon."
    >
      <div className="admin-placeholder-grid">
        <div className="admin-placeholder-card">
          <h3>Invite admin users</h3>
          <p>
            Add SMOAC team members with role-based access. Will connect to Supabase
            auth and RLS.
          </p>
        </div>
        <div className="admin-placeholder-card">
          <h3>Role permissions</h3>
          <p>
            Granular controls for applications, revenue, and messaging moderation.
          </p>
        </div>
      </div>
    </DashboardSection>
  );
}
