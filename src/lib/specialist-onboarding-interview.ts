import { isListedGender } from "@/lib/gender";
import {
  parseSessionPrice,
} from "@/lib/session-price";
import { isValidEmail } from "@/lib/validation/email";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import type { SpecialistServiceType } from "@/types/specialist-service-area";
import type { SpecialistOnboardingStep } from "@/lib/specialist-onboarding-validation";

export type SpecialistInterviewBeatId =
  | "professional-type"
  | "full-name"
  | "gender"
  | "business-name"
  | "professional-title"
  | "email"
  | "password"
  | "phone"
  | "photo"
  | "service-type"
  | "location"
  | "street"
  | "service-area"
  | "specialties"
  | "certifications"
  | "bio"
  | "training-options"
  | "pricing"
  | "instagram"
  | "website"
  | "preview";

/** Older drafts stored these as their own screens — resume onto the current path. */
const FOLDED_INTERVIEW_BEAT_IDS: Record<string, SpecialistInterviewBeatId> = {
  gender: "full-name",
  "professional-title": "business-name",
  password: "email",
  website: "preview",
  instagram: "preview",
  certifications: "bio",
};

export type SpecialistInterviewTrailIcon =
  | "person"
  | "briefcase"
  | "spark"
  | "mail"
  | "lock"
  | "phone"
  | "camera"
  | "pin"
  | "home"
  | "map"
  | "star"
  | "badge"
  | "bio"
  | "options"
  | "price"
  | "social"
  | "globe"
  | "preview";

export interface SpecialistInterviewBeat {
  id: SpecialistInterviewBeatId;
  section: SpecialistOnboardingStep;
  required: boolean;
  title: string;
  subtitle: string;
  trailTitle: string;
  trailHint: string;
  trailIcon: SpecialistInterviewTrailIcon;
}

export interface SpecialistInterviewContext {
  skipPassword?: boolean;
  serviceType?: SpecialistServiceType | "";
}

