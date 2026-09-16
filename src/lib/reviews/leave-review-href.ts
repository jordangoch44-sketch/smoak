/** Deep-link that opens the leave-review modal on a specialist profile. */
export function buildLeaveReviewHref(specialistId: string): string {
  const id = specialistId.trim();
  if (!id) return "/explore";
  return `/trainers/${id}?review=1`;
}

/** Absolute leave-review URL for sharing with clients. */
export function buildLeaveReviewAbsoluteUrl(
  specialistId: string,
  origin = typeof window !== "undefined" ? window.location.origin : ""
): string {
  const path = buildLeaveReviewHref(specialistId);
  return origin ? `${origin}${path}` : path;
}

export function isLeaveReviewQuery(value: string | null | undefined): boolean {
  return value === "1" || value === "true";
}
