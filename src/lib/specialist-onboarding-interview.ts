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
    title: "What’s your full name?",
    subtitle: "This will be visible on your profile.",
    trailTitle: "Full name",
    trailHint: "Visible on your profile",
    trailIcon: "person",
  },
  {
    id: "gender",
    section: 2,
    required: true,
    title: "How should we list your gender?",
    subtitle: "Shown on your public profile.",
    trailTitle: "Gender",
    trailHint: "Shown on your profile",
    trailIcon: "person",
  },
  {
    id: "business-name",
    section: 2,
    required: true,
    title: "What’s your business name?",
    subtitle: "How clients will find you.",
    trailTitle: "Business name",
    trailHint: "How clients will find you",
    trailIcon: "briefcase",
  },
  {
    id: "professional-title",
    section: 2,
    required: true,
    title: "What’s your professional title?",
    subtitle: "e.g. Strength Coach, Mobility Specialist",
    trailTitle: "Professional title",
    trailHint: "e.g. Strength Coach, Mobility Specialist",
    trailIcon: "spark",
  },
  {
    id: "email",
    section: 2,
    required: true,
    title: "What’s your email?",
    subtitle: "You’ll use this to sign in — including while your application is under review.",
    trailTitle: "Email",
    trailHint: "Used to sign in",
    trailIcon: "mail",
  },
  {
    id: "password",
    section: 2,
    required: true,
    title: "Create a password",
    subtitle: "At least 8 characters. You’ll use this to sign in.",
    trailTitle: "Password",
    trailHint: "At least 8 characters",
    trailIcon: "lock",
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
    title: "Add a facility address?",
    subtitle: "Optional. Street text stays private — marketplace uses the pin only.",
    trailTitle: "Facility address",
    trailHint: "Optional — helps clients find you",
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
    subtitle: "Select the areas you coach. You can refine these anytime from your dashboard.",
    trailTitle: "Specialties",
    trailHint: "How clients will filter to you",
    trailIcon: "star",
  },
  {
    id: "certifications",
    section: 4,
    required: false,
    title: "Any certifications to add?",
    subtitle: "Optional. You can add or edit these anytime after approval.",
    trailTitle: "Certifications",
    trailHint: "Optional credentials",
    trailIcon: "badge",
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
    id: "instagram",
    section: 5,
    required: false,
    title: "Add your Instagram?",
    subtitle: "Optional. You can add this later from your profile.",
    trailTitle: "Instagram",
    trailHint: "Optional handle",
    trailIcon: "social",
  },
  {
    id: "website",
    section: 5,
    required: false,
    title: "Add a website?",
    subtitle: "Optional. You can add this later from your profile.",
    trailTitle: "Website",
    trailHint: "Optional link",
    trailIcon: "globe",
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

function isInterviewBeatId(value: string): value is SpecialistInterviewBeatId {
  return ALL_BEATS.some((beat) => beat.id === value);
}

function beatIsVisible(
  beat: SpecialistInterviewBeat,
  context: SpecialistInterviewContext
): boolean {
  if (beat.id === "password") return !context.skipPassword;
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
  if (beat.id === "password") {
    return !context.skipPassword;
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
      return state.fullName.trim() ? null : "Enter your full name.";
    case "gender":
      return isListedGender(state.gender) ? null : "Select your gender.";
    case "business-name":
      return state.displayName.trim() ? null : "Enter your business name.";
    case "professional-title":
      return state.headline.trim() ? null : "Enter your professional title.";
    case "email":
      return isValidEmail(state.email)
        ? null
        : "Enter a valid email — you’ll use it to sign in.";
    case "password":
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

  const savedId = options?.savedBeatId?.trim() ?? "";
  if (savedId && isInterviewBeatId(savedId)) {
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
  return !beats.slice(index + 1).some((beat) => beat.section === 2);
}
