import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import type { SpecialistApplication } from "@/types/specialist-application";

export interface SpecialistGoLiveGap {
  id:
    | "displayName"
    | "photo"
    | "price"
    | "bio"
    | "location"
    | "specialties"
    | "profession";
  label: string;
}

const PLACEHOLDER_PHOTO_MARKERS = [
  "/trainers/placeholder",
  "placeholder.jpg",
  "picsum.photos",
];

function parseSessionPrice(value: string): number {
  const digits = value.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function isRealProfilePhoto(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return !PLACEHOLDER_PHOTO_MARKERS.some((marker) => lower.includes(marker));
}

/** Fields required before Approve / Activate can put a specialist on Explore. */
export function getSpecialistGoLiveGaps(
  app: SpecialistApplication
): SpecialistGoLiveGap[] {
  const gaps: SpecialistGoLiveGap[] = [];

  if (!(app.displayName.trim() || app.fullName.trim())) {
    gaps.push({ id: "displayName", label: "Display name" });
  }

  if (!isRealProfilePhoto(app.media.profilePhotoUrl)) {
    gaps.push({ id: "photo", label: "Real profile photo" });
  }

  if (parseSessionPrice(app.pricing.oneOnOnePrice) <= 0) {
    gaps.push({ id: "price", label: "Session price (e.g. $120)" });
  }

  if (app.bio.trim().length < 40) {
    gaps.push({ id: "bio", label: "Bio (40+ characters)" });
  }

  const zip = normalizeZipCode(app.zipCode);
  const hasCity = Boolean(app.city.trim());
  if (!isValidZipCode(zip) && !hasCity) {
    gaps.push({ id: "location", label: "ZIP code or city" });
  }

  if (!Array.isArray(app.specialties) || app.specialties.length === 0) {
    gaps.push({ id: "specialties", label: "At least one specialty" });
  }

  if (!app.professionalType.trim()) {
    gaps.push({ id: "profession", label: "Professional type" });
  }

  return gaps;
}

export function isSpecialistReadyToGoLive(app: SpecialistApplication): boolean {
  return getSpecialistGoLiveGaps(app).length === 0;
}

export function formatSpecialistGoLiveBlockMessage(
  gaps: readonly SpecialistGoLiveGap[]
): string {
  if (gaps.length === 0) return "";
  const labels = gaps.map((gap) => gap.label).join(", ");
  return `Cannot go live yet — add: ${labels}.`;
}
