"use client";

import {
  DashboardButton,
  DashboardGrid,
  DashboardLoadingState,
  DashboardPageShell,
  DashboardSignOutButton,
} from "@/components/dashboard/shared";
import {
  AnalyticsCard,
  LeadsCard,
  ProfileCompletionCard,
  ReviewsCard,
  SubscriptionCard,
  VisibilityRankingCard,
} from "@/components/dashboard/specialist/cards";
import { SpecialistDashboardProfileHeader } from "@/components/dashboard/specialist/SpecialistDashboardProfileHeader";
import { SpecialistDashboardProfilePreview } from "@/components/dashboard/specialist/SpecialistDashboardProfilePreview";
import { SpecialistDashboardUpgradeCta } from "@/components/dashboard/specialist/SpecialistDashboardUpgradeCta";
import { SpecialistPendingApprovalNotice } from "@/components/dashboard/specialist/SpecialistPendingApprovalNotice";
import { useSpecialistDashboard } from "@/hooks/useSpecialistDashboard";
import {
  showsPremiumDashboard,
  showsProfileFirstDashboard,
} from "@/lib/specialist-dashboard-mode";

function dashboardSubtitle(mode: ReturnType<typeof useSpecialistDashboard>["dashboardMode"]): string {
  if (mode === "pending" || mode === "rejected") {
    return "Your application is under review.";
  }
  if (mode === "approved-free") {
    return "Your profile is live on SMOAC.";
  }
  return "Manage your profile, leads, and marketplace visibility.";
}

export function SpecialistDashboardPageClient() {
  const {
    isReady,
    session,
    data,
    trainer,
    application,
    profileCompletion,
    completionChecklist,
    profileStatusLabel,
    analytics,
    isPremium,
    firstName,
    dashboardMode,
    handleSignOut,
  } = useSpecialistDashboard();

  if (!isReady || !session) {
    return <DashboardLoadingState />;
  }

  const statusTone =
    profileStatusLabel === "Active"
      ? "active"
      : profileStatusLabel === "Needs changes"
        ? "rejected"
        : "pending";

  const profileFirst = showsProfileFirstDashboard(dashboardMode);
  const premiumDashboard = showsPremiumDashboard(dashboardMode);
  const hasProfilePreview = Boolean(application && trainer);

  return (
    <DashboardPageShell
      variant="specialist"
      eyebrow="Specialist dashboard"
      title={`Good to see you, ${firstName}`}
      subtitle={dashboardSubtitle(dashboardMode)}
      roleLabel="Specialist"
      statusLabel={profileFirst ? null : profileStatusLabel}
      statusTone={statusTone}
      utilityBar={<DashboardSignOutButton onClick={handleSignOut} />}
    >
      <div className="specialist-dash-layout">
        {profileFirst ? (
          <>
            {(dashboardMode === "pending" || dashboardMode === "rejected") && (
              <SpecialistPendingApprovalNotice
                variant={dashboardMode === "rejected" ? "rejected" : "pending"}
              />
            )}

            {dashboardMode === "approved-free" && (
              <SpecialistDashboardProfileHeader variant="live-free" />
            )}

            {dashboardMode !== "approved-free" && hasProfilePreview ? (
              <SpecialistDashboardProfileHeader variant="pending" />
            ) : null}

            {hasProfilePreview ? (
              <SpecialistDashboardProfilePreview
                application={application!}
                trainer={trainer!}
                editable={dashboardMode === "approved-free"}
              />
            ) : null}

            {dashboardMode === "pending" || dashboardMode === "rejected" ? (
              <DashboardButton
                href="/specialist-dashboard/edit-profile"
                className="specialist-dash-layout__edit-btn"
              >
                Edit submitted profile
              </DashboardButton>
            ) : null}

            {dashboardMode === "approved-free" ? (
              <SpecialistDashboardUpgradeCta />
            ) : null}
          </>
        ) : null}

        {premiumDashboard ? (
          <DashboardGrid>
            <AnalyticsCard analytics={analytics} isPremium={isPremium} />
            <ProfileCompletionCard
              profileCompletion={profileCompletion}
              trainer={trainer}
              checklist={completionChecklist}
            />
            <LeadsCard leads={data.newLeads} />
            <VisibilityRankingCard
              ranking={data.ranking ?? null}
              trainer={trainer}
              isPremium={isPremium}
            />
            <ReviewsCard trainer={trainer} isPremium={isPremium} />
            <SubscriptionCard subscription={data.subscription} />
          </DashboardGrid>
        ) : null}
      </div>
    </DashboardPageShell>
  );
}
