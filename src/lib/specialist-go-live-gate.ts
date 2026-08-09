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

/** Coerce admin/DB session rates (string, number, or missing) without throwing. */
function parseSessionPrice(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }
  if (typeof value !== "string") return 0;
  const digits = value.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function isRealProfilePhoto(url: unknown): boolean {
  if (typeof url !== "string") return false;
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
  const displayName = app.displayName?.trim() ?? "";
  const fullName = app.fullName?.trim() ?? "";
  const bio = app.bio?.trim() ?? "";
  const city = app.city?.trim() ?? "";
  const profession = app.professionalType?.trim() ?? "";

  if (!(displayName || fullName)) {
    gaps.push({ id: "displayName", label: "Display name" });
  }

  if (!isRealProfilePhoto(app.media?.profilePhotoUrl)) {
    gaps.push({ id: "photo", label: "Real profile photo" });
  }

  if (parseSessionPrice(app.pricing?.oneOnOnePrice) <= 0) {
    gaps.push({ id: "price", label: "Session price (e.g. $120)" });
  }

  if (bio.length < 40) {
    gaps.push({ id: "bio", label: "Bio (40+ characters)" });
  }

  const zip = normalizeZipCode(app.zipCode ?? "");
  const hasCity = Boolean(city);
  if (!isValidZipCode(zip) && !hasCity) {
    gaps.push({ id: "location", label: "ZIP code or city" });
  }

  if (!Array.isArray(app.specialties) || app.specialties.length === 0) {
    gaps.push({ id: "specialties", label: "At least one specialty" });
  }

  if (!profession) {
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
