"use client";

import { useRouter } from "next/navigation";
import {
  DEMO_SPECIALIST_ID,
  DEV_SPECIALIST_DASHBOARD_ID,
} from "@/constants/specialist-dashboard-mock";
import { getDemoSpecialistDashboardData } from "@/data/dashboard-mock";
import { getSpecialistProfileAnalytics } from "@/lib/specialist-dashboard-analytics";
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

function resolveAnalyticsTrainerId(trainerId: string | null): string {
  if (!trainerId) return DEMO_SPECIALIST_ID;
  if (trainerId === DEV_SPECIALIST_DASHBOARD_ID) return DEV_SPECIALIST_DASHBOARD_ID;
  return trainerId;
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
  const data = useDemoData
    ? demoData
    : {
        trainer: managedTrainer,
        ranking: null,
        newLeads: [],
        subscription: getSpecialistSubscriptionForSession(session),
      };

  const trainer = managedTrainer ?? data.trainer;
  const analytics = getSpecialistProfileAnalytics(
    resolveAnalyticsTrainerId(trainerId),
    {
      profileCompletionPercent: profileCompletion,
      rankingPosition: data.ranking?.rank ?? null,
      useDemoMetrics: useDemoData,
    }
  );

  const firstName =
    trainer?.name.split(" ")[0] ??
    session?.displayName?.split(" ")[0] ??
    session?.email.split("@")[0] ??
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

  function handleSignOut() {
    signOut();
    afterLogoutNavigation(() => router.push("/login"));
  }

  return {
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
    dashboardMode,
    firstName,
    handleSignOut,
  };
}
