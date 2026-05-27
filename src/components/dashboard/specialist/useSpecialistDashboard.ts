"use client";

import { useRouter } from "next/navigation";
import { DEMO_SPECIALIST_ID } from "@/constants/specialist-dashboard-mock";
import { getDemoSpecialistDashboardData } from "@/data/dashboard-mock";
import { getSpecialistProfileAnalytics } from "@/lib/specialist-dashboard-analytics";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import { isSpecialistPremium } from "@/lib/specialist-premium";

export function useSpecialistDashboard() {
  const router = useRouter();
  const { isReady, session } = useRequireAuth("specialist");
  const { signOut } = useAuthSession();
  const data = getDemoSpecialistDashboardData(session);
  const { trainer: managedTrainer, profileCompletion } = useManagedSpecialistProfile();
  const trainer = managedTrainer ?? data.trainer;

  const analytics = getSpecialistProfileAnalytics(DEMO_SPECIALIST_ID, {
    profileCompletionPercent: profileCompletion,
    rankingPosition: data.ranking?.rank ?? null,
  });

  const firstName =
    session?.displayName?.split(" ")[0] ??
    trainer?.name.split(" ")[0] ??
    session?.email.split("@")[0] ??
    "Specialist";

  const isPremium = isSpecialistPremium(data.subscription);

  function handleSignOut() {
    signOut();
    afterLogoutNavigation(() => router.push("/login"));
  }

  return {
    isReady,
    session,
    data,
    trainer,
    profileCompletion,
    analytics,
    isPremium,
    firstName,
    handleSignOut,
  };
}
