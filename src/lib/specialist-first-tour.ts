/**
 * First-login specialist walkthrough.
 * Sample account only — other specialists keep the existing welcome modal.
 * Completion is saved on the account so Safari private browsing cannot replay it.
 */
import {
  getAuthSessionSnapshot,
  setAuthSession,
} from "@/lib/auth-session-store";
import type { SpecialistDashboardMode } from "@/lib/specialist-dashboard-mode";

export const SAMPLE_SPECIALIST_TOUR_EMAIL = "jordan@otgtrain.com";

const STORAGE_KEY = "smoac.specialist-first-tour.v1";
const completedIds = new Set<string>();

export type SpecialistTourStepId =
  | "live"
  | "client-view"
  | "edit"
  | "inquiries"
  | "clients"
  | "overview";

export type SpecialistTourSurface = "profile" | "clients" | "overview";

export interface SpecialistTourStep {
  id: SpecialistTourStepId;
  surface: SpecialistTourSurface;
  /** Matches a `data-tour` attribute on the dashboard. */
  target: string;
  title: string;
  body: string;
}

export const SPECIALIST_TOUR_STEPS: readonly SpecialistTourStep[] = [
  {
    id: "live",
    surface: "profile",
    target: "live-title",
    title: "You’re live",
    body: "You’re approved. This is the page clients see on Marketplace.",
  },
  {
    id: "client-view",
    surface: "profile",
    target: "client-view",
    title: "What clients see",
    body: "Anything still empty is what clients notice first. We’ll finish the most important gap at the end.",
  },
  {
    id: "edit",
    surface: "profile",
    target: "edit-profile",
    title: "Edit your profile",
    body: "Tap this anytime to change photos, pricing, hours, and credentials. Changes show up on your live page.",
  },
  {
    id: "inquiries",
    surface: "profile",
    target: "inquiries",
    title: "Inquiries",
    body: "When a client writes you, it lands here. You’ll also get an email.",
  },
  {
    id: "clients",
    surface: "clients",
    target: "clients",
    title: "Clients",
    body: "After someone starts training with you, invite them here. You can message them, send workouts, and see what they finish.",
  },
  {
    id: "overview",
    surface: "overview",
    target: "overview-kpis",
    title: "How you’ll know it’s working",
    body: "These start at zero. They fill in as people find you.",
  },
];

export function isSampleSpecialistTourAccount(
  email: string | null | undefined
): boolean {
  return (email ?? "").trim().toLowerCase() === SAMPLE_SPECIALIST_TOUR_EMAIL;
}

export function specialistTourEligibleMode(
  mode: SpecialistDashboardMode
): boolean {
  return (
    mode === "approved-free" ||
    mode === "approved-premium" ||
    mode === "demo-premium"
  );
}

function tourStorageKey(userId: string): string {
  return `${STORAGE_KEY}:${userId}`;
}

function readStoredTourFlag(userId: string): boolean {
  if (typeof window === "undefined") return false;
  const key = tourStorageKey(userId);
  try {
    if (window.localStorage.getItem(key) === "done") return true;
  } catch {
    /* Safari private browsing can block localStorage. */
  }
  try {
    if (window.sessionStorage.getItem(key) === "done") return true;
  } catch {
    /* Safari private browsing can block sessionStorage too. */
  }
  return false;
}

function writeStoredTourFlag(userId: string): void {
  if (typeof window === "undefined") return;
  const key = tourStorageKey(userId);
  try {
    window.localStorage.setItem(key, "done");
  } catch {
    /* private mode */
  }
  try {
    window.sessionStorage.setItem(key, "done");
  } catch {
    /* private mode */
  }
}

export function readSpecialistTourComplete(userId: string): boolean {
  if (completedIds.has(userId)) return true;
  if (!readStoredTourFlag(userId)) return false;
  completedIds.add(userId);
  return true;
}

function patchSessionTourComplete(userId: string): void {
  const current = getAuthSessionSnapshot();
  if (!current || current.userId !== userId || current.specialistTourCompleted) {
    return;
  }
  setAuthSession({ ...current, specialistTourCompleted: true });
}

/** Remember on this device and on the account. Safe to call more than once. */
export function markSpecialistTourComplete(userId: string): void {
  completedIds.add(userId);
  writeStoredTourFlag(userId);
  patchSessionTourComplete(userId);
  void persistSpecialistTourCompletedAt();
}

async function persistSpecialistTourCompletedAt(): Promise<void> {
  try {
    const { getMarketplaceAuthClient } = await import(
      "@/lib/auth/marketplace-auth"
    );
    const supabase = getMarketplaceAuthClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase
      .from("user_roles")
      .update({ specialist_tour_completed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("specialist_tour_completed_at", null);
  } catch {
    /* Column may not be applied on this database yet. */
  }
}

/** Sample account, approved dashboard, and either first run or `?tour=1`. */
export function shouldOfferSpecialistTour(input: {
  email?: string | null;
  userId?: string | null;
  dashboardMode: SpecialistDashboardMode;
  force?: boolean;
  openInquiries?: boolean;
  /** Saved on the account — survives a new Safari private window. */
  completedOnAccount?: boolean;
}): boolean {
  if (!isSampleSpecialistTourAccount(input.email)) return false;
  if (!input.userId) return false;
  if (input.openInquiries) return false;
  if (!specialistTourEligibleMode(input.dashboardMode)) return false;
  if (input.force) return true;
  if (input.completedOnAccount) return false;
  return !readSpecialistTourComplete(input.userId);
}

export function specialistTourTrialNote(session: {
  premiumTrialActive?: boolean;
  premiumTrialDaysRemaining?: number | null;
} | null | undefined): string | null {
  if (!session?.premiumTrialActive) return null;
  const days = session.premiumTrialDaysRemaining;
  if (typeof days !== "number") {
    return "Your Pro trial keeps these numbers unlocked.";
  }
  if (days <= 0) {
    return "Your Pro trial keeps these numbers unlocked through today.";
  }
  if (days === 1) {
    return "Your Pro trial keeps these numbers unlocked for 1 more day.";
  }
  return `Your Pro trial keeps these numbers unlocked for ${days} more days.`;
}

type SearchParamsLike = { get(name: string): string | null };

export function specialistTourSurfaceMatches(
  surface: SpecialistTourSurface,
  searchParams: SearchParamsLike
): boolean {
  const tab = searchParams.get("tab");
  const view = searchParams.get("view");
  const conversation = searchParams.get("c");
  if (view || conversation) return false;
  if (surface === "clients") return tab === "clients";
  if (surface === "overview") return tab === "overview";
  return tab !== "overview" && tab !== "clients" && tab !== "plan";
}
