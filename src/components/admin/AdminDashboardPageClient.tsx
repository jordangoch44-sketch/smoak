"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardLoadingState, DashboardPageShell } from "@/components/dashboard";
import {
  AdminSectionNav,
  type AdminSectionId,
} from "@/components/admin/AdminSectionNav";
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
import { useAuthSession } from "@/hooks/useAuthSession";
import { buildDevAdminLoginHref } from "@/lib/admin-routes";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import type { SpecialistApplication } from "@/types/specialist-application";
import type { AdminSpecialistVisibility } from "@/types/admin";

export function AdminDashboardPageClient() {
  const router = useRouter();
  const { signOut } = useAuthSession();
  const {
    isReady,
    session,
    stats,
    specialists,
    clients,
    applications,
    approveApplication,
    rejectApplication,
    activateFromApplication,
    saveApplicationEdits,
    setSpecialistVisibility,
    setSpecialistFlag,
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
    specialists,
    billingById,
    isOwnerAdmin: access?.isOwnerAdmin ?? false,
  });

  useEffect(() => {
    if (!access) return;
    if (!access.allowedSectionIds.includes(activeSection)) {
      setActiveSection(access.defaultSection);
    }
  }, [access, activeSection]);

  if (!isReady || !session || !access) {
    return <DashboardLoadingState message="Loading admin dashboard…" />;
  }

  const { permissions, roleLabel, allowedSectionIds, isOwnerAdmin } = access;

  const pageTitle = isOwnerAdmin
    ? null
    : session.displayName ?? session.email.split("@")[0] ?? "Admin";

  function handleSignOut() {
    signOut();
    afterLogoutNavigation(() => router.push(buildDevAdminLoginHref()));
  }

  function handleSaveApplication(
    app: SpecialistApplication
  ): SpecialistApplication | null {
    if (!permissions.canApproveApplications) return null;
    return saveApplicationEdits(app);
  }

  function handleApprove(
    app: SpecialistApplication
  ): SpecialistApplication | null {
    if (!permissions.canApproveApplications) return null;
    return approveApplication(app);
  }

  function handleReject(
    app: SpecialistApplication
  ): SpecialistApplication | null {
    if (!permissions.canApproveApplications) return null;
    return rejectApplication(app);
  }

  function handleActivate(
    app: SpecialistApplication
  ): SpecialistApplication | null {
    if (!permissions.canApproveApplications) return null;
    saveApplicationEdits(app);
    return activateFromApplication(app.id);
  }

  return (
    <DashboardPageShell
      variant="admin"
      eyebrow="Admin"
      title={isOwnerAdmin ? <AdminOwnerCeoTitle /> : pageTitle ?? "Admin"}
      subtitle="SMOAC control center"
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
        <AdminSectionNav
          activeId={activeSection}
          allowedSectionIds={allowedSectionIds}
          badgeCounts={sectionBadgeCounts}
          onSelect={setActiveSection}
        />

        <div
          className="admin-app__panel"
          role="tabpanel"
          id={`admin-panel-${activeSection}`}
          aria-labelledby={`admin-tab-${activeSection}`}
        >
          {activeSection === "overview" && permissions.canViewOverview ? (
            <AdminOverviewPanel
              stats={stats}
              clients={clients}
              permissions={permissions}
              isOwnerAdmin={isOwnerAdmin}
            />
          ) : null}
          {activeSection === "applications" ? (
            <AdminApplicationsPanel
              applications={allApplications}
              permissions={permissions}
              onSave={handleSaveApplication}
              onApprove={handleApprove}
              onReject={handleReject}
              onActivate={handleActivate}
            />
          ) : null}
          {activeSection === "specialists" ? (
            <AdminSpecialistsPanel
              specialists={specialists}
              permissions={permissions}
              isOwnerAdmin={isOwnerAdmin}
              billingById={billingById}
              onVisibilityChange={(id, visibility: AdminSpecialistVisibility) => {
                if (!permissions.canEditSpecialists) return;
                setSpecialistVisibility(id, visibility);
              }}
              onFeaturedChange={(id, value) => {
                if (!permissions.canFeatureSpecialists) return;
                setSpecialistFlag(id, "featured", value);
              }}
              onTopRankedChange={(id, value) => {
                if (!permissions.canFeatureSpecialists) return;
                setSpecialistFlag(id, "topRanked", value);
              }}
              onBasicsChange={(id, basics) => {
                if (!permissions.canEditSpecialists) return;
                updateSpecialistBasics(id, basics);
              }}
            />
          ) : null}
          {activeSection === "clients" && permissions.canViewClients ? (
            <AdminClientsPanel clients={clients} />
          ) : null}
          {activeSection === "revenue" && permissions.canViewRevenue ? (
            <AdminOwnerRevenuePanel specialists={specialists} />
          ) : null}
          {activeSection === "team" && permissions.canManageAdmins ? (
            <AdminTeamPanel />
          ) : null}
          {activeSection === "settings" && permissions.canManageSettings ? (
            <AdminSettingsPanel />
          ) : null}
        </div>

        {activeSection === "overview" ? (
          <p className="admin-dev-note">
            DEV admin ·{" "}
            <Link href={buildDevAdminLoginHref()}>{buildDevAdminLoginHref()}</Link>
            <br />
            Owner: <code>admin@smoac.com</code> / <code>admin123</code>
            <br />
            Staff: <code>staff@smoac.com</code> / <code>staff123</code>
          </p>
        ) : null}
      </div>
    </DashboardPageShell>
  );
}
