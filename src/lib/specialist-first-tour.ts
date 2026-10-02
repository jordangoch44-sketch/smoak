/**
 * First-login specialist walkthrough.
 * Sample account only — other specialists keep the existing welcome modal.
 */
import type { SpecialistDashboardMode } from "@/lib/specialist-dashboard-mode";

export const SAMPLE_SPECIALIST_TOUR_EMAIL = "jordan@otgtrain.com";

const STORAGE_KEY = "smoac.specialist-first-tour.v1";

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

export function readSpecialistTourComplete(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${STORAGE_KEY}:${userId}`) === "done";
  } catch {
    return false;
  }
}

export function markSpecialistTourComplete(userId: string): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEY}:${userId}`, "done");
  } catch {
    /* private mode */
  }
}

/** Sample account, approved dashboard, and either first run or `?tour=1`. */
export function shouldOfferSpecialistTour(input: {
  email?: string | null;
  userId?: string | null;
  dashboardMode: SpecialistDashboardMode;
  force?: boolean;
  openInquiries?: boolean;
}): boolean {
  if (!isSampleSpecialistTourAccount(input.email)) return false;
  if (!input.userId) return false;
  if (input.openInquiries) return false;
  if (!specialistTourEligibleMode(input.dashboardMode)) return false;
  if (input.force) return true;
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
