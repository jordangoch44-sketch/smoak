/**
 * First login after a specialist is approved: land on Edit profile and
 * show a one-time glass welcome (complete the listing + 30-day Pro trial).
 */
import { SPECIALIST_PROFILE_WELCOME_SEEN_PREFIX } from "@/lib/dev-storage-keys";
import type { SpecialistDashboardMode } from "@/lib/specialist-dashboard-mode";

export const SPECIALIST_PROFILE_WELCOME_LOCK_CLASS =
  "specialist-profile-welcome-open";

export const SMOAC_PROFILE_WELCOME = {
  eyebrow: "Your listing is live",
  title: "Welcome to your profile",
  lead: "Finish your photos and complete every section you can. Fuller profiles are easier for the right clients to find in search on smoac.com.",
  trial:
    "Enjoy 30 days of SMOAC Pro on us — ranking insights, analytics, and the rest of the Pro toolkit are included. After the trial you’ll stay discoverable on Free, though some of those tools step back. You can upgrade anytime.",
  primaryCta: "Start with photos",
  secondaryCta: "Got it",
} as const;

export type SpecialistProfileWelcomeSession = {
  userId?: string;
  role?: string | null;
  premiumTrialActive?: boolean;
  premiumTrialJustEnded?: boolean;
};

function storageKey(userId: string): string {
  return `${SPECIALIST_PROFILE_WELCOME_SEEN_PREFIX}${userId}`;
}

export function hasSeenSpecialistProfileWelcome(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return true;
  try {
    return window.localStorage.getItem(storageKey(userId)) === "1";
  } catch {
    return true;
  }
}

export function markSpecialistProfileWelcomeSeen(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

/** True when first post-approval login should go to the profile welcome. */
export function hasPendingSpecialistProfileWelcome(
  session: SpecialistProfileWelcomeSession | null | undefined
): boolean {
  if (!session || session.role !== "specialist") return false;
  if (session.premiumTrialJustEnded) return false;
  if (!session.premiumTrialActive) return false;
  if (!session.userId) return false;
  return !hasSeenSpecialistProfileWelcome(session.userId);
}

export function shouldShowSpecialistProfileWelcome(input: {
  session: SpecialistProfileWelcomeSession | null | undefined;
  dashboardMode: SpecialistDashboardMode;
  openInquiries?: boolean;
  force?: boolean;
}): boolean {
  if (input.openInquiries) return false;
  if (
    input.dashboardMode !== "approved-premium" &&
    input.dashboardMode !== "approved-free"
  ) {
    return false;
  }
  if (input.force) return true;
  return hasPendingSpecialistProfileWelcome(input.session);
}
