"use client";

import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard";
import { AdminApplicationReviewPanel } from "@/components/admin/applications/AdminApplicationReviewPanel";
import { AdminClientApplicationReviewPanel } from "@/components/admin/applications/AdminClientApplicationReviewPanel";
import {
  AdminApplicationsControlBar,
  type ApplicationQueue,
  type QueueCountMetrics,
} from "@/components/admin/applications/AdminApplicationsControlBar";
import { AdminApplicationCard } from "@/components/admin/applications/AdminApplicationCard";
import { AdminClientApplicationCard } from "@/components/admin/applications/AdminClientApplicationCard";
import { applicationStatusLabel } from "@/lib/admin-applications-service";
import type { AdminApplicationMutationResult } from "@/lib/admin-applications-service";
import { clientApplicationStatusLabel } from "@/lib/client-applications-service";
import type { ClientApplicationMutationResult } from "@/lib/client-applications-service";
import type { AdminApplicationStatusLabel } from "@/types/admin";
import type { AdminPermissions } from "@/types/admin-permissions";
import type { ClientApplication } from "@/types/client-application";
import type { SpecialistApplication } from "@/types/specialist-application";

type SpecialistAppAction = (
  app: SpecialistApplication
) =>
  | AdminApplicationMutationResult
  | Promise<AdminApplicationMutationResult>;

type ClientAppAction = (
  app: ClientApplication
) =>
  | ClientApplicationMutationResult
  | Promise<ClientApplicationMutationResult>;

interface AdminApplicationsPanelProps {
  specialistApplications: readonly SpecialistApplication[];
  clientApplications: readonly ClientApplication[];
  permissions: AdminPermissions;
  onSaveSpecialist: SpecialistAppAction;
  onApproveSpecialist: SpecialistAppAction;
  onRejectSpecialist: SpecialistAppAction;
  onArchiveSpecialist: SpecialistAppAction;
  onActivateSpecialist: SpecialistAppAction;
  onSaveClient: ClientAppAction;
  onApproveClient: ClientAppAction;
  onRejectClient: ClientAppAction;
  onArchiveClient: ClientAppAction;
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
  const [statusFilter, setStatusFilter] = useState<AdminApplicationStatusLabel | "all">(
    "pending"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null>(
    null
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Compute status counts for specialists
  const specialistCounts = useMemo<QueueCountMetrics>(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let archived = 0;

    for (const app of specialistApplications) {
      const label = applicationStatusLabel(app.profileStatus);
      if (label === "pending") pending++;
      else if (label === "approved") approved++;
      else if (label === "rejected") rejected++;
      else if (label === "archived") archived++;
    }

    return {
      total: specialistApplications.length,
      pending,
      approved,
      rejected,
      archived,
    };
  }, [specialistApplications]);

  // Compute status counts for clients
  const clientCounts = useMemo<QueueCountMetrics>(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let archived = 0;

    for (const app of clientApplications) {
      const label = clientApplicationStatusLabel(app.status);
      if (label === "pending") pending++;
      else if (label === "approved") approved++;
      else if (label === "rejected") rejected++;
      else if (label === "archived") archived++;
    }

    return {
      total: clientApplications.length,
      pending,
      approved,
      rejected,
      archived,
    };
  }, [clientApplications]);

