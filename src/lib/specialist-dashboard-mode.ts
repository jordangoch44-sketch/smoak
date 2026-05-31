import type { SpecialistApplication } from "@/types/specialist-application";
import type { SpecialistSubscription } from "@/types/specialist-dashboard";
import { isSpecialistPremium } from "@/lib/specialist-premium";
import { isDemoSpecialistDashboard } from "@/lib/managed-specialist-profile";

export type SpecialistDashboardMode =
  | "demo-premium"
  | "pending"
  | "rejected"
  | "approved-free"
  | "approved-premium";

export function resolveSpecialistDashboardMode(input: {
  sessionEmail?: string;
  trainerId: string | null;
  application: SpecialistApplication | null;
  subscription: SpecialistSubscription;
}): SpecialistDashboardMode {
  const isDemo = isDemoSpecialistDashboard(
    input.trainerId,
    input.sessionEmail
  );
  const isPremium =
    isSpecialistPremium(input.subscription) ||
    input.application?.membershipTier === "premium";

  if (isDemo && isPremium) {
    return "demo-premium";
  }

  const status = input.application?.profileStatus;

  if (status === "PENDING_APPROVAL") return "pending";
  if (status === "REJECTED") return "rejected";

  if (status === "APPROVED") {
    return isPremium ? "approved-premium" : "approved-free";
  }

  if (isDemo) {
    return isPremium ? "demo-premium" : "approved-free";
  }

  return "pending";
}

export function showsPremiumDashboard(mode: SpecialistDashboardMode): boolean {
  return mode === "approved-premium" || mode === "demo-premium";
}

export function showsProfileFirstDashboard(mode: SpecialistDashboardMode): boolean {
  return (
    mode === "pending" ||
    mode === "rejected" ||
    mode === "approved-free"
  );
}
