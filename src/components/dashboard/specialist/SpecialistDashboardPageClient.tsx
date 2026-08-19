"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardButton,
  DashboardLoadingState,
  DashboardPageShell,
  BoostVisibilityModal,
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
import { GrowthInsightsSection } from "@/components/dashboard/specialist/GrowthInsightsSection";
import { InquiryNotificationBanner } from "@/components/dashboard/specialist/InquiryNotificationBanner";
import { ProTrialLastChanceBanner } from "@/components/dashboard/specialist/ProTrialLastChanceBanner";
import { SpecialistDashboardAccountMenu } from "@/components/dashboard/specialist/SpecialistDashboardAccountMenu";
import { SpecialistDashboardProfileHeader } from "@/components/dashboard/specialist/SpecialistDashboardProfileHeader";
import { SpecialistDashboardProfilePreview } from "@/components/dashboard/specialist/SpecialistDashboardProfilePreview";
import { SpecialistProGhostPreview } from "@/components/dashboard/specialist/SpecialistProGhostPreview";
import { SpecialistPendingApprovalNotice } from "@/components/dashboard/specialist/SpecialistPendingApprovalNotice";
import { useSpecialistDashboard } from "@/hooks/useSpecialistDashboard";
import { resubmitSpecialistApplicationForReviewAsync } from "@/lib/admin-applications-service";
import {
  showsPremiumDashboard,
  showsProfileFirstDashboard,
} from "@/lib/specialist-dashboard-mode";
import { getSpecialistProPreviewAnalytics } from "@/lib/specialist-dashboard-analytics";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import {
  SMOAC_FREE_PLAN_LABEL,
  formatProTrialBadgeLabel,
  showProTrialLastChance,
  showSpecialistFreeTrialPromo,
  showSpecialistPaidUpgradePromo,
} from "@/lib/specialist-premium";
import { cn } from "@/lib/utils";

type FreeDashboardTab = "plan" | "profile";
type PremiumDashboardTab = "overview" | "profile";

const FREE_TABS: ReadonlyArray<{ id: FreeDashboardTab; label: string }> = [
  { id: "plan", label: "Plan & upgrade" },
  { id: "profile", label: "Edit profile" },
];

const PREMIUM_TABS: ReadonlyArray<{ id: PremiumDashboardTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Edit profile" },
];

