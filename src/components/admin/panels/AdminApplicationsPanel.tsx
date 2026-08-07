"use client";

import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard";
import { AdminApplicationReviewPanel } from "@/components/admin/applications/AdminApplicationReviewPanel";
import { AdminClientApplicationReviewPanel } from "@/components/admin/applications/AdminClientApplicationReviewPanel";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { applicationStatusLabel } from "@/lib/admin-applications-service";
import type { AdminApplicationMutationResult } from "@/lib/admin-applications-service";
import { clientApplicationStatusLabel } from "@/lib/client-applications-service";
import type { AdminApplicationStatusLabel } from "@/types/admin";
import type { AdminPermissions } from "@/types/admin-permissions";
import type { ClientApplication } from "@/types/client-application";
import type { SpecialistApplication } from "@/types/specialist-application";

type ApplicationQueue = "specialists" | "clients";

function formatSubmittedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SpecialistAppAction = (
  app: SpecialistApplication
) =>
  | AdminApplicationMutationResult
  | Promise<AdminApplicationMutationResult>;

interface AdminApplicationsPanelProps {
  specialistApplications: readonly SpecialistApplication[];
  clientApplications: readonly ClientApplication[];
  permissions: AdminPermissions;
  onSaveSpecialist: SpecialistAppAction;
  onApproveSpecialist: SpecialistAppAction;
  onRejectSpecialist: SpecialistAppAction;
  onArchiveSpecialist: SpecialistAppAction;
  onActivateSpecialist: SpecialistAppAction;
  onSaveClient: (app: ClientApplication) => ClientApplication | null;
  onApproveClient: (app: ClientApplication) => ClientApplication | null;
  onRejectClient: (app: ClientApplication) => ClientApplication | null;
  onArchiveClient: (app: ClientApplication) => ClientApplication | null;
}

