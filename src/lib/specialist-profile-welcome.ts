/**
 * Specialist dashboard welcome: incomplete profile tasks plus a membership
 * comparison. Opens on every third login, not every visit.
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
import { PROFILE_WELCOME_LOGIN_COUNT_KEY } from "@/lib/dev-storage-keys";
import type { SpecialistProfileEditForm } from "@/types/specialist-profile-edit";

/** Welcome opens when the specialist login count is a multiple of this. */
export const PROFILE_WELCOME_EVERY_N_LOGINS = 3;

const WELCOME_FREE_BENEFITS = [
  "Marketplace listing",
  "Client inquiries",
  "Public profile",
] as const;

const WELCOME_PRO_BENEFITS = [
  "Profile analytics",
  "Ranking insights",
  "Client engagement",
  "Free first session",
  "Intro video",
] as const;

const WELCOME_PRO_PLUS_BENEFITS = [
  "Up to 5 phone videos",
  "Client results",
  "20% off Boosts",
] as const;

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
  joinCta: "Upgrade to Pro",
  restoreCta: "Restore Pro",
  trialFallbackHeadline: "Your Pro trial is running out",
  trialCta: "Keep Pro",
  upgradeCta: "Upgrade to PRO+",
  boostCta: "Boost profile",
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

export type ProfileWelcomeTier = {
  name: string;
  benefits: readonly string[];
};

export type ProfileWelcomeMembershipPrompt = {
  kind: ProfileWelcomeMembershipKind;
  primaryCta: string;
  /** Trial countdown or a short restore note above the comparison. */
  note?: string;
  /** Label above the next tier. Trial uses "Keep". */
  upgradeEyebrow?: string;
  current: ProfileWelcomeTier;
  upgrade?: ProfileWelcomeTier;
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
  premiumTrialUsed?: boolean;
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
      note: profileWelcomeTrialHeadline(session.premiumTrialDaysRemaining),
      primaryCta: SMOAC_PROFILE_WELCOME.trialCta,
      upgradeEyebrow: "Keep",
      current: { name: "Pro Trial", benefits: WELCOME_PRO_BENEFITS },
      upgrade: {
        name: "Pro",
        benefits: ["These benefits stay after your trial"],
      },
    };
  }

  if (isProPlusPlan(session.membershipPlan)) {
    return {
      kind: "boost",
      primaryCta: SMOAC_PROFILE_WELCOME.boostCta,
      current: {
        name: "PRO+",
        benefits: ["Everything in Pro", ...WELCOME_PRO_PLUS_BENEFITS],
      },
    };
  }

  if (isSpecialistPayingPro(session)) {
    return {
      kind: "upgrade-or-boost",
      primaryCta: SMOAC_PROFILE_WELCOME.upgradeCta,
      current: { name: "Pro", benefits: WELCOME_PRO_BENEFITS },
      upgrade: { name: "PRO+", benefits: WELCOME_PRO_PLUS_BENEFITS },
    };
  }

  if (session.premiumTrialUsed || session.premiumTrialJustEnded) {
    return {
      kind: "join",
      note: "Saved Pro extras come back on your profile.",
      primaryCta: SMOAC_PROFILE_WELCOME.restoreCta,
      current: { name: "Free", benefits: WELCOME_FREE_BENEFITS },
      upgrade: { name: "Pro", benefits: WELCOME_PRO_BENEFITS },
    };
  }

  return {
    kind: "join",
    primaryCta: SMOAC_PROFILE_WELCOME.joinCta,
    current: { name: "Free", benefits: WELCOME_FREE_BENEFITS },
    upgrade: { name: "Pro", benefits: WELCOME_PRO_BENEFITS },
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

type WelcomeLoginCountMap = Record<string, number>;

/** Same document can resolve the post-login path more than once. Count once. */
const recordedWelcomeLogins = new Map<string, number>();

function readWelcomeLoginCounts(): WelcomeLoginCountMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_WELCOME_LOGIN_COUNT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const counts: WelcomeLoginCountMap = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        counts[id] = Math.floor(value);
      }
    }
    return counts;
  } catch {
    return {};
  }
}

function writeWelcomeLoginCounts(counts: WelcomeLoginCountMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PROFILE_WELCOME_LOGIN_COUNT_KEY,
      JSON.stringify(counts)
    );
  } catch {
    /* Private mode or a full store — skip the count rather than block login. */
  }
}

export function profileWelcomeDueOnLogin(loginCount: number): boolean {
  return (
    loginCount > 0 && loginCount % PROFILE_WELCOME_EVERY_N_LOGINS === 0
  );
}

/** Next login number for this user, including one already counted on this page. */
export function peekProfileWelcomeLoginCount(userId: string): number {
  const recorded = recordedWelcomeLogins.get(userId);
  if (recorded != null) return recorded;
  return (readWelcomeLoginCounts()[userId] ?? 0) + 1;
}

/** Count this login once per page load. */
export function recordProfileWelcomeLogin(userId: string): number {
  const recorded = recordedWelcomeLogins.get(userId);
  if (recorded != null) return recorded;
  const counts = readWelcomeLoginCounts();
  const next = (counts[userId] ?? 0) + 1;
  counts[userId] = next;
  writeWelcomeLoginCounts(counts);
  recordedWelcomeLogins.set(userId, next);
  return next;
}
