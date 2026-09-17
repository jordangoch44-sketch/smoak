"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import { resolveManagedSpecialistId } from "@/lib/managed-specialist-profile";
import {
  canShowSpecialistGrowthAds,
  resolveSpecialistDashboardMode,
} from "@/lib/specialist-dashboard-mode";
import { getSpecialistSubscriptionForSession } from "@/lib/specialist-dashboard-subscription";
import {
  ensureSpecialistApplicationsHydrated,
  getSpecialistApplicationById,
  getSpecialistApplicationsHydratedServerSnapshot,
  getSpecialistApplicationsHydratedSnapshot,
  subscribeSpecialistApplications,
} from "@/lib/specialist-application-storage";

function applicationGateKey(
  email?: string,
  userId?: string
): string {
  const trainerId = resolveManagedSpecialistId(email, userId);
  if (!trainerId) return "";
  const application = getSpecialistApplicationById(trainerId);
  return application
    ? `${application.id}:${application.profileStatus}`
    : trainerId;
}

/**
 * Marketplace / in-site specialist growth ads (Boost ribbon, house promos).
 * Stays false until the specialist is admin-approved (or a demo dashboard).
 */
export function useSpecialistGrowthAdsAllowed(): {
  ready: boolean;
  allowed: boolean;
} {
  const hydrated = useHydrated();
  const { session, isReady } = useAuthSession();
  const isSpecialist = session?.role === "specialist";

  useEffect(() => {
    if (!isSpecialist) return;
    ensureSpecialistApplicationsHydrated();
  }, [isSpecialist, session?.userId, session?.email]);

  const applicationsHydrated = useSyncExternalStore(
    subscribeSpecialistApplications,
    getSpecialistApplicationsHydratedSnapshot,
    getSpecialistApplicationsHydratedServerSnapshot
  );

  const applicationRevision = useSyncExternalStore(
    subscribeSpecialistApplications,
    () =>
      isSpecialist ? applicationGateKey(session?.email, session?.userId) : "",
    () => ""
  );
  void applicationRevision;

  if (!hydrated || !isReady) {
    return { ready: false, allowed: false };
  }

  if (!isSpecialist) {
    return { ready: true, allowed: false };
  }

  if (!applicationsHydrated) {
    return { ready: false, allowed: false };
  }

  const trainerId = resolveManagedSpecialistId(session?.email, session?.userId);
  const application = trainerId
    ? getSpecialistApplicationById(trainerId)
    : null;
  const allowed = canShowSpecialistGrowthAds(
    resolveSpecialistDashboardMode({
      sessionEmail: session?.email,
      trainerId,
      application,
      subscription: getSpecialistSubscriptionForSession(session),
    })
  );

  return { ready: true, allowed };
}
