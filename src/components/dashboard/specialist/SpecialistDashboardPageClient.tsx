"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardButton,
  DashboardLoadingState,
  DashboardPageShell,
  BoostVisibilityModal,
  PremiumTrialEndedModal,
  SmoacProUpgradeModal,
  DashboardSignOutConfirmModal,
} from "@/components/dashboard/shared";
import {
  AnalyticsCard,
  BoostProfileCard,
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
import { resubmitSpecialistApplicationForReviewAsync } from "@/lib/admin-applications-service";
import {
  SPECIALIST_DASHBOARD_INQUIRIES_HREF,
  SPECIALIST_DASHBOARD_OVERVIEW_HREF,
  SPECIALIST_DASHBOARD_PATH,
  SPECIALIST_DASHBOARD_PROFILE_TAB_HREF,
} from "@/lib/auth-routes";
import { SPECIALIST_ONBOARDING_RESUME_HREF } from "@/lib/join-flow";
import {
  showsPremiumDashboard,
  showsProfileFirstDashboard,
} from "@/lib/specialist-dashboard-mode";
import { getSpecialistProPreviewAnalytics } from "@/lib/specialist-dashboard-analytics";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import {
  SMOAC_FREE_PLAN_LABEL,
  formatProTrialBadgeLabel,
  isProPlusPlan,
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

type SpecialistDashHeaderSurface = "overview" | "profile" | "plan" | "status";

function dashboardSubtitle(
  mode: ReturnType<typeof useSpecialistDashboard>["dashboardMode"]
): string {
  if (mode === "rejected") {
    return "Update your application, then request another review.";
  }
  if (mode === "onboarding") {
    return "Finish your application to send it for review.";
  }
  if (mode === "pending") {
    return "Your application is under review.";
  }
  if (mode === "approved-free") {
    return "Your profile is live on Marketplace — deepen it anytime from Edit profile.";
  }
  return "Manage your profile, inquiries, and marketplace visibility.";
}

function parseFreeTab(
  value: string | null,
  openInquiries: boolean
): FreeDashboardTab {
  if (openInquiries) return "profile";
  return value === "plan" ? "plan" : "profile";
}

function parsePremiumTab(
  value: string | null,
  openInquiries: boolean
): PremiumDashboardTab {
  if (openInquiries) return "profile";
  return value === "overview" ? "overview" : "profile";
}

function hrefForDashboardTab(tab: FreeDashboardTab | PremiumDashboardTab): string {
  if (tab === "profile") {
    return SPECIALIST_DASHBOARD_PROFILE_TAB_HREF;
  }
  if (tab === "plan") {
    return `${SPECIALIST_DASHBOARD_PATH}?tab=plan`;
  }
  return SPECIALIST_DASHBOARD_OVERVIEW_HREF;
}

export function SpecialistDashboardPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "1";
  const tabParam = searchParams.get("tab");
  const conversationParam = searchParams.get("c")?.trim() || "";
  const inquiriesView = searchParams.get("view") === "inquiries";
  const openInquiries = Boolean(conversationParam) || inquiriesView;
  const [freeTab, setFreeTab] = useState<FreeDashboardTab>(() =>
    parseFreeTab(tabParam, openInquiries)
  );
  const [premiumTab, setPremiumTab] = useState<PremiumDashboardTab>(() =>
    parsePremiumTab(tabParam, openInquiries)
  );
  const [trialEndedOpen, setTrialEndedOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [focusSection, setFocusSection] = useState<string | null>(() => {
    return searchParams.get("focus") || searchParams.get("section");
  });
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
    isHydrated,
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

  useEffect(() => {
    setFreeTab(parseFreeTab(tabParam, openInquiries));
    setPremiumTab(parsePremiumTab(tabParam, openInquiries));
  }, [tabParam, openInquiries]);

  useEffect(() => {
    if (!isReady || !session || !isHydrated) return;
    if (dashboardMode !== "onboarding") return;
    router.replace(SPECIALIST_ONBOARDING_RESUME_HREF);
  }, [isReady, session, isHydrated, dashboardMode, router]);

  function replaceDashboardTab(tab: FreeDashboardTab | PremiumDashboardTab) {
    const nextHref = hrefForDashboardTab(tab);
    if (typeof window !== "undefined") {
      const current = `${window.location.pathname}${window.location.search}`;
      if (current === nextHref) return;
    }
    router.replace(nextHref, { scroll: false });
  }

  function replaceConversationParam(id: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "profile");
    next.set("view", "inquiries");
    if (id) next.set("c", id);
    else next.delete("c");
    const qs = next.toString();
    router.replace(
      qs ? `${SPECIALIST_DASHBOARD_PATH}?${qs}` : SPECIALIST_DASHBOARD_INQUIRIES_HREF,
      { scroll: false }
    );
  }

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

  if (!isHydrated) {
    return <DashboardLoadingState />;
  }

  if (dashboardMode === "onboarding") {
    return <DashboardLoadingState message="Opening your application…" />;
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
  const isProPlus = isProPlusPlan(session.membershipPlan);
  const showLastChance = showProTrialLastChance(session);

  const headerSurface: SpecialistDashHeaderSurface = isPendingGate
    ? "status"
    : premiumDashboard
      ? premiumTab === "profile"
        ? "profile"
        : "overview"
      : isFreeLive
        ? freeTab === "profile"
          ? "profile"
          : "plan"
        : "status";

  function openProfileInquiries() {
    void handleDismissInquiryNotifications();
    router.replace(SPECIALIST_DASHBOARD_INQUIRIES_HREF, { scroll: false });
  }

  const inquiryPreviewProps = showsInquiries
    ? {
        inquiryLeads: data.newLeads,
        inquirySenderUserId: session.userId,
        inquiryUnreadCount,
        initialConversationId: conversationParam || null,
        onOpenInquiryLead: (lead: (typeof data.newLeads)[number]) => {
          void handleOpenInquiryLead(lead);
          replaceConversationParam(lead.id);
        },
        onCloseInquiryThread: () => replaceConversationParam(null),
      }
    : {};

  function handleNavigateToProfile(sectionId?: string) {
    if (sectionId) {
      setFocusSection(sectionId);
    }
    replaceDashboardTab("profile");
  }

  const liveDot =
    isLivePublished && headerSurface !== "plan" ? (
      <span
        className="dashboard-live-indicator"
        title="Live on Marketplace"
        aria-label="Live on Marketplace"
      >
        <span className="dashboard-live-indicator__dot" aria-hidden />
      </span>
    ) : null;

  const profilePlanLabel = onProTrial
    ? formatProTrialBadgeLabel(session.premiumTrialDaysRemaining)
    : isFreeLive
      ? SMOAC_FREE_PLAN_LABEL
      : isProPlus
        ? "SMOAC Pro Plus"
        : isPremium
          ? "SMOAC Pro"
          : "Specialist";

  /* Pro Trial days badge lives on Profile only — not Overview. */
  const roleLabel =
    headerSurface === "profile"
      ? profilePlanLabel
      : headerSurface === "plan"
        ? SMOAC_FREE_PLAN_LABEL
        : headerSurface === "overview" && isPremium && !onProTrial
          ? "SMOAC Pro"
          : undefined;

  const roleLabelTone =
    headerSurface === "profile" && (onProTrial || isPremium)
      ? "pro-trial"
      : headerSurface === "overview" && isPremium && !onProTrial
        ? "pro-trial"
        : "default";

  const headerCopy =
    headerSurface === "overview"
      ? {
          eyebrow: "Overview",
          title: (
            <>
              Good to see you, {firstName}
              {liveDot}
            </>
          ),
          subtitle:
            "Analytics and how you show up on Marketplace — at a glance.",
        }
      : headerSurface === "profile"
        ? {
            eyebrow: "Profile",
            title: (
              <>
                Edit your profile
                {liveDot}
              </>
            ),
            subtitle:
              "Tap a row to update. Saves go live on Marketplace — your public layout stays the same for clients.",
          }
        : headerSurface === "plan"
          ? {
              eyebrow: "Your plan",
              title: <>Grow with SMOAC Pro</>,
              subtitle:
                "See what Pro unlocks for leads, insights, and marketplace reach.",
            }
          : {
              eyebrow: "Specialist dashboard",
              title: (
                <>
                  Good to see you, {firstName}
                  {liveDot}
                </>
              ),
              subtitle: dashboardSubtitle(dashboardMode),
            };

  return (
    <>
    <DashboardPageShell
      variant="specialist"
      eyebrow={headerCopy.eyebrow}
      title={headerCopy.title}
      subtitle={headerCopy.subtitle}
      roleLabel={roleLabel}
      roleLabelTone={roleLabelTone}
      headerClassName={`dashboard-page__header--${headerSurface}`}
      hideHeader={headerSurface === "profile"}
      statusLabel={
        profileFirst || isLivePublished ? null : profileStatusLabel
      }
      statusTone={statusTone}
      utilityBar={
        headerSurface === "profile" ? undefined : (
          <SpecialistDashboardAccountMenu
            onSignOut={() => setSignOutConfirmOpen(true)}
          />
        )
      }
    >
      <div className="specialist-dash-layout">
        {showLastChance ? (
          <ProTrialLastChanceBanner
            daysRemaining={session.premiumTrialDaysRemaining}
            onUpgrade={() => setUpgradeOpen(true)}
          />
        ) : null}

        {showsInquiries && !openInquiries ? (
          <InquiryNotificationBanner
            unreadCount={inquiryUnreadCount}
            latestSummary={latestInquirySummary}
            onReview={openProfileInquiries}
            onDismiss={() => {
              void handleDismissInquiryNotifications();
            }}
          />
        ) : null}

        {isFreeLive ? (
          <>
            {openInquiries ? null : (
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
                  onClick={() => replaceDashboardTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            )}

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
                  {hasProfilePreview ? (
                    <SpecialistDashboardProfilePreview
                      trainer={trainer!}
                      editable
                      isPremium={isPremium}
                      isProPlus={isProPlus}
                      isLivePublished={isLivePublished}
                      focusSection={focusSection}
                      onClearFocus={() => setFocusSection(null)}
                      onUpgrade={() => setUpgradeOpen(true)}
                      onSignOut={() => setSignOutConfirmOpen(true)}
                      {...inquiryPreviewProps}
                    />
                  ) : (
                    <p className="specialist-dash-notice__text">
                      Your profile preview will appear here once it finishes
                      loading. Pull to refresh, or open the full editor.
                    </p>
                  )}

                  {openInquiries ? null : (
                    <BoostProfileCard onOpenBoost={() => setBoostOpen(true)} />
                  )}
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
                    isPremium={isPremium}
                    isProPlus={isProPlus}
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
            {openInquiries ? null : (
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
                  onClick={() => replaceDashboardTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            )}

            <div className="specialist-dash-panels">
              {premiumTab === "overview" ? (
                <div
                  id="specialist-dash-panel-premium-overview"
                  role="tabpanel"
                  aria-labelledby="specialist-dash-tab-premium-overview"
                  className="specialist-dash-panel"
                >
                  <div className="dashboard-overview-accordions">
                    <AnalyticsCard
                      analytics={analytics}
                      isPremium={isPremium}
                    />
                    <ProfileCompletionCard
                      profileCompletion={profileCompletion}
                      trainer={trainer}
                      checklist={completionChecklist}
                      onEditProfile={handleNavigateToProfile}
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
                      onOpenBoost={() => setBoostOpen(true)}
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
                  {hasProfilePreview ? (
                    <SpecialistDashboardProfilePreview
                      trainer={trainer!}
                      editable
                      isPremium={isPremium}
                      isProPlus={isProPlus}
                      isLivePublished={isLivePublished}
                      focusSection={focusSection}
                      onClearFocus={() => setFocusSection(null)}
                      onUpgrade={() => setUpgradeOpen(true)}
                      onSignOut={() => setSignOutConfirmOpen(true)}
                      {...inquiryPreviewProps}
                    />
                  ) : (
                    <p className="specialist-dash-notice__text">
                      Your profile preview will appear here once it finishes
                      loading. Pull to refresh, or open the full editor.
                    </p>
                  )}

                  {openInquiries ? null : (
                    <>
                      <BoostProfileCard onOpenBoost={() => setBoostOpen(true)} />

                      <div className="specialist-dash-panel__footer-card">
                        <SubscriptionCard
                          subscription={data.subscription}
                          onOpenBoost={() => setBoostOpen(true)}
                        />
                      </div>
                    </>
                  )}
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
    <DashboardSignOutConfirmModal
      open={signOutConfirmOpen}
      onClose={() => setSignOutConfirmOpen(false)}
      onConfirm={() => {
        setSignOutConfirmOpen(false);
        handleSignOut();
      }}
    />
    </>
  );
}
