"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DashboardLoadingState, DashboardPageShell } from "@/components/dashboard";
import {
  AdminSectionNav,
  type AdminSectionId,
} from "@/components/admin/AdminSectionNav";
import { AdminExecutiveRevenueSnapshot } from "@/components/admin/AdminExecutiveRevenueSnapshot";
import { AdminOwnerCeoTitle } from "@/components/admin/AdminOwnerCeoTitle";
import { AdminApplicationsPanel } from "@/components/admin/panels/AdminApplicationsPanel";
import { AdminClientsPanel } from "@/components/admin/panels/AdminClientsPanel";
import { AdminOverviewPanel } from "@/components/admin/panels/AdminOverviewPanel";
import { AdminOwnerRevenuePanel } from "@/components/admin/panels/AdminOwnerRevenuePanel";
import { AdminSettingsPanel } from "@/components/admin/panels/AdminSettingsPanel";
import { AdminSpecialistsPanel } from "@/components/admin/panels/AdminSpecialistsPanel";
import { AdminTeamPanel } from "@/components/admin/panels/AdminTeamPanel";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useAdminSectionBadgeCounts } from "@/hooks/useAdminSectionBadgeCounts";
import { getAdminOwnerRevenueDashboard } from "@/lib/admin-specialist-billing-service";
import { useInternalAuthSession } from "@/hooks/useInternalAuthSession";
import { buildInternalLoginHref } from "@/lib/internal-routes";
import type { SpecialistApplication } from "@/types/specialist-application";
import type { AdminSpecialistVisibility } from "@/types/admin";

