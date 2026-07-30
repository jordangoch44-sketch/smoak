/** Deep-link that opens the leave-review modal on a specialist profile. */
export function buildLeaveReviewHref(specialistId: string): string {
  const id = specialistId.trim();
  if (!id) return "/explore";
  return `/trainers/${id}?review=1`;
}

export function isLeaveReviewQuery(value: string | null | undefined): boolean {
  return value === "1" || value === "true";
}
