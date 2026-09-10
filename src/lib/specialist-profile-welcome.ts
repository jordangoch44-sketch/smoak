/**
 * First login after a specialist is approved: land on Edit profile and
 * show a one-time glass welcome (incomplete sections + 30-day Pro trial).
 */
import { parseCoachingStyleSelection } from "@/constants/specialist-onboarding-options";
import { SPECIALIST_PROFILE_WELCOME_SEEN_PREFIX } from "@/lib/dev-storage-keys";
import {
  hasSessionPrice,
  resolveTrainerSessionPriceRange,
} from "@/lib/session-price";
import type { SpecialistDashboardMode } from "@/lib/specialist-dashboard-mode";
import { parseMediaUrlList } from "@/lib/specialist-media-limits";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";

export const SPECIALIST_PROFILE_WELCOME_LOCK_CLASS =
  "specialist-profile-welcome-open";

export const SMOAC_PROFILE_WELCOME = {
  eyebrow: "Your listing is live",
  title: "Welcome to your profile",
  trialHeadline: "Enjoy 30 days of free Pro!",
  primaryCta: "Start with photos",
  secondaryCta: "Got it",
} as const;

export type ProfileWelcomeTask = {
  id: string;
  label: string;
};

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

/** Incomplete profile rows — same warning-icon sections as the live editor. */
export function buildProfileWelcomeTasks(
  form: SpecialistProfileEditForm | null | undefined
): ProfileWelcomeTask[] {
  if (!form) return [];

  const hasPhoto = Boolean(form.profilePhotoUrl.trim());
  const hasSlideshow = parseMediaUrlList(form.photoNotes).length > 0;
  const hasLocation = Boolean(
    form.zipCode.trim() || form.city.trim() || form.workAddress.trim()
  );
  const hasLinks = Boolean(
    form.instagram.trim() ||
      form.website.trim() ||
      form.tiktok.trim() ||
      (form.googleReviewsUrl ?? "").trim()
  );
  const hasCredentials = form.certifications.some(
    (cert) => cert && cert.name.trim().length > 0
  );
  const hasPrice = hasSessionPrice(
    resolveTrainerSessionPriceRange({
      pricePerSession: form.pricePerSession,
      pricePerSessionMin: form.pricePerSessionMin,
      pricePerSessionMax: form.pricePerSessionMax,
    })
  );

  const candidates: Array<ProfileWelcomeTask & { done: boolean }> = [
    { id: "hero", label: "Photos", done: hasPhoto && hasSlideshow },
    { id: "name", label: "Business name", done: Boolean(form.name.trim()) },
    { id: "headline", label: "Headline", done: Boolean(form.title.trim()) },
    {
      id: "profession",
      label: "Category",
      done: Boolean(form.profession.trim()),
    },
    {
      id: "bio",
      label: "Bio",
      done: form.bio.trim().length >= 40,
    },
    {
      id: "specialties",
      label: "Specialties",
      done: form.specialty.length > 0,
    },
    { id: "service-area", label: "Location", done: hasLocation },
    {
      id: "philosophy",
      label: "Coaching style",
      done: parseCoachingStyleSelection(form.trainingStyle).length > 0,
    },
    {
      id: "ideal-clients",
      label: "Best for",
      done: Boolean(form.servicesOffered.trim()),
    },
    {
      id: "session-experience",
      label: "Training options",
      done: form.trainingOptions.length > 0,
    },
    { id: "credentials", label: "Credentials", done: hasCredentials },
    { id: "social", label: "Links", done: hasLinks },
    { id: "pricing", label: "Pricing", done: hasPrice },
    {
      id: "contact",
      label: "Contact",
      done: Boolean(form.phone.trim() || form.email.trim()),
    },
  ];

  return candidates
    .filter((item) => !item.done)
    .map(({ id, label }) => ({ id, label }));
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
  const userId = input.session?.userId;
  if (!userId) return false;
  /* Seen flag always wins — `?welcome=1` cannot replay after first view. */
  if (hasSeenSpecialistProfileWelcome(userId)) return false;
  if (input.force) return true;
  return hasPendingSpecialistProfileWelcome(input.session);
}
