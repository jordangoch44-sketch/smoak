/**
 * Profile strength for the specialist dashboard.
 * Points come from saved profile fields. Opening a section does not score.
 */
import { SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { isListedGender } from "@/lib/gender";
import { parseMediaUrlList } from "@/lib/specialist-media-limits";
import {
  hasSessionPrice,
  resolveApplicationSessionPriceRange,
  resolveTrainerSessionPriceRange,
} from "@/lib/session-price";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import type { SpecialistApplication, ProfileStatus } from "@/types/specialist-application";

const PLACEHOLDER_MEDIA_MARKERS = [
  "/trainers/placeholder",
  "placeholder.jpg",
  "picsum.photos",
];

const BIO_PARTIAL_CHARS = 40;
const BIO_FULL_CHARS = 160;
const GALLERY_FULL_COUNT = 5;

export const PROFILE_STRENGTH_WEIGHTS = {
  basic: 15,
  specialties: 15,
  media: 25,
  services: 20,
  bio: 15,
  credentials: 10,
} as const;

export type ProfileStrengthSectionId = keyof typeof PROFILE_STRENGTH_WEIGHTS;

export type ProfileStrengthLabel = "Getting Started" | "Strong" | "Excellent";

export type SpecialistActivationPhase =
  | "under-review"
  | "changes-requested"
  | "approved-unpublished"
  | "published";

export type ProfileReminderKind = "incomplete_48h" | "incomplete_week";

export interface ProfileStrengthSource {
  name: string;
  title: string;
  profession: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  gender: string;
  specialty: readonly string[];
  trainingStyle: string;
  trainingOptions: readonly string[];
  serviceType: string;
  profilePhotoUrl: string;
  photoNotes: string;
  introVideoUrl: string;
  videoNotes: string;
  bio: string;
  certifications: readonly { name?: string | null }[];
  pricePerSession: number;
  pricePerSessionMin: number;
  pricePerSessionMax: number;
}

export interface ProfileStrengthSection {
  id: ProfileStrengthSectionId;
  title: string;
  description: string;
  points: number;
  maxPoints: number;
  complete: boolean;
  focus: string;
  href: string;
}

export interface ProfileStrengthRecommendation {
  sectionId: ProfileStrengthSectionId;
  message: string;
  action: string;
  href: string;
}

export interface ProfileStrength {
  score: number;
  label: ProfileStrengthLabel;
  sections: ProfileStrengthSection[];
  recommendation: ProfileStrengthRecommendation | null;
}

export interface ProfilePublicationGap {
  id:
    | "displayName"
    | "photo"
    | "price"
    | "bio"
    | "location"
    | "specialties"
    | "profession"
    | "gender";
  label: string;
}

const SECTION_COPY: Record<
  ProfileStrengthSectionId,
  { title: string; description: string; focus: string }
> = {
  basic: {
    title: "Basic information",
    description: "Name, headline, category, location, and a way to reach you.",
    focus: "name",
  },
  specialties: {
    title: "Specialties and experience",
    description: "What you coach, and how a session with you works.",
    focus: "specialties",
  },
  media: {
    title: "Photos and videos",
    description: "A portrait, five coaching photos, and a short introduction.",
    focus: "hero",
  },
  services: {
    title: "Services and pricing",
    description: "Session price and the ways clients can train with you.",
    focus: "pricing",
  },
  bio: {
    title: "Professional bio",
    description: "A short bio that shows how you coach.",
    focus: "bio",
  },
  credentials: {
    title: "Credentials and verification",
    description: "Certifications clients can trust.",
    focus: "credentials",
  },
};

const SECTION_ORDER: ProfileStrengthSectionId[] = [
  "basic",
  "specialties",
  "media",
  "services",
  "bio",
  "credentials",
];

/** Highest-value gaps first when missing points are tied. */
const RECOMMENDATION_PRIORITY: ProfileStrengthSectionId[] = [
  "media",
  "services",
  "basic",
  "specialties",
  "bio",
  "credentials",
];

const REMINDER_48H_MS = 48 * 60 * 60 * 1000;
const REMINDER_WEEK_START_MS = 5 * 24 * 60 * 60 * 1000;
const REMINDER_WEEK_END_MS = 10 * 24 * 60 * 60 * 1000;

export function profileEditorHref(focus: string): string {
  const params = new URLSearchParams({
    tab: "profile",
    view: "edit",
    focus,
  });
  return `${SPECIALIST_DASHBOARD_PATH}?${params.toString()}`;
}

export const PROFILE_PREVIEW_HREF = `${SPECIALIST_DASHBOARD_PATH}?tab=profile&view=preview`;

export function isSavedMediaUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("blob:")) return false;
  const lower = trimmed.toLowerCase();
  return !PLACEHOLDER_MEDIA_MARKERS.some((marker) => lower.includes(marker));
}

