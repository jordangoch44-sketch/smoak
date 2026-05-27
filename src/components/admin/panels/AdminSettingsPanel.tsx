"use client";

import { DashboardSection } from "@/components/dashboard";

export function AdminSettingsPanel() {
  return (
    <DashboardSection
      title="Settings"
      description="Platform taxonomy and ranking — placeholders for now."
    >
      <div className="admin-placeholder-grid">
        <div className="admin-placeholder-card">
          <h3>Categories</h3>
          <p>Manage main profession categories for Explore filters.</p>
        </div>
        <div className="admin-placeholder-card">
          <h3>Specialties</h3>
          <p>Edit marketplace specialty tags and onboarding options.</p>
        </div>
        <div className="admin-placeholder-card">
          <h3>Cities & neighborhoods</h3>
          <p>Location taxonomy for search and provider profiles.</p>
        </div>
        <div className="admin-placeholder-card">
          <h3>Ranking rules</h3>
          <p>Featured, top-ranked, and city leaderboard weighting.</p>
        </div>
      </div>
    </DashboardSection>
  );
}
