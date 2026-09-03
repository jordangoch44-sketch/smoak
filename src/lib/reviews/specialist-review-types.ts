/**
 * Live SMOAC review types + row mapping — pairs with `specialist-reviews-client.ts`.
 * Not used by catalog demo (`trainer-reviews.ts`) or dashboard hub (`specialist-reputation.ts`).
 */

export type SpecialistReviewStatus = "published" | "hidden" | "flagged";

export interface SpecialistReview {
  id: string;
  specialistId: string;
  rating: number;
  reviewText: string;
  authorDisplayName: string;
  createdAt: string;
  status: SpecialistReviewStatus;
}

export interface SpecialistReviewAggregate {
  specialistId: string;
  reviewCount: number;
  avgRating: number | null;
}

export type SubmitSpecialistReviewErrorCode =
  | "not_authenticated"
  | "not_client"
  | "specialist_not_found"
  | "self_review"
  | "already_reviewed"
  | "cooldown"
  | "invalid_rating"
  | "invalid_text"
  | "unavailable"
  | "network"
  | "unknown";

export type SubmitSpecialistReviewResult =
  | { ok: true; review: SpecialistReview }
  | {
      ok: false;
      error: SubmitSpecialistReviewErrorCode;
      nextEligibleAt?: string;
    };

export const REVIEW_TEXT_MIN = 10;
export const REVIEW_TEXT_MAX = 500;
export const REVIEW_LIST_PREVIEW = 10;

export type SpecialistReviewSort = "newest" | "highest" | "lowest";

export function sortSpecialistReviews(
  reviews: SpecialistReview[],
  sort: SpecialistReviewSort
): SpecialistReview[] {
  const next = [...reviews];
  if (sort === "highest") {
    next.sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt));
  } else if (sort === "lowest") {
    next.sort((a, b) => a.rating - b.rating || b.createdAt.localeCompare(a.createdAt));
  } else {
    next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return next;
}

/** Google-style relative stamp: "a month ago", "3 days ago". */
export function formatReviewRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / (86400 * 7)), "week");
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

export function formatSmoacReviewCountLabel(count: number): string {
  return count === 1 ? "1 SMOAC Review" : `${count} SMOAC Reviews`;
}

/** Serialize aggregate Map for RSC → client props. */
export function serializeReviewAggregates(
  map: Map<string, SpecialistReviewAggregate>
): SpecialistReviewAggregate[] {
  return [...map.values()];
}

export function reviewAggregatesFromSerialized(
  rows: SpecialistReviewAggregate[] | undefined
): Map<string, SpecialistReviewAggregate> {
  const map = new Map<string, SpecialistReviewAggregate>();
  for (const row of rows ?? []) {
    map.set(row.specialistId, row);
  }
  return map;
}

export function formatReviewAuthorFallback(): string {
  return "Verified SMOAC Client";
}

export function formatCooldownMessage(nextEligibleAt?: string): string {
  if (!nextEligibleAt) {
    return "You can leave one SMOAC review every 7 days.";
  }
  const date = new Date(nextEligibleAt);
  if (Number.isNaN(date.getTime())) {
    return "You can leave one SMOAC review every 7 days.";
  }
  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `You can leave one SMOAC review every 7 days. You’ll be able to review another specialist on ${formatted}.`;
}

export function submitReviewErrorMessage(
  result: Extract<SubmitSpecialistReviewResult, { ok: false }>
): string {
  switch (result.error) {
    case "not_authenticated":
      return "Sign in with a client account to leave a review.";
    case "not_client":
      return "Only client accounts can leave SMOAC reviews.";
    case "specialist_not_found":
      return "This specialist is no longer available.";
    case "self_review":
      return "You can’t review your own specialist profile.";
    case "already_reviewed":
      return "You’ve already reviewed this specialist.";
    case "cooldown":
      return formatCooldownMessage(result.nextEligibleAt);
    case "invalid_rating":
      return "Please select a rating from 1 to 5 stars.";
    case "invalid_text":
      return `Reviews must be between ${REVIEW_TEXT_MIN} and ${REVIEW_TEXT_MAX} characters.`;
    case "unavailable":
      return "SMOAC reviews aren’t available yet for this specialist. Please try again later.";
    case "network":
      return "We couldn’t submit your review. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function trainerFirstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "this specialist";
}

export function mapReviewRow(row: {
  id: string;
  specialist_id: string;
  rating: number;
  review_text: string;
  author_display_name: string;
  created_at: string;
  status: string;
}): SpecialistReview {
  return {
    id: row.id,
    specialistId: row.specialist_id,
    rating: row.rating,
    reviewText: row.review_text,
    authorDisplayName:
      row.author_display_name?.trim() || formatReviewAuthorFallback(),
    createdAt: row.created_at,
    status: (row.status as SpecialistReviewStatus) || "published",
  };
}
