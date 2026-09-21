"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardButton,
  DashboardLoadingState,
  DashboardPageShell,
  BoostVisibilityModal,
  PremiumTrialEndedModal,
  SpecialistProfileWelcomeModal,
  SmoacProUpgradeModal,
  DashboardSignOutConfirmModal,
} from "@/components/dashboard/shared";
import {
  AnalyticsCard,
  BoostProfileCard,
  GoogleReviewsCard,
  ProfileCompletionCard,
  ReviewsCard,
  SubscriptionCard,
  VisibilityRankingCard,
} from "@/components/dashboard/specialist/cards";
import { InquiryNotificationBanner } from "@/components/dashboard/specialist/InquiryNotificationBanner";
import { ProTrialLastChanceBanner } from "@/components/dashboard/specialist/ProTrialLastChanceBanner";
import { SpecialistDashboardAccountMenu } from "@/components/dashboard/specialist/SpecialistDashboardAccountMenu";
import { SpecialistDashboardProfilePreview } from "@/components/dashboard/specialist/SpecialistDashboardProfilePreview";
import { SpecialistLockedOverview } from "@/components/dashboard/specialist/SpecialistLockedOverview";
import { SpecialistPendingApprovalNotice } from "@/components/dashboard/specialist/SpecialistPendingApprovalNotice";
import { SpecialistPendingOverview } from "@/components/dashboard/specialist/SpecialistPendingOverview";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { useSpecialistDashboard } from "@/hooks/useSpecialistDashboard";
import { resubmitSpecialistApplicationForReviewAsync } from "@/lib/admin-applications-service";
import {
  SPECIALIST_DASHBOARD_EDIT_HREF,
  SPECIALIST_DASHBOARD_INQUIRIES_HREF,
  SPECIALIST_DASHBOARD_OVERVIEW_HREF,
  SPECIALIST_DASHBOARD_PATH,
  SPECIALIST_DASHBOARD_PROFILE_TAB_HREF,
  SPECIALIST_DASHBOARD_WELCOME_HREF,
} from "@/lib/auth-routes";
import { SPECIALIST_ONBOARDING_RESUME_HREF } from "@/lib/join-flow";
import {
  canShowSpecialistGrowthAds,
  showsPremiumDashboard,
  showsProfileFirstDashboard,
} from "@/lib/specialist-dashboard-mode";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import {
  SMOAC_FREE_PLAN_LABEL,
  formatMembershipShortLabel,
  formatProTrialBadgeLabel,
  isProPlusPlan,
  membershipBadgeToneForSession,
  showProTrialLastChance,
} from "@/lib/specialist-premium";
import { membershipPlanLabel } from "@/lib/stripe/products";
import { cn } from "@/lib/utils";
import {
  shouldShowSpecialistProfileWelcome,
  resolveProfileWelcomeMembership,
  PROFILE_WELCOME_AVATAR_TASK_ID,
  PROFILE_WELCOME_PHOTOS_TASK_ID,
} from "@/lib/specialist-profile-welcome";

type FreeDashboardTab = "overview" | "profile";
type PremiumDashboardTab = "overview" | "profile";

/** Survives Strict Mode remounts; cleared on full reload so login can show it again. */
const welcomeOpenedThisRuntime = new Set<string>();
const welcomeDismissedThisRuntime = new Set<string>();

const FREE_TABS: ReadonlyArray<{ id: FreeDashboardTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile" },
];

const PREMIUM_TABS: ReadonlyArray<{ id: PremiumDashboardTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile" },
];

type SpecialistDashHeaderSurface = "overview" | "profile" | "status";

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
  openInquiries: boolean,
  openEdit = false
): FreeDashboardTab {
  if (openInquiries || openEdit) return "profile";
  return value === "overview" || value === "plan" ? "overview" : "profile";
}

function parsePremiumTab(
  value: string | null,
  openInquiries: boolean,
  openEdit = false
): PremiumDashboardTab {
  if (openInquiries || openEdit) return "profile";
  return value === "overview" ? "overview" : "profile";
}

