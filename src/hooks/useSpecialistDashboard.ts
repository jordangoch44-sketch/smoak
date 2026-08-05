"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_SPECIALIST_ID,
  DEV_SPECIALIST_DASHBOARD_ID,
} from "@/constants/specialist-dashboard-mock";
import { getDemoSpecialistDashboardData } from "@/data/dashboard-mock";
import { listPublicMarketplaceTrainers } from "@/lib/marketplace-public-catalog";
import { getSpecialistProfileAnalytics } from "@/lib/specialist-dashboard-analytics";
import {
  fetchSpecialistLiveAnalytics,
  mergeLiveSpecialistAnalytics,
} from "@/lib/specialist-live-analytics";
import { fetchSpecialistReviewAggregates } from "@/lib/reviews/specialist-reviews-client";
import { getLiveTrainerCityRanking } from "@/lib/smoac-rankings";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import {
  buildProfileCompletionChecklist,
  isDemoSpecialistDashboard,
  profileStatusToLabel,
} from "@/lib/managed-specialist-profile";
import {
  resolveSpecialistDashboardMode,
  type SpecialistDashboardMode,
} from "@/lib/specialist-dashboard-mode";
import { getSpecialistSubscriptionForSession } from "@/lib/specialist-dashboard-subscription";
import { isSpecialistPremium } from "@/lib/specialist-premium";
import {
  loadSpecialistInquiryLeads,
  markAllSpecialistInquiriesRead,
  markSpecialistInquiryRead,
} from "@/lib/inquiry/inquiry-inbox";
import { markAllSpecialistInquiryNotificationsRead } from "@/lib/inquiry/specialist-inquiry-notifications";
import type {
  SpecialistDashboardRanking,
  SpecialistLead,
} from "@/types/specialist-dashboard";
import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";

function resolveAnalyticsTrainerId(
  trainerId: string | null,
  useDemoData: boolean
): string {
  if (trainerId) {
    if (trainerId === DEV_SPECIALIST_DASHBOARD_ID) return DEV_SPECIALIST_DASHBOARD_ID;
    return trainerId;
  }
  return useDemoData ? DEMO_SPECIALIST_ID : "empty";
}

