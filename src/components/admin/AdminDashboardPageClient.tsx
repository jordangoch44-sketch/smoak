"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DashboardLoadingState, DashboardPageShell } from "@/components/dashboard";
import {
  AdminSectionNav,
  type AdminSectionId,
} from "@/components/admin/AdminSectionNav";
import { AdminExecutiveRevenueSnapshot } from "@/components/admin/AdminExecutiveRevenueSnapshot";
import { AdminOwnerCeoTitle } from "@/components/admin/AdminOwnerCeoTitle";
import { AdminApplicationsPanel } from "@/components/admin/panels/AdminApplicationsPanel";
import { AdminClientsPanel } from "@/components/admin/panels/AdminClientsPanel";
import { AdminOwnerRevenuePanel } from "@/components/admin/panels/AdminOwnerRevenuePanel";
import { AdminSettingsPanel } from "@/components/admin/panels/AdminSettingsPanel";
import { AdminSpecialistsPanel } from "@/components/admin/panels/AdminSpecialistsPanel";
import { AdminTeamPanel } from "@/components/admin/panels/AdminTeamPanel";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
  useAdminSectionAttentionItemIds,
  useAdminSectionBadgeCounts,
} from "@/hooks/useAdminSectionBadgeCounts";
import { getAdminOwnerRevenueDashboard } from "@/lib/admin-specialist-billing-service";
import { markAdminSectionBadgeSeen } from "@/lib/admin-section-badge-seen-store";
import { useInternalAuthSession } from "@/hooks/useInternalAuthSession";
import { buildInternalLoginHref } from "@/lib/internal-routes";
import { PAGE_TRANSITION_EASE } from "@/lib/motion";
import type { AdminApplicationMutationResult } from "@/lib/admin-applications-service";
import type { AdminNotifiableSectionId } from "@/types/admin-notifications";
import type { SpecialistApplication } from "@/types/specialist-application";
import type { AdminSpecialistVisibility } from "@/types/admin";

function isNotifiableAdminSection(
  id: AdminSectionId
): id is AdminNotifiableSectionId {
  return (
    id === "applications" ||
    id === "specialists" ||
    id === "clients" ||
    id === "revenue"
  );
}

export function AdminDashboardPageClient() {
  const router = useRouter();
  const { signOut } = useInternalAuthSession();
  const {
    isReady,
    session,
    specialists,
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
  const reduceMotion = useReducedMotion();

  const sectionBadgeCounts = useAdminSectionBadgeCounts({
    applications,
    clientApplications,
    specialists,
    billingById,
    isOwnerAdmin: access?.isOwnerAdmin ?? false,
  });

  const attentionItemIds = useAdminSectionAttentionItemIds({
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

  /* Opening a tab clears its badge until new attention items appear */
  useEffect(() => {
    if (!isNotifiableAdminSection(resolvedSection)) return;
    markAdminSectionBadgeSeen(
      resolvedSection,
      attentionItemIds[resolvedSection]
    );
  }, [resolvedSection, attentionItemIds]);

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
  ): Promise<AdminApplicationMutationResult> {
    if (!permissions.canApproveApplications) {
      return { ok: false, message: "Missing permission to edit applications." };
    }
    return saveApplicationEdits(app);
  }

  async function handleApprove(
    app: SpecialistApplication
  ): Promise<AdminApplicationMutationResult> {
    if (!permissions.canApproveApplications) {
      return { ok: false, message: "Missing permission to approve applications." };
    }
    const approved = await approveApplication(app);
    if (!approved.ok) return approved;
    const activated = await activateFromApplication(approved.application);
    /* Fail closed — do not claim success if catalog/email activation failed. */
    if (!activated.ok) {
      return {
        ok: false,
        message:
          activated.message ||
          "Approved in queue, but could not publish to Marketplace. Try Convert to active specialist.",
        application: approved.application,
      };
    }
    return activated;
  }

  async function handleReject(
    app: SpecialistApplication
  ): Promise<AdminApplicationMutationResult> {
    if (!permissions.canApproveApplications) {
      return { ok: false, message: "Missing permission to reject applications." };
    }
    return rejectApplication(app);
  }

  async function handleActivate(
    app: SpecialistApplication
  ): Promise<AdminApplicationMutationResult> {
    if (!permissions.canApproveApplications) {
      return { ok: false, message: "Missing permission to activate specialists." };
    }
    return activateApplicationWithEdits(app);
  }

  async function handleArchiveSpecialist(
    app: SpecialistApplication
  ): Promise<AdminApplicationMutationResult> {
    if (!permissions.canApproveApplications) {
      return { ok: false, message: "Missing permission to archive applications." };
    }
    return archiveApplication(app);
  }

  return (
    <DashboardPageShell
      variant="admin"
      adminSection={resolvedSection}
      eyebrow="SMOAC Control"
      title={isOwnerAdmin ? <AdminOwnerCeoTitle /> : pageTitle ?? "Operations"}
      subtitle="Internal system"
      quote="A bad question leads to a dead end, but a great question rewrites the entire map of what is possible."
      quoteAttribution="Albert Einstein"
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={resolvedSection}
              className="admin-app__panel-layer"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.28, ease: PAGE_TRANSITION_EASE }
              }
            >
              {resolvedSection === "overview" &&
              (permissions.canViewOverview || permissions.canViewRevenue) ? (
            <AdminExecutiveRevenueSnapshot
              refreshKey={specialists
                .map(
                  (row) =>
                    `${row.id}:${row.isPremium}:${row.featured}:${row.sponsored}:${row.topRanked}:${row.visibility}`
                )
                .join("|")}
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
                  onVisibilityChange={async (
                    id,
                    visibility: AdminSpecialistVisibility
                  ) => {
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
                  onPremiumChange={(id, value) => {
                    if (!permissions.canFeatureSpecialists) return;
                    void setSpecialistFlag(id, "isPremium", value);
                  }}
                  onBasicsChange={(id, basics) => {
                    if (!permissions.canEditSpecialists) return;
                    void updateSpecialistBasics(id, basics);
                  }}
                  onProtectedChange={(id, value) => {
                    if (!permissions.canEditSpecialists) return;
                    void setSpecialistProtected(id, value);
                  }}
                  onAccountKindChange={(id, value) => {
                    if (!permissions.canEditSpecialists) return;
                    void setSpecialistAccountKind(id, value);
                  }}
                />
              ) : null}
              {resolvedSection === "clients" && permissions.canViewClients ? (
                <AdminClientsPanel canDelete={isOwnerAdmin} />
              ) : null}
              {resolvedSection === "revenue" && permissions.canViewRevenue ? (
                <AdminOwnerRevenuePanel />
              ) : null}
              {resolvedSection === "team" && permissions.canManageAdmins ? (
                <AdminTeamPanel />
              ) : null}
              {resolvedSection === "settings" && permissions.canManageSettings ? (
                <AdminSettingsPanel />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DashboardPageShell>
  );
}
