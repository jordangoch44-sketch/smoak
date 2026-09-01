"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLoadingState } from "@/components/dashboard";
import {
  AdminSectionNav,
  type AdminSectionId,
} from "@/components/admin/AdminSectionNav";
import { AdminJarvisFloatingWidget } from "@/components/admin/AdminJarvisFloatingWidget";
import { AdminExecutiveRevenueSnapshot } from "@/components/admin/AdminExecutiveRevenueSnapshot";
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
import { liveBillingBySpecialistId } from "@/lib/admin-specialist-billing-service";
import { markAdminSectionBadgeSeen } from "@/lib/admin-section-badge-seen-store";
import { useInternalAuthSession } from "@/hooks/useInternalAuthSession";
import { buildInternalLoginHref } from "@/lib/internal-routes";
import type { AdminApplicationMutationResult } from "@/lib/admin-applications-service";
import type { AdminNotifiableSectionId } from "@/types/admin-notifications";
import type { SpecialistApplication } from "@/types/specialist-application";
import type { AdminSpecialistVisibility } from "@/types/admin";
import type { AdminPlatformPulse } from "@/types/admin-platform-pulse";
import type { SpecialistBillingRecord } from "@/types/admin-specialist-billing";
import { SmoacWordmark } from "@/components/brand/SmoacWordmark";