export function useSpecialistDashboard() {
  const router = useRouter();
  const { isReady, session } = useRequireAuth("specialist");
  const { signOut } = useAuthSession();
  const {
    trainerId,
    application,
    trainer: managedTrainer,
    formDefaults,
    profileCompletion,
  } = useManagedSpecialistProfile();

  const useDemoData = isDemoSpecialistDashboard(trainerId, session?.email);
  const demoData = getDemoSpecialistDashboardData(session);

  const [inquiryLeads, setInquiryLeads] = useState<SpecialistLead[]>([]);
  const [liveRanking, setLiveRanking] =
    useState<SpecialistDashboardRanking | null>(null);
  const [smoacRating, setSmoacRating] = useState<number | null>(null);
  const [smoacReviewCount, setSmoacReviewCount] = useState(0);
  const [liveAnalytics, setLiveAnalytics] = useState<SpecialistProfileAnalytics | null>(
    null
  );

  const data = useDemoData
    ? demoData
    : {
        trainer: managedTrainer,
        ranking: liveRanking,
        newLeads: [] as SpecialistLead[],
        subscription: getSpecialistSubscriptionForSession(session),
      };

  useEffect(() => {
    let cancelled = false;
    if (!trainerId || useDemoData || !managedTrainer) {
      if (!useDemoData) {
        setLiveRanking(null);
        setSmoacRating(null);
        setSmoacReviewCount(0);
      }
      return;
    }

    const city = managedTrainer.city.trim().toLowerCase();
    const catalog = listPublicMarketplaceTrainers({
      includeBrowserState: true,
      catalogMode: "live",
    });
    const peers =
      city.length > 0
        ? catalog.filter((t) => t.city.trim().toLowerCase() === city)
        : [managedTrainer];
    const pool = peers.length > 0 ? peers : [managedTrainer];

    void fetchSpecialistReviewAggregates(pool.map((t) => t.id)).then((map) => {
      if (cancelled) return;
      const live = getLiveTrainerCityRanking(managedTrainer, pool, map);
      setLiveRanking(
        live
          ? { rank: live.rank, listingTitle: live.listingTitle }
          : null
      );
      const self = map.get(trainerId);
      setSmoacRating(self?.avgRating ?? null);
      setSmoacReviewCount(self?.reviewCount ?? 0);
    });

    return () => {
      cancelled = true;
    };
  }, [trainerId, useDemoData, managedTrainer?.id, managedTrainer?.city]);

  useEffect(() => {
    let cancelled = false;
    if (!trainerId || useDemoData) {
      setLiveAnalytics(null);
      return;
    }

    void fetchSpecialistLiveAnalytics().then((counts) => {
      if (cancelled || !counts) return;
      const base = getSpecialistProfileAnalytics(trainerId, {
        profileCompletionPercent: profileCompletion,
        rankingPosition: liveRanking?.rank ?? null,
        useDemoMetrics: false,
      });
      setLiveAnalytics(mergeLiveSpecialistAnalytics(base, counts));
    });

    return () => {
      cancelled = true;
    };
  }, [trainerId, useDemoData, profileCompletion, liveRanking?.rank]);

  useEffect(() => {
    let cancelled = false;
    if (!trainerId) return;

    function loadLeads() {
      void loadSpecialistInquiryLeads(trainerId).then((leads) => {
        if (!cancelled) setInquiryLeads(leads);
      });
    }

    loadLeads();

    function onVisible() {
      if (document.visibilityState === "visible") loadLeads();
    }

    window.addEventListener("focus", loadLeads);
    document.addEventListener("visibilitychange", onVisible);
    /* Same-browser refresh signal after a new inquiry is written. */
    window.addEventListener("smoac:specialist-inquiry-notifications", loadLeads);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadLeads);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(
        "smoac:specialist-inquiry-notifications",
        loadLeads
      );
    };
  }, [trainerId]);

  async function handleOpenInquiryLead(lead: SpecialistLead) {
    if (!trainerId || !lead.unread) return;
    await markSpecialistInquiryRead(trainerId, lead.id);
    setInquiryLeads((prev) =>
      prev.map((item) =>
        item.id === lead.id ? { ...item, unread: false } : item
      )
    );
  }

  async function handleDismissInquiryNotifications() {
    if (!trainerId) return;
    const unreadIds = inquiryLeads
      .filter((lead) => lead.unread)
      .map((lead) => lead.id);
    await markAllSpecialistInquiriesRead(trainerId, unreadIds);
    markAllSpecialistInquiryNotificationsRead(trainerId);
    setInquiryLeads((prev) =>
      prev.map((item) => (item.unread ? { ...item, unread: false } : item))
    );
  }

  const trainer = managedTrainer ?? data.trainer;
  const analytics =
    liveAnalytics ??
    getSpecialistProfileAnalytics(
      resolveAnalyticsTrainerId(trainerId, useDemoData),
      {
        profileCompletionPercent: profileCompletion,
        rankingPosition: data.ranking?.rank ?? null,
        useDemoMetrics: useDemoData,
      }
    );

  const rankingRating = useDemoData
    ? {
        rating: demoData.trainer?.rating ?? null,
        reviewCount: demoData.trainer?.reviewCount ?? 0,
      }
    : { rating: smoacRating, reviewCount: smoacReviewCount };

  // Prefer legal/profile first name — never display/brand name ("Coach", studio name, etc.)
  const firstName =
    session?.firstName?.trim().split(/\s+/)[0] ||
    application?.fullName.trim().split(/\s+/)[0] ||
    session?.email?.split("@")[0] ||
    "Specialist";

  const profileStatusLabel = profileStatusToLabel(application?.profileStatus);
  const completionChecklist =
    formDefaults != null
      ? buildProfileCompletionChecklist(formDefaults, trainer)
      : [];

  const isPremium = isSpecialistPremium(data.subscription);

  const dashboardMode: SpecialistDashboardMode = resolveSpecialistDashboardMode({
    sessionEmail: session?.email,
    trainerId,
    application,
    subscription: data.subscription,
  });

  /* Prefer real inquiries; demo leads only when demo mode has nothing live. */
  const mergedLeads =
    inquiryLeads.length > 0
      ? inquiryLeads
      : useDemoData
        ? data.newLeads
        : [];

  async function handleSignOut() {
    await signOut();
    afterLogoutNavigation(() => router.push("/profile"));
  }

  const unreadInquiryLeads = mergedLeads.filter((lead) => lead.unread);
  const inquiryUnreadCount = unreadInquiryLeads.length;
  const latestInquirySummary =
    unreadInquiryLeads[0] != null
      ? `${unreadInquiryLeads[0].name} · ${
          unreadInquiryLeads[0].messagePreview || unreadInquiryLeads[0].intent
        }`
      : null;

  return {
    isReady,
    session,
    data: {
      ...data,
      newLeads: mergedLeads,
    },
    trainer,
    trainerId,
    application,
    profileCompletion,
    completionChecklist,
    profileStatusLabel,
    analytics,
    rankingRating,
    isPremium,
    dashboardMode,
    firstName,
    inquiryUnreadCount,
    latestInquirySummary,
    handleSignOut,
    handleOpenInquiryLead,
    handleDismissInquiryNotifications,
  };
}