function savedMediaUrls(value: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const url of parseMediaUrlList(value)) {
    if (!isSavedMediaUrl(url) || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function hasLocation(source: ProfileStrengthSource): boolean {
  if (hasText(source.city)) return true;
  return isValidZipCode(normalizeZipCode(source.zipCode));
}

function hasPrice(source: ProfileStrengthSource): boolean {
  return hasSessionPrice(
    resolveTrainerSessionPriceRange({
      pricePerSession: source.pricePerSession,
      pricePerSessionMin: source.pricePerSessionMin,
      pricePerSessionMax: source.pricePerSessionMax,
    })
  );
}

function hasTrainingSignal(source: ProfileStrengthSource): boolean {
  return (
    source.trainingOptions.some((option) => option.trim().length > 0) ||
    hasText(source.trainingStyle)
  );
}

function hasServiceFormat(source: ProfileStrengthSource): boolean {
  return (
    hasText(source.serviceType) ||
    source.trainingOptions.some((option) => option.trim().length > 0)
  );
}

function namedCertifications(source: ProfileStrengthSource): number {
  return source.certifications.filter((cert) => (cert.name ?? "").trim().length >= 2)
    .length;
}

function galleryCount(source: ProfileStrengthSource): number {
  return savedMediaUrls(source.photoNotes).length;
}

function hasIntroOrProfileVideo(source: ProfileStrengthSource): boolean {
  return (
    isSavedMediaUrl(source.introVideoUrl) || savedMediaUrls(source.videoNotes).length > 0
  );
}

interface SectionScore {
  points: number;
  focus: string;
  recommendation: { message: string; action: string; focus: string } | null;
}

function scoreBasic(source: ProfileStrengthSource): SectionScore {
  const checks: Array<{ points: number; done: boolean; focus: string }> = [
    { points: 3, done: hasText(source.name), focus: "name" },
    { points: 3, done: hasText(source.title), focus: "headline" },
    { points: 3, done: hasText(source.profession), focus: "profession" },
    { points: 3, done: hasLocation(source), focus: "service-area" },
    {
      points: 3,
      done: hasText(source.phone) || hasText(source.email),
      focus: "contact",
    },
  ];
  const missing = checks.find((check) => !check.done);
  return {
    points: checks.reduce((sum, check) => sum + (check.done ? check.points : 0), 0),
    focus: missing?.focus ?? "name",
    recommendation: missing
      ? {
          message: "Finish your basic information.",
          action: "Complete Info",
          focus: missing.focus,
        }
      : null,
  };
}

function scoreSpecialties(source: ProfileStrengthSource): SectionScore {
  const hasSpecialties = source.specialty.some((item) => item.trim().length > 0);
  const hasExperience = hasTrainingSignal(source);
  let points = 0;
  if (hasSpecialties) points += 9;
  if (hasExperience) points += 6;
  const focus = hasSpecialties ? "philosophy" : "specialties";
  return {
    points,
    focus: hasSpecialties && hasExperience ? "specialties" : focus,
    recommendation:
      points === PROFILE_STRENGTH_WEIGHTS.specialties
        ? null
        : {
            message: hasSpecialties
              ? "Add your coaching style so clients know what a session feels like."
              : "Add your specialties and experience.",
            action: hasSpecialties ? "Add Style" : "Add Specialties",
            focus,
          },
  };
}

function scoreMedia(source: ProfileStrengthSource): SectionScore {
  const photo = isSavedMediaUrl(source.profilePhotoUrl);
  const photos = Math.min(galleryCount(source), GALLERY_FULL_COUNT);
  const video = hasIntroOrProfileVideo(source);
  const points = (photo ? 8 : 0) + photos * 3 + (video ? 2 : 0);

  if (!photo) {
    return {
      points,
      focus: "avatar",
      recommendation: {
        message: "Add a profile photo so clients recognize you.",
        action: "Add Photo",
        focus: "avatar",
      },
    };
  }
  if (photos < GALLERY_FULL_COUNT) {
    return {
      points,
      focus: "hero",
      recommendation: {
        message: "Add five quality photos to showcase your coaching.",
        action: "Add Photos",
        focus: "hero",
      },
    };
  }
  if (!video) {
    return {
      points,
      focus: "intro-video",
      recommendation: {
        message: "Add an introduction video.",
        action: "Add Video",
        focus: "intro-video",
      },
    };
  }
  return { points, focus: "hero", recommendation: null };
}

function scoreServices(source: ProfileStrengthSource): SectionScore {
  const priced = hasPrice(source);
  const format = hasServiceFormat(source);
  const points = (priced ? 14 : 0) + (format ? 6 : 0);
  const focus = priced ? "session-experience" : "pricing";
  return {
    points,
    focus: priced && format ? "pricing" : focus,
    recommendation:
      points === PROFILE_STRENGTH_WEIGHTS.services
        ? null
        : {
            message: "Add your services and pricing.",
            action: priced ? "Add Services" : "Add Pricing",
            focus,
          },
  };
}

function scoreBio(source: ProfileStrengthSource): SectionScore {
  const length = source.bio.trim().length;
  const points = length >= BIO_FULL_CHARS ? 15 : length >= BIO_PARTIAL_CHARS ? 8 : 0;
  return {
    points,
    focus: "bio",
    recommendation:
      points === PROFILE_STRENGTH_WEIGHTS.bio
        ? null
        : {
            message: "Complete your professional bio.",
            action: "Complete Bio",
            focus: "bio",
          },
  };
}

function scoreCredentials(source: ProfileStrengthSource): SectionScore {
  const points = namedCertifications(source) > 0 ? PROFILE_STRENGTH_WEIGHTS.credentials : 0;
  return {
    points,
    focus: "credentials",
    recommendation:
      points === PROFILE_STRENGTH_WEIGHTS.credentials
        ? null
        : {
            message: "Upload your credentials.",
            action: "Add Credentials",
            focus: "credentials",
          },
  };
}

const SCORERS: Record<
  ProfileStrengthSectionId,
  (source: ProfileStrengthSource) => SectionScore
> = {
  basic: scoreBasic,
  specialties: scoreSpecialties,
  media: scoreMedia,
  services: scoreServices,
  bio: scoreBio,
  credentials: scoreCredentials,
};

export function profileStrengthLabel(score: number): ProfileStrengthLabel {
  if (score >= 80) return "Excellent";
  if (score >= 50) return "Strong";
  return "Getting Started";
}

const EMPTY_PROFILE_STRENGTH_SOURCE: ProfileStrengthSource = {
  name: "",
  title: "",
  profession: "",
  city: "",
  zipCode: "",
  phone: "",
  email: "",
  gender: "",
  specialty: [],
  trainingStyle: "",
  trainingOptions: [],
  serviceType: "",
  profilePhotoUrl: "",
  photoNotes: "",
  introVideoUrl: "",
  videoNotes: "",
  bio: "",
  certifications: [],
  pricePerSession: 0,
  pricePerSessionMin: 0,
  pricePerSessionMax: 0,
};

export function scoreProfileStrength(source: ProfileStrengthSource): ProfileStrength {
  const scored = new Map<ProfileStrengthSectionId, SectionScore>();
  for (const id of SECTION_ORDER) {
    scored.set(id, SCORERS[id](source));
  }

  const sections: ProfileStrengthSection[] = SECTION_ORDER.map((id) => {
    const detail = scored.get(id)!;
    const copy = SECTION_COPY[id];
    const maxPoints = PROFILE_STRENGTH_WEIGHTS[id];
    return {
      id,
      title: copy.title,
      description: copy.description,
      points: detail.points,
      maxPoints,
      complete: detail.points >= maxPoints,
      focus: detail.focus,
      href: profileEditorHref(detail.focus),
    };
  });

  const score = Math.max(
    0,
    Math.min(
      100,
      sections.reduce((sum, section) => sum + section.points, 0)
    )
  );

  const recommendation = pickRecommendation(sections, scored);

  return {
    score,
    label: profileStrengthLabel(score),
    sections,
    recommendation,
  };
}

export function scoreSavedProfile(
  source: ProfileStrengthSource | null | undefined
): ProfileStrength {
  return scoreProfileStrength(source ?? EMPTY_PROFILE_STRENGTH_SOURCE);
}

function pickRecommendation(
  sections: ProfileStrengthSection[],
  scored: Map<ProfileStrengthSectionId, SectionScore>
): ProfileStrengthRecommendation | null {
  const open = sections
    .filter((section) => !section.complete)
    .sort((a, b) => {
      const weight = b.maxPoints - a.maxPoints;
      if (weight !== 0) return weight;
      return (
        RECOMMENDATION_PRIORITY.indexOf(a.id) - RECOMMENDATION_PRIORITY.indexOf(b.id)
      );
    });
  const next = open[0];
  if (!next) return null;
  const detail = scored.get(next.id)?.recommendation;
  if (!detail) return null;
  return {
    sectionId: next.id,
    message: detail.message,
    action: detail.action,
    href: profileEditorHref(detail.focus),
  };
}

/** Same minimum as admin go-live, read from the saved profile fields. */
export function getProfilePublicationGaps(
  source: ProfileStrengthSource
): ProfilePublicationGap[] {
  const gaps: ProfilePublicationGap[] = [];
  if (!hasText(source.name)) {
    gaps.push({ id: "displayName", label: "Business name" });
  }
  if (!isSavedMediaUrl(source.profilePhotoUrl)) {
    gaps.push({ id: "photo", label: "Real profile photo" });
  }
  if (!hasPrice(source)) {
    gaps.push({ id: "price", label: "Session price" });
  }
  if (source.bio.trim().length < BIO_PARTIAL_CHARS) {
    gaps.push({ id: "bio", label: "Bio (40+ characters)" });
  }
  if (!hasLocation(source)) {
    gaps.push({ id: "location", label: "ZIP code or city" });
  }
  if (!source.specialty.some((item) => item.trim().length > 0)) {
    gaps.push({ id: "specialties", label: "At least one specialty" });
  }
  if (!hasText(source.profession)) {
    gaps.push({ id: "profession", label: "Professional type" });
  }
  if (!isListedGender(source.gender)) {
    gaps.push({ id: "gender", label: "Gender" });
  }
  return gaps;
}

export function profileMeetsPublicationMinimum(source: ProfileStrengthSource): boolean {
  return getProfilePublicationGaps(source).length === 0;
}

/** Reminders stop once the profile is in the Excellent band. */
export function profileRemindersComplete(strength: ProfileStrength): boolean {
  return strength.score >= 80;
}

export function strengthSourceFromApplication(
  app: SpecialistApplication
): ProfileStrengthSource {
  const range = resolveApplicationSessionPriceRange(app.pricing);
  return {
    name: app.displayName?.trim() || app.fullName?.trim() || "",
    title: app.headline ?? "",
    profession: app.professionalType ?? "",
    city: app.city ?? "",
    zipCode: app.zipCode ?? "",
    phone: app.phone ?? "",
    email: app.email ?? "",
    gender: app.gender ?? "",
    specialty: Array.isArray(app.specialties) ? app.specialties : [],
    trainingStyle: app.coachingPhilosophy ?? "",
    trainingOptions: Array.isArray(app.trainingOptions) ? app.trainingOptions : [],
    serviceType: app.serviceType ?? "",
    profilePhotoUrl: app.media?.profilePhotoUrl ?? "",
    photoNotes: app.media?.trainingVideoUrls ?? "",
    introVideoUrl: app.media?.introVideoUrl ?? "",
    videoNotes: app.media?.profileVideoUrls ?? "",
    bio: app.bio ?? "",
    certifications: Array.isArray(app.certifications) ? app.certifications : [],
    pricePerSession: range.max,
    pricePerSessionMin: range.min,
    pricePerSessionMax: range.max,
  };
}

/**
 * Approved listings are already public once the catalog row exists.
 * Until that hydrate finishes, keep the business dashboard so a refresh
 * does not flash the application checklist.
 */
export function resolveSpecialistActivationPhase(input: {
  profileStatus: ProfileStatus | null | undefined;
  catalogPublished: boolean;
  catalogKnown: boolean;
}): SpecialistActivationPhase | null {
  const status = input.profileStatus;
  if (status === "REJECTED") return "changes-requested";
  if (status === "PENDING_APPROVAL") return "under-review";
  if (status === "APPROVED") {
    if (!input.catalogKnown || input.catalogPublished) return "published";
    return "approved-unpublished";
  }
  return null;
}

export function activationStatusLabel(phase: SpecialistActivationPhase): string {
  if (phase === "changes-requested") return "Changes Requested";
  if (phase === "published" || phase === "approved-unpublished") {
    return "Application Approved";
  }
  return "Application Under Review";
}

export function dueProfileReminder(input: {
  profileStatus: ProfileStatus | null | undefined;
  submittedAt: string | null | undefined;
  now: Date;
  score: number;
  sent48h: boolean;
  sentWeek: boolean;
}): ProfileReminderKind | null {
  if (
    input.profileStatus !== "PENDING_APPROVAL" &&
    input.profileStatus !== "APPROVED"
  ) {
    return null;
  }
  if (input.score >= 80) return null;
  const submitted = Date.parse(input.submittedAt ?? "");
  if (!Number.isFinite(submitted)) return null;
  const age = input.now.getTime() - submitted;
  if (age < REMINDER_48H_MS) return null;
  if (age >= REMINDER_WEEK_START_MS && age < REMINDER_WEEK_END_MS) {
    return input.sentWeek ? null : "incomplete_week";
  }
  if (age < REMINDER_WEEK_START_MS) {
    return input.sent48h ? null : "incomplete_48h";
  }
  return null;
}