export function AdminDashboardPageClient() {
  const router = useRouter();
  const { signOut } = useInternalAuthSession();
  const {
    isReady,
    session,
    stats,
    specialists,
    clients,
    applications,
    clientApplications,
    approveApplication,
    rejectApplication,
    archiveApplication,
    activateFromApplication,
    activateApplicationWithEdits,
    saveApplicationEdits,
    approveClientApplication,
    rejectClientApplication,
    archiveClientApplication,
    saveClientApplicationEdits,
    setSpecialistVisibility,
    setSpecialistFlag,
    setSpecialistProtected,
    setSpecialistAccountKind,
    updateSpecialistBasics,
  } = useAdminDashboard();
  const access = useAdminPermissions(session);

  const billingById = useMemo(() => {
    if (!access?.isOwnerAdmin) return undefined;
    const dashboard = getAdminOwnerRevenueDashboard(
      specialists.map((row) => ({
        id: row.id,
        name: row.name,
        isPremium: row.isPremium,
        featured: row.featured,
      }))
    );
    return new Map(
      dashboard.specialistBilling.map((record) => [record.specialistId, record])
    );
  }, [access?.isOwnerAdmin, specialists]);

  const [activeSection, setActiveSection] = useState<AdminSectionId>("overview");
  const allApplications = applications;

  const sectionBadgeCounts = useAdminSectionBadgeCounts({
    applications,
    clientApplications,
    specialists,
    billingById,
    isOwnerAdmin: access?.isOwnerAdmin ?? false,
  });

  const resolvedSection: AdminSectionId =
    access && !access.allowedSectionIds.includes(activeSection)
      ? access.defaultSection
      : activeSection;

  if (!isReady || !session || !access) {
    return <DashboardLoadingState message="Loading admin dashboard…" />;
  }

  const { permissions, roleLabel, allowedSectionIds, isOwnerAdmin } = access;

  const pageTitle = isOwnerAdmin
    ? null
    : session.displayName ?? session.email.split("@")[0] ?? "Admin";

  function handleSignOut() {
    signOut();
    router.push(buildInternalLoginHref());
  }

  async function handleSaveApplication(
    app: SpecialistApplication
  ): Promise<SpecialistApplication | null> {
    if (!permissions.canApproveApplications) return null;
    const result = await saveApplicationEdits(app);
    return result.ok ? result.application : null;
  }

  async function handleApprove(
    app: SpecialistApplication
  ): Promise<SpecialistApplication | null> {
    if (!permissions.canApproveApplications) return null;
    const approved = await approveApplication(app);
    if (!approved.ok) return null;
    const activated = await activateFromApplication(approved.application.id);
    return activated.ok ? activated.application : approved.application;
  }

  async function handleReject(
    app: SpecialistApplication
  ): Promise<SpecialistApplication | null> {
    if (!permissions.canApproveApplications) return null;
    const result = await rejectApplication(app);
    return result.ok ? result.application : null;
  }

  async function handleActivate(
    app: SpecialistApplication
  ): Promise<SpecialistApplication | null> {
    if (!permissions.canApproveApplications) return null;
    const result = await activateApplicationWithEdits(app);
    return result.ok ? result.application : null;
  }

  async function handleArchiveSpecialist(
    app: SpecialistApplication
  ): Promise<SpecialistApplication | null> {
    if (!permissions.canApproveApplications) return null;
    const result = await archiveApplication(app);
    return result.ok ? result.application : null;
  }

  return (
    <DashboardPageShell
      variant="admin"
      eyebrow="SMOAC Control"
      title={isOwnerAdmin ? <AdminOwnerCeoTitle /> : pageTitle ?? "Operations"}
      subtitle="Internal system"
      roleLabel={roleLabel}
      utilityBar={
        <button
          type="button"
          className="dashboard-signout dashboard-signout--utility"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      }
    >
      <div className="admin-app">
        {permissions.canViewRevenue ? (
          <AdminExecutiveRevenueSnapshot specialists={specialists} />
        ) : null}

        <AdminSectionNav
          activeId={resolvedSection}
          allowedSectionIds={allowedSectionIds}
          badgeCounts={sectionBadgeCounts}
          onSelect={setActiveSection}
        />

        <div
          className="admin-app__panel"
          role="tabpanel"
          id={`admin-panel-${resolvedSection}`}
          aria-labelledby={`admin-tab-${resolvedSection}`}
        >
          {resolvedSection === "overview" && permissions.canViewOverview ? (
            <AdminOverviewPanel
              stats={stats}
              clients={clients}
              permissions={permissions}
              isOwnerAdmin={isOwnerAdmin}
            />
          ) : null}
          {resolvedSection === "applications" ? (
            <AdminApplicationsPanel
              specialistApplications={allApplications}
              clientApplications={clientApplications}
              permissions={permissions}
              onSaveSpecialist={handleSaveApplication}
              onApproveSpecialist={handleApprove}
              onRejectSpecialist={handleReject}
              onArchiveSpecialist={handleArchiveSpecialist}
              onActivateSpecialist={handleActivate}
              onSaveClient={(app) =>
                permissions.canApproveApplications
                  ? saveClientApplicationEdits(app)
                  : null
              }
              onApproveClient={(app) =>
                permissions.canApproveApplications
                  ? approveClientApplication(app)
                  : null
              }
              onRejectClient={(app) =>
                permissions.canApproveApplications
                  ? rejectClientApplication(app)
                  : null
              }
              onArchiveClient={(app) =>
                permissions.canApproveApplications
                  ? archiveClientApplication(app)
                  : null
              }
            />
          ) : null}
          {resolvedSection === "specialists" ? (
            <AdminSpecialistsPanel
              specialists={specialists}
              permissions={permissions}
              isOwnerAdmin={isOwnerAdmin}
              billingById={billingById}
              onVisibilityChange={async (id, visibility: AdminSpecialistVisibility) => {
                if (!permissions.canEditSpecialists) return;
                await setSpecialistVisibility(id, visibility);
              }}
              onFeaturedChange={(id, value) => {
                if (!permissions.canFeatureSpecialists) return;
                void setSpecialistFlag(id, "featured", value);
              }}
              onSponsoredChange={(id, value) => {
                if (!permissions.canFeatureSpecialists) return;
                void setSpecialistFlag(id, "sponsored", value);
              }}
              onTopRankedChange={(id, value) => {
                if (!permissions.canFeatureSpecialists) return;
                void setSpecialistFlag(id, "topRanked", value);
              }}
              onBasicsChange={(id, basics) => {
                if (!permissions.canEditSpecialists) return;
                updateSpecialistBasics(id, basics);
              }}
              onProtectedChange={(id, value) => {
                if (!permissions.canEditSpecialists) return;
                setSpecialistProtected(id, value);
              }}
              onAccountKindChange={(id, value) => {
                if (!permissions.canEditSpecialists) return;
                setSpecialistAccountKind(id, value);
              }}
            />
          ) : null}
          {resolvedSection === "clients" && permissions.canViewClients ? (
            <AdminClientsPanel clients={clients} />
          ) : null}
          {resolvedSection === "revenue" && permissions.canViewRevenue ? (
            <AdminOwnerRevenuePanel specialists={specialists} />
          ) : null}
          {resolvedSection === "team" && permissions.canManageAdmins ? (
            <AdminTeamPanel />
          ) : null}
          {resolvedSection === "settings" && permissions.canManageSettings ? (
            <AdminSettingsPanel />
          ) : null}
        </div>

      </div>
    </DashboardPageShell>
  );
}