const ALL_BEATS: readonly SpecialistInterviewBeat[] = [
  {
    id: "professional-type",
    section: 1,
    required: true,
    title: "What type of professional are you?",
    subtitle: "Choose the role that best describes your practice.",
    trailTitle: "Professional type",
    trailHint: "The role clients will see",
    trailIcon: "briefcase",
  },
  {
    id: "full-name",
    section: 2,
    required: true,
    title: "Who are you?",
    subtitle: "Your name and how we should list your gender on your profile.",
    trailTitle: "You",
    trailHint: "Name and gender",
    trailIcon: "person",
  },
  {
    id: "business-name",
    section: 2,
    required: true,
    title: "How should clients find you?",
    subtitle: "Business name and the title on your marketplace card.",
    trailTitle: "Your practice",
    trailHint: "Business name and title",
    trailIcon: "briefcase",
  },
  {
    id: "email",
    section: 2,
    required: true,
    title: "Create your sign-in",
    subtitle: "Email and password for signing in — including while you’re under review.",
    trailTitle: "Sign-in",
    trailHint: "Email and password",
    trailIcon: "mail",
  },
  {
    id: "phone",
    section: 2,
    required: true,
    title: "What’s your phone number?",
    subtitle: "So we can reach you about your application.",
    trailTitle: "Phone number",
    trailHint: "For application updates",
    trailIcon: "phone",
  },
  {
    id: "photo",
    section: 2,
    required: true,
    title: "Add a profile photo",
    subtitle: "A clear face or brand photo — clients see this on your card.",
    trailTitle: "Profile photo",
    trailHint: "Shown on your marketplace card",
    trailIcon: "camera",
  },
  {
    id: "service-type",
    section: 3,
    required: true,
    title: "Where do you work with clients?",
    subtitle: "In person, virtual, or both.",
    trailTitle: "Service type",
    trailHint: "In person, virtual, or both",
    trailIcon: "map",
  },
  {
    id: "location",
    section: 3,
    required: true,
    title: "Set your location",
    subtitle: "Enter your ZIP so clients can find you.",
    trailTitle: "Location",
    trailHint: "City or ZIP code",
    trailIcon: "pin",
  },
  {
    id: "street",
    section: 3,
    required: false,
    title: "Where’s your primary facility?",
    subtitle:
      "The pin is how nearby clients discover you. Street text stays private.",
    trailTitle: "Primary facility",
    trailHint: "Pin for marketplace discovery",
    trailIcon: "home",
  },
  {
    id: "service-area",
    section: 3,
    required: false,
    title: "Describe your service area",
    subtitle: "Optional. Neighborhoods or cities you typically serve.",
    trailTitle: "Service area",
    trailHint: "Optional neighborhoods you serve",
    trailIcon: "map",
  },
  {
    id: "specialties",
    section: 4,
    required: true,
    title: "What are your specialties?",
    subtitle:
      "Pick the closest matches — you can change these anytime.",
    trailTitle: "Specialties",
    trailHint: "How clients will filter to you",
    trailIcon: "star",
  },
  {
    id: "bio",
    section: 5,
    required: true,
    title: "Tell us about yourself",
    subtitle: "A short bio for your profile — who you help and what clients can expect.",
    trailTitle: "About you",
    trailHint: "A short bio for your profile",
    trailIcon: "bio",
  },
  {
    id: "training-options",
    section: 5,
    required: true,
    title: "How do you train clients?",
    subtitle: "Pick the session formats you offer.",
    trailTitle: "Training options",
    trailHint: "1:1, group, and more",
    trailIcon: "options",
  },
  {
    id: "pricing",
    section: 5,
    required: true,
    title: "What’s your 1:1 session price?",
    subtitle: "Shown as a range on your marketplace card after approval.",
    trailTitle: "Session rate",
    trailHint: "Your typical 1:1 range",
    trailIcon: "price",
  },
  {
    id: "preview",
    section: 6,
    required: true,
    title: "Preview & submit",
    subtitle: "We’ll review this application. When approved, your profile goes live on Marketplace.",
    trailTitle: "Preview",
    trailHint: "Review and submit",
    trailIcon: "preview",
  },
] as const;

function isCanonicalInterviewBeatId(
  value: string
): value is SpecialistInterviewBeatId {
  return ALL_BEATS.some((beat) => beat.id === value);
}

export function resolveSpecialistInterviewBeatId(
  value: string | null | undefined
): SpecialistInterviewBeatId | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const mapped = FOLDED_INTERVIEW_BEAT_IDS[raw] ?? raw;
  return isCanonicalInterviewBeatId(mapped) ? mapped : null;
}

function beatIsVisible(
  beat: SpecialistInterviewBeat,
  context: SpecialistInterviewContext
): boolean {
  if (beat.id === "street") {
    return context.serviceType === "in-person" || context.serviceType === "both";
  }
  if (beat.id === "location") {
    return true;
  }
  return true;
}

export function listSpecialistInterviewBeats(
  context: SpecialistInterviewContext = {}
): SpecialistInterviewBeat[] {
  return ALL_BEATS.filter((beat) => beatIsVisible(beat, context));
}

export function isSpecialistInterviewBeatRequired(
  beat: SpecialistInterviewBeat,
  state: SpecialistOnboardingState,
  context: SpecialistInterviewContext = {}
): boolean {
  if (beat.id === "location") {
    return state.serviceType !== "virtual";
  }
  return beat.required;
}