function getInitials(name: string): string {
  if (!name || !name.trim()) return "JG";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

  const [pulse, setPulse] = useState<AdminPlatformPulse | null>(null);
  const [isPulseLoading, setIsPulseLoading] = useState(true);
  const [pulseRefreshKey, setPulseRefreshKey] = useState(0);
  const [liveBillingById, setLiveBillingById] = useState<
    Map<string, SpecialistBillingRecord>
  >(() => new Map());
  const [stripeBillingByProfileId, setStripeBillingByProfileId] = useState<
    Map<string, string>
  >(() => new Map());

  const specialistKey = useMemo(
    () =>
      specialists
        .map(
          (row) =>
            `${row.id}:${row.isPremium}:${row.featured}:${row.sponsored}:${row.topRanked}:${row.visibility}`
        )
        .join("|"),
    [specialists]
  );

  const fetchPulse = useCallback(() => {
    let cancelled = false;
    setIsPulseLoading(true);
    fetch("/api/admin/platform-pulse", { credentials: "include" })
      .then((res) => res.json())
      .then((body: { ok?: boolean; pulse?: AdminPlatformPulse }) => {
        if (cancelled || !body?.ok || !body.pulse) return;
        setPulse(body.pulse);
      })
      .catch(() => {
        if (!cancelled) setPulse(null);
      })
      .finally(() => {
        if (!cancelled) setIsPulseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return fetchPulse();
  }, [fetchPulse, specialistKey, pulseRefreshKey]);

  useEffect(() => {
    if (!access?.isOwnerAdmin) {
      setLiveBillingById(new Map());
      setStripeBillingByProfileId(new Map());
      return;
    }
    let cancelled = false;
    void fetch("/api/admin/revenue", { credentials: "include" })
      .then((res) => res.json())
      .then(
        (body: {
          ok?: boolean;
          billingRows?: Array<{
            specialistProfileId: string | null;
            specialistName: string;
            status: string;
            plan?: string | null;
            activeAddOns?: string[] | null;
            membershipCents?: number;
            addonCents?: number;
          }>;
        }) => {
          if (cancelled || !body?.ok) return;
          const rows = body.billingRows ?? [];
          setLiveBillingById(liveBillingBySpecialistId(rows));
          const statuses = new Map<string, string>();
          for (const row of rows) {
            const id = row.specialistProfileId?.trim();
            if (id) statuses.set(id, row.status);
          }
          setStripeBillingByProfileId(statuses);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setLiveBillingById(new Map());
          setStripeBillingByProfileId(new Map());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [access?.isOwnerAdmin, specialistKey, pulseRefreshKey]);

  const billingById = access?.isOwnerAdmin ? liveBillingById : undefined;

  const [activeSection, setActiveSection] = useState<AdminSectionId>("overview");
  const allApplications = applications;

  const sectionBadgeCounts = useAdminSectionBadgeCounts({
    applications,
    clientApplications,
    specialists,
    billingById,
    stripeBillingByProfileId,
    isOwnerAdmin: access?.isOwnerAdmin ?? false,
  });

  const attentionItemIds = useAdminSectionAttentionItemIds({
    applications,
    clientApplications,
    specialists,
    billingById,
    stripeBillingByProfileId,
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
  const adminDisplayName = isOwnerAdmin
    ? "Jordan Gochenour"
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
    <div className="admin-apple-layout">
      {/* Luxury Dark SMOAC Top Bar & Navigation */}
      <header className="admin-apple-topbar">
        <div className="admin-apple-topbar__inner">
          <div className="admin-apple-topbar__brand">
            <div className="admin-apple-topbar__logo">
              <SmoacWordmark
                variant="compact"
                tone="white"
                priority
                className="admin-apple-topbar__wordmark"
              />
            </div>
            <div className="admin-apple-topbar__status">
              <span className="admin-apple-topbar__pulse-dot" />
              <span className="admin-apple-topbar__status-label">CONTROL</span>
            </div>
          </div>

          <div className="admin-apple-topbar__actions">
            <button
              type="button"
              className="admin-apple-topbar__refresh-btn"
              onClick={() => setPulseRefreshKey((k) => k + 1)}
              title="Refresh live telemetry"
              aria-label="Refresh live telemetry"
            >
              <svg
                className="admin-apple-topbar__refresh-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>

            <div className="admin-apple-topbar__user-pill">
              <div className="admin-apple-topbar__user-text">
                <span className="admin-apple-topbar__user-name">
                  {adminDisplayName}
                </span>
                <span className="admin-apple-topbar__user-role">
                  {isOwnerAdmin ? "CEO" : roleLabel}
                </span>
              </div>
              <div className="admin-apple-topbar__user-avatar" aria-hidden="true">
                {getInitials(adminDisplayName)}
              </div>
            </div>

            <button
              type="button"
              className="admin-apple-topbar__signout-btn"
              onClick={handleSignOut}
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Minimalist Horizontal Navigation Bar Directly Below */}
        <div className="admin-apple-topbar__nav-bar">
          <div className="admin-apple-topbar__nav-inner">
            <AdminSectionNav
              activeId={resolvedSection}
              allowedSectionIds={allowedSectionIds}
              badgeCounts={sectionBadgeCounts}
              onSelect={setActiveSection}
            />
          </div>
        </div>
      </header>

      {/* Main Admin Page Container */}
      <main className="admin-apple-main">
        {/* Active Tab Panel */}
        <div
          className="admin-apple-panel"
          role="tabpanel"
          id={`admin-panel-${resolvedSection}`}
          aria-labelledby={`admin-tab-${resolvedSection}`}
        >
          <div key={resolvedSection} className="admin-apple-panel-layer">
            {resolvedSection === "overview" &&
            (permissions.canViewOverview || permissions.canViewRevenue) ? (
              <AdminExecutiveRevenueSnapshot
                refreshKey={specialistKey}
                pulse={pulse}
                canViewRevenue={permissions.canViewRevenue}
                onOpenRevenue={() => setActiveSection("revenue")}
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
                onSaveClient={async (app) => {
                  if (!permissions.canApproveApplications) {
                    return {
                      ok: false,
                      message: "Missing permission to edit applications.",
                    };
                  }
                  return saveClientApplicationEdits(app);
                }}
                onApproveClient={async (app) => {
                  if (!permissions.canApproveApplications) {
                    return {
                      ok: false,
                      message: "Missing permission to approve applications.",
                    };
                  }
                  return approveClientApplication(app);
                }}
                onRejectClient={async (app) => {
                  if (!permissions.canApproveApplications) {
                    return {
                      ok: false,
                      message: "Missing permission to reject applications.",
                    };
                  }
                  return rejectClientApplication(app);
                }}
                onArchiveClient={async (app) => {
                  if (!permissions.canApproveApplications) {
                    return {
                      ok: false,
                      message: "Missing permission to archive applications.",
                    };
                  }
                  return archiveClientApplication(app);
                }}
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
          </div>
        </div>
      </main>

      {/* Floating Jarvis Assistant */}
      <AdminJarvisFloatingWidget pulse={pulse} adminName={adminDisplayName} />
    </div>
  );
}