export function AdminApplicationsPanel({
  specialistApplications,
  clientApplications,
  permissions,
  onSaveSpecialist,
  onApproveSpecialist,
  onRejectSpecialist,
  onArchiveSpecialist,
  onActivateSpecialist,
  onSaveClient,
  onApproveClient,
  onRejectClient,
  onArchiveClient,
}: AdminApplicationsPanelProps) {
  const [queue, setQueue] = useState<ApplicationQueue>("specialists");
  const [filter, setFilter] = useState<AdminApplicationStatusLabel | "all">(
    "pending"
  );
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null>(
    null
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const pendingSpecialists = useMemo(
    () =>
      specialistApplications.filter(
        (a) => applicationStatusLabel(a.profileStatus) === "pending"
      ).length,
    [specialistApplications]
  );

  const pendingClients = useMemo(
    () =>
      clientApplications.filter(
        (a) => clientApplicationStatusLabel(a.status) === "pending"
      ).length,
    [clientApplications]
  );

  const filteredSpecialists =
    filter === "all"
      ? specialistApplications
      : specialistApplications.filter(
          (app) => applicationStatusLabel(app.profileStatus) === filter
        );

  const filteredClients =
    filter === "all"
      ? clientApplications
      : clientApplications.filter(
          (app) => clientApplicationStatusLabel(app.status) === filter
        );

  const selectedSpecialist =
    selectedSpecialistId != null
      ? specialistApplications.find((app) => app.id === selectedSpecialistId) ??
        null
      : null;

  const selectedClient =
    selectedClientId != null
      ? clientApplications.find((app) => app.id === selectedClientId) ?? null
      : null;

  const filterOptions: (AdminApplicationStatusLabel | "all")[] = [
    "all",
    "pending",
    "approved",
    "rejected",
    "archived",
  ];

  return (
    <DashboardSection
      title="Applications"
      description="Join SMOAC inbox — review specialist and client questionnaires before they go live."
    >
      <div
        className="admin-filter-pills admin-filter-pills--queue"
        role="tablist"
        aria-label="Application queue"
      >
        <button
          type="button"
          role="tab"
          aria-selected={queue === "specialists"}
          className={`admin-filter-pill${queue === "specialists" ? " admin-filter-pill--active" : ""}`}
          onClick={() => {
            setQueue("specialists");
            setSelectedClientId(null);
          }}
        >
          Specialists
          {pendingSpecialists > 0 ? (
            <span className="admin-filter-pill__count">{pendingSpecialists}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={queue === "clients"}
          className={`admin-filter-pill${queue === "clients" ? " admin-filter-pill--active" : ""}`}
          onClick={() => {
            setQueue("clients");
            setSelectedSpecialistId(null);
          }}
        >
          Clients
          {pendingClients > 0 ? (
            <span className="admin-filter-pill__count">{pendingClients}</span>
          ) : null}
        </button>
      </div>

      <div className="admin-filter-pills" role="tablist" aria-label="Application filters">
        {filterOptions.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            className={`admin-filter-pill${filter === item ? " admin-filter-pill--active" : ""}`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {queue === "specialists" ? (
        filteredSpecialists.length === 0 ? (
          <p className="admin-empty">No specialist applications in this filter.</p>
        ) : (
          <ul className="admin-card-list admin-applications-inbox">
            {filteredSpecialists.map((app) => {
              const label = applicationStatusLabel(app.profileStatus);
              const isSelected = selectedSpecialistId === app.id;
              return (
                <li key={app.id}>
                  <button
                    type="button"
                    className={`admin-inbox-card${isSelected ? " admin-inbox-card--selected" : ""}`}
                    onClick={() => setSelectedSpecialistId(app.id)}
                  >
                    <div className="admin-inbox-card__head">
                      <div>
                        <h3 className="admin-inbox-card__title">
                          {app.businessName || app.displayName || app.fullName}
                        </h3>
                        <p className="admin-inbox-card__category">
                          {app.professionalType || "Specialist"}
                        </p>
                      </div>
                      <AdminStatusBadge label={label} />
                    </div>
                    <dl className="admin-inbox-card__meta">
                      <div>
                        <dt>Email</dt>
                        <dd>{app.email}</dd>
                      </div>
                      <div>
                        <dt>City</dt>
                        <dd>
                          {app.neighborhood ? `${app.neighborhood}, ` : ""}
                          {app.city || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>ZIP</dt>
                        <dd>{app.zipCode || "—"}</dd>
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
        )
      ) : filteredClients.length === 0 ? (
        <p className="admin-empty">No client applications in this filter.</p>
      ) : (
        <ul className="admin-card-list admin-applications-inbox">
          {filteredClients.map((app) => {
            const label = clientApplicationStatusLabel(app.status);
            const isSelected = selectedClientId === app.id;
            return (
              <li key={app.id}>
                <button
                  type="button"
                  className={`admin-inbox-card${isSelected ? " admin-inbox-card--selected" : ""}`}
                  onClick={() => setSelectedClientId(app.id)}
                >
                  <div className="admin-inbox-card__head">
                    <div>
                      <h3 className="admin-inbox-card__title">{app.fullName}</h3>
                      <p className="admin-inbox-card__category">Client</p>
                    </div>
                    <AdminStatusBadge label={label} />
                  </div>
                  <dl className="admin-inbox-card__meta">
                    <div>
                      <dt>Email</dt>
                      <dd>{app.email}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>
                        {app.preferredNeighborhood
                          ? `${app.preferredNeighborhood}, `
                          : ""}
                        {app.preferredCity || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>ZIP</dt>
                      <dd>{app.preferredZipCode || "—"}</dd>
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

      {selectedSpecialist ? (
        <AdminApplicationReviewPanel
          application={selectedSpecialist}
          permissions={permissions}
          onClose={() => setSelectedSpecialistId(null)}
          onSave={onSaveSpecialist}
          onApprove={onApproveSpecialist}
          onReject={onRejectSpecialist}
          onActivate={onActivateSpecialist}
          onArchive={onArchiveSpecialist}
        />
      ) : null}

      {selectedClient ? (
        <AdminClientApplicationReviewPanel
          application={selectedClient}
          permissions={permissions}
          onClose={() => setSelectedClientId(null)}
          onSave={onSaveClient}
          onApprove={onApproveClient}
          onReject={onRejectClient}
          onArchive={onArchiveClient}
        />
      ) : null}
    </DashboardSection>
  );
}
