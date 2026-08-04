"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardButton,
  DashboardGrid,
  DashboardLoadingState,
  DashboardPageShell,
  PremiumTrialEndedModal,
  SmoacProUpgradeModal,
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
import { ProTrialLastChanceBanner } from "@/components/dashboard/specialist/ProTrialLastChanceBanner";
import { SpecialistDashboardAccountMenu } from "@/components/dashboard/specialist/SpecialistDashboardAccountMenu";
import { SpecialistDashboardProfileHeader } from "@/components/dashboard/specialist/SpecialistDashboardProfileHeader";
import { SpecialistDashboardProfilePreview } from "@/components/dashboard/specialist/SpecialistDashboardProfilePreview";
import { SpecialistProGhostPreview } from "@/components/dashboard/specialist/SpecialistProGhostPreview";
import { SpecialistPendingApprovalNotice } from "@/components/dashboard/specialist/SpecialistPendingApprovalNotice";
import { useSpecialistDashboard } from "@/hooks/useSpecialistDashboard";
import { useSpecialistInquiryNotifications } from "@/hooks/useSpecialistInquiryNotifications";
import {
  showsPremiumDashboard,
  showsProfileFirstDashboard,
} from "@/lib/specialist-dashboard-mode";
import { getSpecialistProPreviewAnalytics } from "@/lib/specialist-dashboard-analytics";
import {
  SMOAC_FREE_PLAN_LABEL,
  formatProTrialBadgeLabel,
  showProTrialLastChance,
  showSpecialistFreeTrialPromo,
  showSpecialistPaidUpgradePromo,
} from "@/lib/specialist-premium";
import { cn } from "@/lib/utils";

type FreeDashboardTab = "plan" | "profile";

const FREE_TABS: ReadonlyArray<{ id: FreeDashboardTab; label: string }> = [
  { id: "plan", label: "Plan & upgrade" },
  { id: "profile", label: "Edit profile" },
];

function dashboardSubtitle(
  mode: ReturnType<typeof useSpecialistDashboard>["dashboardMode"],
  trialDaysRemaining?: number
): string {
  if (mode === "pending" || mode === "rejected") {
    return "Your application is under review.";
  }
  if (mode === "approved-free") {
    return "Your profile is live — finish your in-depth profile anytime.";
  }
  if (
    (mode === "approved-premium" || mode === "demo-premium") &&
    typeof trialDaysRemaining === "number"
  ) {
    return `Pro trial · ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left`;
  }
  return "Manage your profile, leads, and marketplace visibility.";
}