  // Filter specialists by status and search query
  const filteredSpecialists = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return specialistApplications.filter((app) => {
      // Status filter
      if (statusFilter !== "all") {
        const label = applicationStatusLabel(app.profileStatus);
        if (label !== statusFilter) return false;
      }

      // Search filter
      if (!query) return true;

      const name = (
        app.businessName ||
        app.displayName ||
        app.fullName ||
        ""
      ).toLowerCase();
      const email = (app.email || "").toLowerCase();
      const city = (app.city || "").toLowerCase();
      const neighborhood = (app.neighborhood || "").toLowerCase();
      const zip = (app.zipCode || "").toLowerCase();
      const profession = (app.professionalType || "").toLowerCase();
      const headline = (app.headline || "").toLowerCase();
      const specialties = (app.specialties || []).join(" ").toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        city.includes(query) ||
        neighborhood.includes(query) ||
        zip.includes(query) ||
        profession.includes(query) ||
        headline.includes(query) ||
        specialties.includes(query)
      );
    });
  }, [specialistApplications, statusFilter, searchQuery]);

  // Filter clients by status and search query
  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return clientApplications.filter((app) => {
      // Status filter
      if (statusFilter !== "all") {
        const label = clientApplicationStatusLabel(app.status);
        if (label !== statusFilter) return false;
      }

      // Search filter
      if (!query) return true;

      const name = (app.fullName || "").toLowerCase();
      const email = (app.email || "").toLowerCase();
      const city = (app.preferredCity || "").toLowerCase();
      const neighborhood = (app.preferredNeighborhood || "").toLowerCase();
      const zip = (app.preferredZipCode || "").toLowerCase();
      const goals = (app.fitnessGoals || []).join(" ").toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        city.includes(query) ||
        neighborhood.includes(query) ||
        zip.includes(query) ||
        goals.includes(query)
      );
    });
  }, [clientApplications, statusFilter, searchQuery]);

  const selectedSpecialist =
    selectedSpecialistId != null
      ? specialistApplications.find((app) => app.id === selectedSpecialistId) ??
        null
      : null;

  const selectedClient =
    selectedClientId != null
      ? clientApplications.find((app) => app.id === selectedClientId) ?? null
      : null;

  const totalFilteredCount =
    queue === "specialists"
      ? filteredSpecialists.length
      : filteredClients.length;

  const totalQueueCount =
    queue === "specialists"
      ? specialistApplications.length
      : clientApplications.length;

  return (
    <DashboardSection
      title="Applications Queue"
      description="Review and manage specialist and client questionnaires before they go live on the SMOAK marketplace."
    >
      {/* Unified Apple-Style Filter & Search Bar */}
      <AdminApplicationsControlBar
        queue={queue}
        onQueueChange={(newQueue) => {
          setQueue(newQueue);
          setSelectedSpecialistId(null);
          setSelectedClientId(null);
        }}
        specialistCounts={specialistCounts}
        clientCounts={clientCounts}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        totalFilteredCount={totalFilteredCount}
        totalQueueCount={totalQueueCount}
      />

      {/* Applications List */}
      <div className="admin-app-content">
        {queue === "specialists" ? (
          filteredSpecialists.length === 0 ? (
            <div className="admin-app-empty">
              <div className="admin-app-empty__icon">📋</div>
              <h4 className="admin-app-empty__title">
                {searchQuery
                  ? "No matching specialist applications"
                  : `No ${statusFilter === "all" ? "" : statusFilter} specialist applications`}
              </h4>
              <p className="admin-app-empty__desc">
                {searchQuery
                  ? `No applications matched "${searchQuery}". Try a different name, city, or specialty keyword.`
                  : `There are currently no specialist applications in the ${statusFilter} status.`}
              </p>
              {(searchQuery || statusFilter !== "pending") ? (
                <button
                  type="button"
                  className="admin-app-empty__reset-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("pending");
                  }}
                >
                  Reset filters & search
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="admin-app-cards-list">
              {filteredSpecialists.map((app) => (
                <AdminApplicationCard
                  key={app.id}
                  application={app}
                  isSelected={selectedSpecialistId === app.id}
                  onSelect={() => setSelectedSpecialistId(app.id)}
                />
              ))}
            </ul>
          )
        ) : filteredClients.length === 0 ? (
          <div className="admin-app-empty">
            <div className="admin-app-empty__icon">👤</div>
            <h4 className="admin-app-empty__title">
              {searchQuery
                ? "No matching client applications"
                : `No ${statusFilter === "all" ? "" : statusFilter} client applications`}
            </h4>
            <p className="admin-app-empty__desc">
              {searchQuery
                ? `No client applications matched "${searchQuery}". Try a different name or location keyword.`
                : `There are currently no client questionnaires in the ${statusFilter} status.`}
            </p>
            {(searchQuery || statusFilter !== "pending") ? (
              <button
                type="button"
                className="admin-app-empty__reset-btn"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("pending");
                }}
              >
                Reset filters & search
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="admin-app-cards-list">
            {filteredClients.map((app) => (
              <AdminClientApplicationCard
                key={app.id}
                application={app}
                isSelected={selectedClientId === app.id}
                onSelect={() => setSelectedClientId(app.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Specialist Review Sheet */}
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

      {/* Client Review Sheet */}
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