export function getSpecialistInterviewBeatError(
  beat: SpecialistInterviewBeat,
  state: SpecialistOnboardingState,
  context: SpecialistInterviewContext = {},
  confirmPassword = ""
): string | null {
  if (!isSpecialistInterviewBeatRequired(beat, state, context)) return null;

  switch (beat.id) {
    case "professional-type":
      return state.professionalType.length ? null : "Select your professional type.";
    case "full-name":
    case "gender":
      if (!state.fullName.trim()) return "Enter your full name.";
      return isListedGender(state.gender) ? null : "Select your gender.";
    case "business-name":
    case "professional-title":
      if (!state.displayName.trim()) return "Enter your business name.";
      return state.headline.trim() ? null : "Enter your professional title.";
    case "email":
    case "password":
      if (!isValidEmail(state.email)) {
        return "Enter a valid email — you’ll use it to sign in.";
      }
      if (context.skipPassword) return null;
      if (state.password.trim().length < 8) {
        return "Create a password with at least 8 characters.";
      }
      if (state.password !== confirmPassword) {
        return "Passwords do not match.";
      }
      return null;
    case "phone":
      return state.phone.trim() ? null : "Enter your phone number.";
    case "photo":
      return state.media.profilePhotoUrl.trim()
        ? null
        : "Add a profile photo.";
    case "service-type":
      return state.serviceType ? null : "Select in-person, virtual, or both.";
    case "location": {
      if (state.serviceType === "virtual") return null;
      const zip = normalizeZipCode(state.zipCode);
      return isValidZipCode(zip) ? null : "Enter a valid 5-digit ZIP code.";
    }
    case "specialties":
      return state.specialties.length > 0
        ? null
        : "Select at least one specialty.";
    case "bio":
      return state.bio.trim().length >= 40
        ? null
        : "Write a short bio (about 40+ characters).";
    case "training-options":
      return state.trainingOptions.length > 0
        ? null
        : "Select at least one training option.";
    case "pricing": {
      const min = parseSessionPrice(state.pricing?.oneOnOnePriceMin);
      const max = parseSessionPrice(state.pricing?.oneOnOnePriceMax);
      return min > 0 && max > 0
        ? null
        : "Enter your session price range (e.g. $80–$120).";
    }
    default:
      return null;
  }
}

export function firstBeatIdForSection(
  section: SpecialistOnboardingStep,
  context: SpecialistInterviewContext = {}
): SpecialistInterviewBeatId {
  const match = listSpecialistInterviewBeats(context).find(
    (beat) => beat.section === section
  );
  return match?.id ?? "professional-type";
}

export function getSpecialistInterviewResumeBeatId(
  state: SpecialistOnboardingState,
  options?: SpecialistInterviewContext & {
    savedBeatId?: string | null;
    savedStep?: number | null;
  }
): SpecialistInterviewBeatId {
  const context: SpecialistInterviewContext = {
    skipPassword: options?.skipPassword,
    serviceType: state.serviceType,
  };
  const beats = listSpecialistInterviewBeats(context);
  const firstIncomplete =
    beats.find((beat) =>
      Boolean(getSpecialistInterviewBeatError(beat, state, context))
    ) ?? beats[beats.length - 1];
  const inferred = firstIncomplete.id;

  const savedId = resolveSpecialistInterviewBeatId(options?.savedBeatId);
  if (savedId) {
    const savedIndex = beats.findIndex((beat) => beat.id === savedId);
    const inferredIndex = beats.findIndex((beat) => beat.id === inferred);
    if (savedIndex >= 0 && savedIndex <= inferredIndex) return savedId;
  }

  const savedStep = options?.savedStep;
  if (
    savedStep === 1 ||
    savedStep === 2 ||
    savedStep === 3 ||
    savedStep === 4 ||
    savedStep === 5 ||
    savedStep === 6
  ) {
    const fromSection = firstBeatIdForSection(savedStep, context);
    const savedIndex = beats.findIndex((beat) => beat.id === fromSection);
    const inferredIndex = beats.findIndex((beat) => beat.id === inferred);
    if (savedIndex >= 0 && savedIndex <= inferredIndex) return fromSection;
  }

  return inferred;
}

export function isLastAccountInterviewBeat(
  beatId: SpecialistInterviewBeatId,
  context: SpecialistInterviewContext = {}
): boolean {
  const beats = listSpecialistInterviewBeats(context);
  const index = beats.findIndex((beat) => beat.id === beatId);
  if (index < 0) return false;
  if (beats[index]?.section !== 2) return false;
  return !beats.slice(index + 1).some((beat) => beat.section === 2);
}