function scrollToInquiries() {
  document
    .getElementById("specialist-inquiries")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function parseFreeTab(value: string | null): FreeDashboardTab {
  return value === "profile" ? "profile" : "plan";
}

export function SpecialistDashboardPageClient() {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "1";
  const [activeTab, setActiveTab] = useState<FreeDashboardTab>(() =>
    parseFreeTab(searchParams.get("tab"))
  );
  const [trialEndedOpen, setTrialEndedOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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
    rankingRating,
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

  useEffect(() => {
    if (session?.premiumTrialJustEnded) {
      setTrialEndedOpen(true);
    }
  }, [session?.premiumTrialJustEnded]);

  useEffect(() => {
    if (searchParams.get("promo") === "pro") {
      setUpgradeOpen(true);
    }
  }, [searchParams]);

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
  const isFreeLive = dashboardMode === "approved-free";
  const onProTrial = Boolean(session.premiumTrialActive);
  const showLastChance = showProTrialLastChance(session);

  const leadUnread = data.newLeads.filter((lead) => lead.unread).length;
  const bannerUnread = Math.max(notificationUnread, leadUnread);

  function openProfileTabAndInquiries() {
    dismissAll();
    setActiveTab("profile");
    window.requestAnimationFrame(() => {
      window.setTimeout(scrollToInquiries, 80);
    });
  }

  const roleLabel = onProTrial
    ? formatProTrialBadgeLabel(session.premiumTrialDaysRemaining)
    : isFreeLive
      ? SMOAC_FREE_PLAN_LABEL
      : isPremium
        ? "SMOAC Pro"
        : "Specialist";

  return (
    <>
    <DashboardPageShell
      variant="specialist"
      eyebrow="Specialist dashboard"
      title={`Good to see you, ${firstName}`}
      subtitle={dashboardSubtitle(
        dashboardMode,
        onProTrial ? session.premiumTrialDaysRemaining : undefined
      )}
      roleLabel={roleLabel}
      roleLabelTone={onProTrial ? "pro-trial" : "default"}
      statusLabel={profileFirst ? null : profileStatusLabel}
      statusTone={statusTone}
      utilityBar={<SpecialistDashboardAccountMenu onSignOut={handleSignOut} />}
    >
      <div className="specialist-dash-layout">
        {showLastChance ? (
          <ProTrialLastChanceBanner
            daysRemaining={session.premiumTrialDaysRemaining}
          />
        ) : null}

        {showsInquiries ? (
          <InquiryNotificationBanner
            unreadCount={bannerUnread}
            latestSummary={latestSummary}
            onReview={
              isFreeLive
                ? openProfileTabAndInquiries
                : () => {
                    dismissAll();
                    scrollToInquiries();
                  }
            }
            onDismiss={dismissAll}
          />
        ) : null}

        {isFreeLive ? (
          <>
            <div
              className="specialist-dash-tabs"
              role="tablist"
              aria-label="Specialist dashboard sections"
            >
              {FREE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`specialist-dash-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`specialist-dash-panel-${tab.id}`}
                  className={cn(
                    "specialist-dash-tabs__btn",
                    activeTab === tab.id && "specialist-dash-tabs__btn--active"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {tab.id === "profile" && bannerUnread > 0 ? (
                    <span className="specialist-dash-tabs__count">
                      {bannerUnread}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="specialist-dash-panels">
              {activeTab === "plan" ? (
                <div
                  id="specialist-dash-panel-plan"
                  role="tabpanel"
                  aria-labelledby="specialist-dash-tab-plan"
                  className="specialist-dash-panel"
                >
                  <SpecialistProGhostPreview
                    firstName={firstName}
                    analytics={getSpecialistProPreviewAnalytics({
                      profileCompletionPercent: profileCompletion,
                      rankingPosition: data.ranking?.rank ?? null,
                    })}
                    showTrialPromo={showSpecialistFreeTrialPromo(session)}
                    showUpgradePromo={showSpecialistPaidUpgradePromo(session)}
                  />
                </div>
              ) : null}

              {activeTab === "profile" ? (
                <div
                  id="specialist-dash-panel-profile"
                  role="tabpanel"
                  aria-labelledby="specialist-dash-tab-profile"
                  className="specialist-dash-panel"
                >
                  <SpecialistDashboardProfileHeader variant="live-free" />

                  {hasProfilePreview ? (
                    <SpecialistDashboardProfilePreview
                      trainer={trainer!}
                      editable
                      isPremium={isPremium}
                    />
                  ) : (
                    <p className="specialist-dash-notice__text">
                      Your profile preview will appear here once it finishes
                      loading. Pull to refresh, or open the full editor.
                    </p>
                  )}

                  <LeadsCard
                    leads={data.newLeads}
                    onOpenLead={handleOpenInquiryLead}
                  />
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {profileFirst && !isFreeLive ? (
          <>
            {isPendingGate ? (
              <SpecialistPendingApprovalNotice
                variant={
                  dashboardMode === "rejected"
                    ? "rejected"
                    : application
                      ? "pending"
                      : "missing"
                }
                justSubmitted={
                  justSubmitted &&
                  dashboardMode === "pending" &&
                  Boolean(application)
                }
              />
            ) : null}

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
                    trainer={trainer!}
                    editable={false}
                  />
                </div>
              </div>
            ) : isPendingGate ? (
              <p className="specialist-dash-notice__text">
                Your submitted details will appear here once your application
                finishes saving. Pull to refresh, or edit your profile below.
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
            {isPendingGate ? (
              <p className="specialist-dash-notice__text">
                After approval, come back here to finish your full in-depth
                profile — pricing, availability, media, and more.
              </p>
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
              isPremium={isPremium}
              smoacRating={rankingRating.rating}
              smoacReviewCount={rankingRating.reviewCount}
            />
            <ReviewsCard trainer={trainer} isPremium={isPremium} />
            <SubscriptionCard subscription={data.subscription} />
          </DashboardGrid>
        ) : null}
      </div>
    </DashboardPageShell>
    <PremiumTrialEndedModal
      open={trialEndedOpen}
      onClose={() => setTrialEndedOpen(false)}
    />
    <SmoacProUpgradeModal
      open={upgradeOpen}
      onClose={() => setUpgradeOpen(false)}
    />
    </>
  );
}