function dashboardSubtitle(
  mode: ReturnType<typeof useSpecialistDashboard>["dashboardMode"]
): string {
  if (mode === "rejected") {
    return "Update your application, then request another review.";
  }
  if (mode === "pending") {
    return "Your application is under review.";
  }
  if (mode === "approved-free") {
    return "Your profile is live on Marketplace — deepen it anytime from Edit profile.";
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

function parsePremiumTab(value: string | null): PremiumDashboardTab {
  return value === "profile" ? "profile" : "overview";
}

export function SpecialistDashboardPageClient() {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "1";
  const [freeTab, setFreeTab] = useState<FreeDashboardTab>(() =>
    parseFreeTab(searchParams.get("tab"))
  );
  const [premiumTab, setPremiumTab] = useState<PremiumDashboardTab>(() =>
    parsePremiumTab(searchParams.get("tab"))
  );
  const [trialEndedOpen, setTrialEndedOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [requestReviewBusy, setRequestReviewBusy] = useState(false);
  const [requestReviewError, setRequestReviewError] = useState<string | null>(
    null
  );

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
    rankingRating,
    firstName,
    dashboardMode,
    inquiryUnreadCount,
    latestInquirySummary,
    handleSignOut,
    handleOpenInquiryLead,
    handleDismissInquiryNotifications,
  } = useSpecialistDashboard();

  useEffect(() => {
    if (session?.premiumTrialJustEnded) {
      setTrialEndedOpen(true);
    }
  }, [session?.premiumTrialJustEnded]);

  useEffect(() => {
    const promo = searchParams.get("promo");
    if (promo === "pro") {
      setUpgradeOpen(true);
    }
    if (promo === "boost") {
      setBoostOpen(true);
    }
  }, [searchParams]);

  async function handleRequestReview() {
    if (!application?.id) return;
    setRequestReviewBusy(true);
    setRequestReviewError(null);
    try {
      const result = await resubmitSpecialistApplicationForReviewAsync(
        application.id
      );
      if (!result.ok) {
        setRequestReviewError(result.message);
      }
    } finally {
      setRequestReviewBusy(false);
    }
  }

  if (!isReady || !session) {
    return <DashboardLoadingState />;
  }

  const isLivePublished = profileStatusLabel === "Published";
  const statusTone =
    isLivePublished
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

  function openOverviewAndInquiries() {
    void handleDismissInquiryNotifications();
    if (isFreeLive) {
      /* Free plan has no Overview — inquiries live on Edit profile. */
      setFreeTab("profile");
    } else if (premiumDashboard) {
      setPremiumTab("overview");
    }
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
      title={
        <>
          Good to see you, {firstName}
          {isLivePublished ? (
            <span
              className="dashboard-live-indicator"
              title="Live on Marketplace"
              aria-label="Live on Marketplace"
            >
              <span className="dashboard-live-indicator__dot" aria-hidden />
            </span>
          ) : null}
        </>
      }
      subtitle={dashboardSubtitle(dashboardMode)}
      roleLabel={roleLabel}
      roleLabelTone={
        onProTrial || isPremium ? "pro-trial" : "default"
      }
      statusLabel={
        profileFirst || isLivePublished ? null : profileStatusLabel
      }
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
            unreadCount={inquiryUnreadCount}
            latestSummary={latestInquirySummary}
            onReview={openOverviewAndInquiries}
            onDismiss={() => {
              void handleDismissInquiryNotifications();
            }}
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
                  aria-selected={freeTab === tab.id}
                  aria-controls={`specialist-dash-panel-${tab.id}`}
                  className={cn(
                    "specialist-dash-tabs__btn",
                    freeTab === tab.id && "specialist-dash-tabs__btn--active"
                  )}
                  onClick={() => setFreeTab(tab.id)}
                >
                  {tab.label}
                  {tab.id === "profile" && inquiryUnreadCount > 0 ? (
                    <span className="specialist-dash-tabs__count">
                      {inquiryUnreadCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="specialist-dash-panels">
              {freeTab === "plan" ? (
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

              {freeTab === "profile" ? (
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
                rejectionReason={application?.rejectionReason}
                onRequestReview={
                  dashboardMode === "rejected" ? handleRequestReview : undefined
                }
                requestReviewBusy={requestReviewBusy}
                requestReviewError={requestReviewError}
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
                finishes saving. Pull to refresh if this keeps happening.
              </p>
            ) : null}

            {isPendingGate && dashboardMode === "rejected" ? (
              <DashboardButton
                href="/specialist-dashboard/edit-profile"
                className="specialist-dash-layout__edit-btn"
              >
                Edit submitted profile
              </DashboardButton>
            ) : null}
            {dashboardMode === "pending" ? (
              <p className="specialist-dash-notice__text">
                If some information was entered incorrectly, it can be fixed
                once your application is approved.
              </p>
            ) : dashboardMode === "rejected" ? (
              <p className="specialist-dash-notice__text">
                After approval, come back here to finish your full in-depth
                profile — pricing, availability, media, and more.
              </p>
            ) : null}
          </>
        ) : null}

        {premiumDashboard ? (
          <>
            <div
              className="specialist-dash-tabs"
              role="tablist"
              aria-label="Specialist dashboard sections"
            >
              {PREMIUM_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`specialist-dash-tab-premium-${tab.id}`}
                  aria-selected={premiumTab === tab.id}
                  aria-controls={`specialist-dash-panel-premium-${tab.id}`}
                  className={cn(
                    "specialist-dash-tabs__btn",
                    premiumTab === tab.id && "specialist-dash-tabs__btn--active"
                  )}
                  onClick={() => setPremiumTab(tab.id)}
                >
                  {tab.label}
                  {tab.id === "overview" && inquiryUnreadCount > 0 ? (
                    <span className="specialist-dash-tabs__count">
                      {inquiryUnreadCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="specialist-dash-panels">
              {premiumTab === "overview" ? (
                <div
                  id="specialist-dash-panel-premium-overview"
                  role="tabpanel"
                  aria-labelledby="specialist-dash-tab-premium-overview"
                  className="specialist-dash-panel"
                >
                  <div className="dashboard-overview-accordions">
                    <LeadsCard
                      leads={data.newLeads}
                      onOpenLead={handleOpenInquiryLead}
                      defaultOpen
                    />
                    <AnalyticsCard
                      analytics={analytics}
                      isPremium={isPremium}
                      includeGrowthInsights={false}
                    />
                    <GrowthInsightsSection
                      insights={analytics.growthInsights}
                      isPremium={isPremium}
                      collapsible
                    />
                    <ProfileCompletionCard
                      profileCompletion={profileCompletion}
                      trainer={trainer}
                      checklist={completionChecklist}
                    />
                    <VisibilityRankingCard
                      ranking={data.ranking ?? null}
                      isPremium={isPremium}
                      smoacRating={rankingRating.rating}
                      smoacReviewCount={rankingRating.reviewCount}
                      categoryLabel={
                        trainer
                          ? resolveTrainerProfessionCategory(trainer)
                          : undefined
                      }
                    />
                    <ReviewsCard
                      trainer={trainer}
                      isPremium={isPremium}
                      onUpgrade={() => setUpgradeOpen(true)}
                    />
                  </div>
                </div>
              ) : null}

              {premiumTab === "profile" ? (
                <div
                  id="specialist-dash-panel-premium-profile"
                  role="tabpanel"
                  aria-labelledby="specialist-dash-tab-premium-profile"
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

                  <div className="specialist-dash-panel__footer-card">
                    <SubscriptionCard subscription={data.subscription} />
                  </div>
                </div>
              ) : null}
            </div>
          </>
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
    <BoostVisibilityModal
      open={boostOpen}
      onClose={() => setBoostOpen(false)}
    />
    </>
  );
}
