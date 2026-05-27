"use client";

import { useState } from "react";
import { DashboardSection } from "@/components/dashboard";
import { AdminApplicationReviewPanel } from "@/components/admin/applications/AdminApplicationReviewPanel";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { applicationStatusLabel } from "@/lib/admin-applications-service";
import type { AdminApplicationStatusLabel } from "@/types/admin";
import type { AdminPermissions } from "@/types/admin-permissions";
import type { SpecialistApplication } from "@/types/specialist-application";

function formatSubmittedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AdminApplicationsPanelProps {
  applications: readonly SpecialistApplication[];
  permissions: AdminPermissions;
  onSave: (app: SpecialistApplication) => SpecialistApplication | null;
  onApprove: (app: SpecialistApplication) => SpecialistApplication | null;
  onReject: (app: SpecialistApplication) => SpecialistApplication | null;
  onActivate: (app: SpecialistApplication) => SpecialistApplication | null;
}

export function AdminApplicationsPanel({
  applications,
  permissions,
  onSave,
  onApprove,
  onReject,
  onActivate,
}: AdminApplicationsPanelProps) {
  const [filter, setFilter] = useState<AdminApplicationStatusLabel | "all">(
    "pending"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? applications
      : applications.filter(
          (app) => applicationStatusLabel(app.profileStatus) === filter
        );

  const selected =
    selectedId != null
      ? applications.find((app) => app.id === selectedId) ?? null
      : null;

  return (
    <DashboardSection
      title="Applications"
      description="Join SMOAC inbox — tap an application to review, edit, and approve."
    >
      <div className="admin-filter-pills" role="tablist" aria-label="Application filters">
        {(["all", "pending", "approved", "rejected"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            className={`admin-filter-pill${filter === item ? " admin-filter-pill--active" : ""}`}
            onClick={() => setFilter(item)}
          >
            {item}
            {item === "pending" ? (
              <span className="admin-filter-pill__count">
                {
                  applications.filter(
                    (a) => applicationStatusLabel(a.profileStatus) === "pending"
                  ).length
                }
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="admin-empty">No applications in this filter.</p>
      ) : (
        <ul className="admin-card-list admin-applications-inbox">
          {filtered.map((app) => {
            const label = applicationStatusLabel(app.profileStatus);
            const isSelected = selectedId === app.id;
            return (
              <li key={app.id}>
                <button
                  type="button"
                  className={`admin-inbox-card${isSelected ? " admin-inbox-card--selected" : ""}`}
                  onClick={() => setSelectedId(app.id)}
                >
                  <div className="admin-inbox-card__head">
                    <div>
                      <h3 className="admin-inbox-card__title">
                        {app.displayName || app.fullName}
                      </h3>
                      <p className="admin-inbox-card__category">
                        {app.professionalType || "Specialist"}
                      </p>
                    </div>
                    <AdminStatusBadge label={label} />
                  </div>
                  <dl className="admin-inbox-card__meta">
                    <div>
                      <dt>City</dt>
                      <dd>
                        {app.neighborhood ? `${app.neighborhood}, ` : ""}
                        {app.city || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Submitted</dt>
                      <dd>{formatSubmittedDate(app.submittedAt)}</dd>
                    </div>
                  </dl>
                  <span className="admin-inbox-card__cta">Review application →</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected ? (
        <AdminApplicationReviewPanel
          application={selected}
          permissions={permissions}
          onClose={() => setSelectedId(null)}
          onSave={onSave}
          onApprove={onApprove}
          onReject={onReject}
          onActivate={onActivate}
        />
      ) : null}
    </DashboardSection>
  );
}