function hrefForDashboardTab(tab: FreeDashboardTab | PremiumDashboardTab): string {
  if (tab === "profile") {
    return SPECIALIST_DASHBOARD_PROFILE_TAB_HREF;
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
  const editView = searchParams.get("view") === "edit";
  const openInquiries = Boolean(conversationParam) || inquiriesView;
  const welcomeParam = searchParams.get("welcome") === "1";
  const freeTab = parseFreeTab(tabParam, openInquiries, editView);
  const premiumTab = parsePremiumTab(tabParam, openInquiries, editView);
  const [trialEndedOpen, setTrialEndedOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeSkipPick, setUpgradeSkipPick] = useState(false);
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
    welcomeTasks,
    welcomeAvatarUrl,
    welcomeDisplayName,
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
    handleHideInquiry,
    handleMarkInquiriesRead,
    handleMarkInquiriesUnread,
    isHydrated,
  } = useSpecialistDashboard();

  useEffect(() => {
    if (session?.premiumTrialJustEnded) {
      setTrialEndedOpen(true);
    }
  }, [session?.premiumTrialJustEnded]);

  useEffect(() => {
    if (!isReady || !session || !isHydrated) return;
    if (trialEndedOpen) return;
    const userId = session.userId;
    if (userId && welcomeDismissedThisRuntime.has(userId)) {
      return;
    }
    const openedThisRuntime = Boolean(
      userId && welcomeOpenedThisRuntime.has(userId)
    );
    if (
      !openedThisRuntime &&
      !shouldShowSpecialistProfileWelcome({
        session,
        dashboardMode,
        openInquiries,
        force: welcomeParam,
      })
    ) {
      return;
    }
    if (userId) {
      welcomeOpenedThisRuntime.add(userId);
    }
    setWelcomeOpen(true);
  }, [
    isReady,
    session,
    isHydrated,
    trialEndedOpen,
    dashboardMode,
    openInquiries,
    welcomeParam,
  ]);

  useEffect(() => {
    if (!welcomeOpen) return;
    const onProfileTab =
      (showsPremiumDashboard(dashboardMode) && premiumTab === "profile") ||
      (dashboardMode === "approved-free" && freeTab === "profile");
    if (onProfileTab) return;
    router.replace(
      welcomeParam
        ? SPECIALIST_DASHBOARD_WELCOME_HREF
        : SPECIALIST_DASHBOARD_PROFILE_TAB_HREF,
      { scroll: false }
    );
  }, [
    welcomeOpen,
    dashboardMode,
    premiumTab,
    freeTab,
    welcomeParam,
    router,
  ]);

  useEffect(() => {
    const promo = searchParams.get("promo");
    if (promo === "pro") {
      openUpgrade();
    }
    if (promo === "boost" && canShowSpecialistGrowthAds(dashboardMode)) {
      setBoostOpen(true);
    }
  }, [searchParams, dashboardMode]);

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
    return <DashboardLoadingState message="Opening your application" />;
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
  const cityRanking =
    data.ranking && trainer
      ? {
          rank: data.ranking.rank,
          city: trainer.city,
          listingTitle: data.ranking.listingTitle,
        }
      : null;
  const showsInquiries =
    dashboardMode === "approved-free" ||
    dashboardMode === "approved-premium" ||
    dashboardMode === "demo-premium";
  const isPendingGate =
    dashboardMode === "pending" || dashboardMode === "rejected";
  const pendingOverview =
    dashboardMode === "pending" && freeTab === "overview";
  const showPendingLiveView =
    dashboardMode === "pending" && hasProfilePreview && !pendingOverview;
  const isFreeLive = dashboardMode === "approved-free";
  const onProTrial = Boolean(session.premiumTrialActive);
  const hadProTrial = Boolean(session.premiumTrialUsed);
  const isProPlus = isProPlusPlan(session.membershipPlan);
  const showLastChance = showProTrialLastChance(session);

  const freeOverview = isFreeLive && freeTab === "overview";
  const headerSurface: SpecialistDashHeaderSurface = showPendingLiveView
    ? "profile"
    : pendingOverview
      ? "overview"
      : isPendingGate
        ? "status"
        : premiumDashboard
          ? premiumTab === "profile"
            ? "profile"
            : "overview"
          : isFreeLive
            ? freeTab === "profile"
              ? "profile"
              : "overview"
            : "status";

  function openProfileInquiries() {
    const latest = data.newLeads.find((lead) => lead.unread);
    if (latest) {
      replaceConversationParam(latest.id);
      return;
    }
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
        onHideInquiryLead: (id: string) => {
          void handleHideInquiry(id);
          if (conversationParam === id) replaceConversationParam(null);
        },
        onMarkInquiryLeadsRead: (ids: string[]) => {
          void handleMarkInquiriesRead(ids);
        },
        onMarkInquiryLeadsUnread: (ids: string[]) => {
          void handleMarkInquiriesUnread(ids);
        },
      }
    : {};

  function handleNavigateToProfile(sectionId?: string) {
    if (sectionId) {
      setFocusSection(sectionId);
    }
    const next = new URLSearchParams();
    next.set("tab", "profile");
    next.set("view", "edit");
    if (sectionId) next.set("focus", sectionId);
    router.push(
      sectionId
        ? `${SPECIALIST_DASHBOARD_PATH}?${next.toString()}`
        : SPECIALIST_DASHBOARD_EDIT_HREF,
      { scroll: false }
    );
  }

  function dismissProfileWelcome() {
    const userId = session?.userId;
    if (userId) {
      welcomeDismissedThisRuntime.add(userId);
    }
    setWelcomeOpen(false);
    if (!welcomeParam) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("welcome");
    const qs = next.toString();
    router.replace(
      qs ? `${SPECIALIST_DASHBOARD_PATH}?${qs}` : SPECIALIST_DASHBOARD_PATH,
      { scroll: false }
    );
  }

  function openUpgrade(options?: { skipPick?: boolean }) {
    setUpgradeSkipPick(Boolean(options?.skipPick));
    setUpgradeOpen(true);
  }

  function closeUpgrade() {
    setUpgradeOpen(false);
    setUpgradeSkipPick(false);
  }

  function openWelcomeMembership(action: "join" | "upgrade" | "boost") {
    dismissProfileWelcome();
    if (action === "boost") {
      setBoostOpen(true);
      return;
    }
    openUpgrade();
  }

  function startWelcomeWithSection(sectionId?: string) {
    setFocusSection(sectionId || "hero");
    dismissProfileWelcome();
  }

  function startWelcomeWithPhotos() {
    const photosTask = welcomeTasks.find(
      (task) =>
        task.id === PROFILE_WELCOME_AVATAR_TASK_ID ||
        task.id === PROFILE_WELCOME_PHOTOS_TASK_ID
    );
    startWelcomeWithSection(
      photosTask?.id ?? welcomeTasks[0]?.id ?? PROFILE_WELCOME_AVATAR_TASK_ID
    );
  }

  const liveDot =
    isLivePublished ? (
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
        ? membershipPlanLabel("platinum")
        : isPremium
          ? membershipPlanLabel("premium")
          : "Specialist";

  const planBadgeTone = membershipBadgeToneForSession(session);

  /* Plan badge matches the signed-in account on every dashboard surface. */
  const roleLabel =
    headerSurface === "profile"
      ? profilePlanLabel
      : headerSurface === "overview"
        ? formatMembershipShortLabel(session)
        : undefined;

  const roleLabelTone = roleLabel ? planBadgeTone : "default";

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

  const overviewAccordions = (premium: boolean, teaseOpen = false) => (
    <div className="dashboard-overview-accordions">
      <AnalyticsCard
        analytics={analytics}
        isPremium={premium}
        defaultOpen={teaseOpen}
      />
      <ProfileCompletionCard
        profileCompletion={profileCompletion}
        trainer={trainer}
        checklist={completionChecklist}
        onEditProfile={handleNavigateToProfile}
      />
      <VisibilityRankingCard
        ranking={data.ranking ?? null}
        isPremium={premium}
        defaultOpen={teaseOpen}
        smoacRating={rankingRating.rating}
        smoacReviewCount={rankingRating.reviewCount}
        categoryLabel={
          trainer ? resolveTrainerProfessionCategory(trainer) : undefined
        }
        onOpenBoost={() => setBoostOpen(true)}
      />
      <ReviewsCard
        trainer={trainer}
        isPremium={premium}
        smoacRating={rankingRating.rating}
        smoacReviewCount={rankingRating.reviewCount}
      />
      <GoogleReviewsCard
        trainer={trainer}
        isPremium={premium}
        onUpgrade={() => setUpgradeOpen(true)}
      />
    </div>
  );

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
      hideHeader={
        headerSurface === "profile" || freeOverview || pendingOverview
      }
      statusLabel={
        profileFirst || isLivePublished || freeOverview || pendingOverview
          ? null
          : profileStatusLabel
      }
      statusTone={statusTone}
      utilityBar={
        headerSurface === "profile" || freeOverview || pendingOverview ? undefined : (
          <SpecialistDashboardAccountMenu
            onSignOut={() => setSignOutConfirmOpen(true)}
          />
        )
      }
    >
      <div className="specialist-dash-layout">
        {showLastChance &&
        headerSurface !== "profile" &&
        !freeOverview &&
        !pendingOverview ? (
          <ProTrialLastChanceBanner
            daysRemaining={session.premiumTrialDaysRemaining}
            onUpgrade={() => setUpgradeOpen(true)}
          />
        ) : null}

        {showsInquiries &&
        headerSurface !== "profile" &&
        !freeOverview &&
        !pendingOverview ? (
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
            {freeTab !== "profile" ? (
            <div
              className="specialist-dash-tabs"
              role="tablist"
              aria-label="Specialist dashboard sections"
            >
              {FREE_TABS.map((tab) => (
                <FastActivateButton
                  key={tab.id}
                  role="tab"
                  id={`specialist-dash-tab-${tab.id}`}
                  aria-selected={freeTab === tab.id}
                  aria-controls={`specialist-dash-panel-${tab.id}`}
                  className={cn(
                    "specialist-dash-tabs__btn",
                    freeTab === tab.id && "specialist-dash-tabs__btn--active"
                  )}
                  onActivate={() => replaceDashboardTab(tab.id)}
                >
                  {tab.label}
                </FastActivateButton>
              ))}
            </div>
            ) : null}

            <div className="specialist-dash-panels">
              {freeTab === "overview" ? (
                <div
                  id="specialist-dash-panel-overview"
                  role="tabpanel"
                  aria-labelledby="specialist-dash-tab-overview"
                  className="specialist-dash-panel"
                >
                  <SpecialistLockedOverview
                    restoreTrial={hadProTrial}
                    holdUnlock={upgradeOpen}
                    onUnlock={() => {
                      setTrialEndedOpen(false);
                      openUpgrade({ skipPick: true });
                    }}
                  >
                    {overviewAccordions(true)}
                  </SpecialistLockedOverview>
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
                      cityRanking={cityRanking}
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

                  {editView ? (
                    <BoostProfileCard onOpenBoost={() => setBoostOpen(true)} />
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {profileFirst && !isFreeLive ? (
          <>
            {pendingOverview ? (
              <SpecialistPendingOverview
                submittedAt={application?.submittedAt}
              />
            ) : showPendingLiveView ? (
              <SpecialistDashboardProfilePreview
                trainer={trainer!}
                editable={false}
                isPremium={isPremium}
                isProPlus={isProPlus}
                isLivePublished={false}
                chromeStatus="pending"
                cityRanking={cityRanking}
                onSignOut={() => setSignOutConfirmOpen(true)}
              />
            ) : (
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

            {hasProfilePreview ? (
              <div
                className={
                  isPendingGate
                    ? "specialist-dash-pending-preview"
                    : undefined
                }
              >
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
                    cityRanking={cityRanking}
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
            {dashboardMode === "rejected" ? (
              <p className="specialist-dash-notice__text">
                After approval, come back here to finish your full in-depth
                profile — pricing, availability, media, and more.
              </p>
            ) : null}
              </>
            )}
          </>
        ) : null}

        {premiumDashboard ? (
          <>
            {premiumTab !== "profile" ? (
            <div
              className="specialist-dash-tabs"
              role="tablist"
              aria-label="Specialist dashboard sections"
            >
              {PREMIUM_TABS.map((tab) => (
                <FastActivateButton
                  key={tab.id}
                  role="tab"
                  id={`specialist-dash-tab-premium-${tab.id}`}
                  aria-selected={premiumTab === tab.id}
                  aria-controls={`specialist-dash-panel-premium-${tab.id}`}
                  className={cn(
                    "specialist-dash-tabs__btn",
                    premiumTab === tab.id && "specialist-dash-tabs__btn--active"
                  )}
                  onActivate={() => replaceDashboardTab(tab.id)}
                >
                  {tab.label}
                </FastActivateButton>
              ))}
            </div>
            ) : null}

            <div className="specialist-dash-panels">
              {premiumTab === "overview" ? (
                <div
                  id="specialist-dash-panel-premium-overview"
                  role="tabpanel"
                  aria-labelledby="specialist-dash-tab-premium-overview"
                  className="specialist-dash-panel"
                >
                  {overviewAccordions(isPremium)}
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
                      cityRanking={cityRanking}
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

                  {editView ? (
                    <>
                      <BoostProfileCard onOpenBoost={() => setBoostOpen(true)} />

                      <div className="specialist-dash-panel__footer-card">
                        <SubscriptionCard
                          subscription={data.subscription}
                          onOpenBoost={() => setBoostOpen(true)}
                        />
                      </div>
                    </>
                  ) : null}
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
    <SpecialistProfileWelcomeModal
      open={welcomeOpen && !trialEndedOpen}
      tasks={welcomeTasks}
      avatarUrl={welcomeAvatarUrl}
      specialistName={welcomeDisplayName}
      firstName={firstName}
      membership={resolveProfileWelcomeMembership(session)}
      onClose={dismissProfileWelcome}
      onStartWithPhotos={startWelcomeWithPhotos}
      onSelectTask={startWelcomeWithSection}
      onGetMembership={() => openWelcomeMembership("join")}
      onUpgrade={() => openWelcomeMembership("upgrade")}
      onBoost={() => openWelcomeMembership("boost")}
    />
    <SmoacProUpgradeModal
      open={upgradeOpen}
      skipPick={upgradeSkipPick}
      onClose={closeUpgrade}
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
