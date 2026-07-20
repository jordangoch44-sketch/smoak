"use client";

import { useSearchParams } from "next/navigation";
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
import { InquiryNotificationBanner } from "@/components/dashboard/specialist/InquiryNotificationBanner";
import { SpecialistDashboardProfileHeader } from "@/components/dashboard/specialist/SpecialistDashboardProfileHeader";
import { SpecialistDashboardProfilePreview } from "@/components/dashboard/specialist/SpecialistDashboardProfilePreview";
import { SpecialistDashboardUpgradeCta } from "@/components/dashboard/specialist/SpecialistDashboardUpgradeCta";
import { SpecialistPendingApprovalNotice } from "@/components/dashboard/specialist/SpecialistPendingApprovalNotice";
import { useSpecialistDashboard } from "@/hooks/useSpecialistDashboard";
import { useSpecialistInquiryNotifications } from "@/hooks/useSpecialistInquiryNotifications";
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

function scrollToInquiries() {
  document
    .getElementById("specialist-inquiries")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SpecialistDashboardPageClient() {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "1";

  const {
    isReady,
    session,
    data,
    trainer,
    trainerId,
    application,
    profileCompletion,
    completionChecklist,
    profileStatusLabel,
    analytics,
    isPremium,
    firstName,
    dashboardMode,
    handleSignOut,
    handleOpenInquiryLead,
  } = useSpecialistDashboard();

  const {
    unreadCount: notificationUnread,
    latestSummary,
    dismissAll,
  } = useSpecialistInquiryNotifications(trainerId);

  if (!isReady || !session) {
    return <DashboardLoadingState />;
  }

  const statusTone =
    profileStatusLabel === "Published"
      ? "active"
      : profileStatusLabel === "Needs changes"
        ? "rejected"
        : "pending";

  const profileFirst = showsProfileFirstDashboard(dashboardMode);
  const premiumDashboard = showsPremiumDashboard(dashboardMode);
  const hasProfilePreview = Boolean(application && trainer);
  const showsInquiries =
    dashboardMode === "approved-free" ||
    dashboardMode === "approved-premium" ||
    dashboardMode === "demo-premium";
  const isPendingGate =
    dashboardMode === "pending" || dashboardMode === "rejected";

  const leadUnread = data.newLeads.filter((lead) => lead.unread).length;
  const bannerUnread = Math.max(notificationUnread, leadUnread);

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
        {showsInquiries ? (
          <InquiryNotificationBanner
            unreadCount={bannerUnread}
            latestSummary={latestSummary}
            onReview={() => {
              dismissAll();
              scrollToInquiries();
            }}
            onDismiss={dismissAll}
          />
        ) : null}

        {profileFirst ? (
          <>
            {isPendingGate ? (
              <SpecialistPendingApprovalNotice
                variant={dashboardMode === "rejected" ? "rejected" : "pending"}
                justSubmitted={justSubmitted && dashboardMode === "pending"}
              />
            ) : null}

            {dashboardMode === "approved-free" && (
              <SpecialistDashboardProfileHeader variant="live-free" />
            )}

            {dashboardMode === "pending" && hasProfilePreview ? (
              <SpecialistDashboardProfileHeader variant="pending" />
            ) : null}

            {hasProfilePreview ? (
              <div
                className={
                  isPendingGate
                    ? "specialist-dash-pending-preview"
                    : undefined
                }
              >
                {dashboardMode === "pending" ? (
                  <div
                    className="specialist-dash-pending-preview__badge"
                    aria-hidden
                  >
                    <span className="specialist-dash-pending-preview__badge-icon" />
                    <span>Pending verification</span>
                  </div>
                ) : null}
                <div
                  className={
                    isPendingGate
                      ? "specialist-dash-pending-preview__content"
                      : undefined
                  }
                >
                  <SpecialistDashboardProfilePreview
                    application={application!}
                    trainer={trainer!}
                    editable={dashboardMode === "approved-free"}
                  />
                </div>
              </div>
            ) : isPendingGate ? (
              <p className="specialist-dash-notice__text">
                Your submitted details will appear here once your application finishes
                saving. Pull to refresh, or edit your profile below.
              </p>
            ) : null}

            {isPendingGate ? (
              <DashboardButton
                href="/specialist-dashboard/edit-profile"
                className="specialist-dash-layout__edit-btn"
              >
                Edit submitted profile
              </DashboardButton>
            ) : null}

            {dashboardMode === "approved-free" ? (
              <>
                <LeadsCard
                  leads={data.newLeads}
                  onOpenLead={handleOpenInquiryLead}
                />
                <SpecialistDashboardUpgradeCta />
              </>
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
            <LeadsCard
              leads={data.newLeads}
              onOpenLead={handleOpenInquiryLead}
            />
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
