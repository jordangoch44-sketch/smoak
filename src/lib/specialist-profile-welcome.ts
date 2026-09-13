/**
 * Specialist dashboard welcome after login: incomplete profile tasks plus
 * a membership prompt (join, trial days left, or upgrade/boost).
 */
import { parseCoachingStyleSelection } from "@/constants/specialist-onboarding-options";
import {
  hasSessionPrice,
  resolveTrainerSessionPriceRange,
} from "@/lib/session-price";
import type { SpecialistDashboardMode } from "@/lib/specialist-dashboard-mode";
import { parseMediaUrlList } from "@/lib/specialist-media-limits";
import {
  isProPlusPlan,
  isSpecialistPayingPro,
} from "@/lib/specialist-premium";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";

export const SPECIALIST_PROFILE_WELCOME_LOCK_CLASS =
  "specialist-profile-welcome-open";

export const PROFILE_WELCOME_PHOTOS_TASK_ID = "hero";
export const PROFILE_WELCOME_AVATAR_TASK_ID = "avatar";
export const PROFILE_WELCOME_REMAINING_PREVIEW = 4;

export const SMOAC_PROFILE_WELCOME = {
  eyebrow: "Your profile is live",
  titlePrefix: "Welcome",
  subtitle:
    "Finish a few profile items, then grow with a membership or Boost.",
  subtitleComplete: "Your profile looks complete. Here's a way to grow.",
  nextStepEyebrow: "Your next step",
  photosDescription:
    "Help your profile stand out and get more inquiries from clients.",
  nextStepFallbackDescription:
    "Complete this section so clients know what to expect from you.",
  joinHeadline: "Upgrade to Pro",
  joinBody:
    "Unlock analytics, ranking insights, and more inquiries with SMOAC Pro.",
  joinCta: "Upgrade to Pro",
  trialFallbackHeadline: "Your Pro trial is running out",
  trialBody:
    "Keep Pro before your trial ends — analytics, ranking insights, and growth tools stay unlocked.",
  trialCta: "Keep Pro",
  upgradeBoostHeadline: "Upgrade to PRO+",
  upgradeBoostBody:
    "Add phone videos, client results, and 20% off Boosts.",
  upgradeCta: "Upgrade to PRO+",
  boostHeadline: "Boost your profile",
  boostBody: "Put your profile in front of more clients near you.",
  boostCta: "Boost profile",
  primaryCta: "Add photos",
  secondaryCta: "Maybe later",
} as const;

export type ProfileWelcomeTask = {
  id: string;
  label: string;
  description?: string;
};

export type ProfileWelcomeMembershipKind =
  | "join"
  | "trial"
  | "upgrade-or-boost"
  | "boost";

export type ProfileWelcomeMembershipPrompt = {
  kind: ProfileWelcomeMembershipKind;
  headline: string;
  body: string;
  primaryCta: string;
  secondaryCta?: string;
};

export type SpecialistProfileWelcomeSession = {
  userId?: string;
  role?: string | null;
  isPremium?: boolean;
  premiumIsPaid?: boolean;
  membershipPlan?: string | null;
  premiumTrialActive?: boolean;
  premiumTrialDaysRemaining?: number | null;
  premiumTrialJustEnded?: boolean;
};

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
    {
      id: PROFILE_WELCOME_AVATAR_TASK_ID,
      label: "Profile photo",
      description: SMOAC_PROFILE_WELCOME.photosDescription,
      done: hasPhoto,
    },
    {
      id: PROFILE_WELCOME_PHOTOS_TASK_ID,
      label: "Pictures / slideshow",
      description: SMOAC_PROFILE_WELCOME.photosDescription,
      done: hasSlideshow,
    },
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
      label: "Are we the right fit?",
      description: "Help clients see if you are a good match.",
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
      label: "Account details",
      description: "Add a phone or email so clients can reach you.",
      done: Boolean(form.phone.trim() || form.email.trim()),
    },
  ];

  return candidates
    .filter((item) => !item.done)
    .map(({ id, label, description }) => ({ id, label, description }));
}

export function splitProfileWelcomeTasks(tasks: ProfileWelcomeTask[]): {
  nextStep: ProfileWelcomeTask | null;
  remaining: ProfileWelcomeTask[];
} {
  const [nextStep, ...remaining] = tasks;
  return { nextStep: nextStep ?? null, remaining };
}

export function profileWelcomeRemainingLabel(count: number): string {
  return count === 1
    ? "1 thing left to complete"
    : `${count} things left to complete`;
}

export function profileWelcomeTaskDescription(
  task: ProfileWelcomeTask
): string {
  return (
    task.description?.trim() ||
    SMOAC_PROFILE_WELCOME.nextStepFallbackDescription
  );
}

export function profileWelcomeTrialHeadline(
  daysRemaining: number | null | undefined
): string {
  if (typeof daysRemaining !== "number") {
    return SMOAC_PROFILE_WELCOME.trialFallbackHeadline;
  }
  if (daysRemaining <= 0) {
    return "Your trial ends today — upgrade to keep Pro";
  }
  if (daysRemaining === 1) {
    return "1 day left before you need to upgrade";
  }
  return `${daysRemaining} days left before you need to upgrade`;
}

export function resolveProfileWelcomeMembership(
  session: SpecialistProfileWelcomeSession | null | undefined
): ProfileWelcomeMembershipPrompt | null {
  if (!session || session.role !== "specialist") return null;

  if (session.premiumTrialActive) {
    return {
      kind: "trial",
      headline: profileWelcomeTrialHeadline(session.premiumTrialDaysRemaining),
      body: SMOAC_PROFILE_WELCOME.trialBody,
      primaryCta: SMOAC_PROFILE_WELCOME.trialCta,
    };
  }

  if (isProPlusPlan(session.membershipPlan)) {
    return {
      kind: "boost",
      headline: SMOAC_PROFILE_WELCOME.boostHeadline,
      body: SMOAC_PROFILE_WELCOME.boostBody,
      primaryCta: SMOAC_PROFILE_WELCOME.boostCta,
    };
  }

  if (isSpecialistPayingPro(session)) {
    return {
      kind: "upgrade-or-boost",
      headline: SMOAC_PROFILE_WELCOME.upgradeBoostHeadline,
      body: SMOAC_PROFILE_WELCOME.upgradeBoostBody,
      primaryCta: SMOAC_PROFILE_WELCOME.upgradeCta,
      secondaryCta: SMOAC_PROFILE_WELCOME.boostCta,
    };
  }

  return {
    kind: "join",
    headline: SMOAC_PROFILE_WELCOME.joinHeadline,
    body: SMOAC_PROFILE_WELCOME.joinBody,
    primaryCta: SMOAC_PROFILE_WELCOME.joinCta,
  };
}

/** True when specialist login should land on the dashboard welcome. */
export function hasPendingSpecialistProfileWelcome(
  session: SpecialistProfileWelcomeSession | null | undefined
): boolean {
  if (!session || session.role !== "specialist") return false;
  if (!session.userId) return false;
  return true;
}

export function shouldShowSpecialistProfileWelcome(input: {
  session: SpecialistProfileWelcomeSession | null | undefined;
  dashboardMode: SpecialistDashboardMode;
  openInquiries?: boolean;
  force?: boolean;
}): boolean {
  if (!input.force) return false;
  if (input.openInquiries) return false;
  if (
    input.dashboardMode !== "approved-premium" &&
    input.dashboardMode !== "approved-free" &&
    input.dashboardMode !== "demo-premium"
  ) {
    return false;
  }
  return Boolean(input.session?.userId);
}
