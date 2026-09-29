export const TRUST_REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "safety", label: "Safety concern" },
  { id: "other", label: "Something else" },
] as const;

export type TrustReportReasonId = (typeof TRUST_REPORT_REASONS)[number]["id"];

export function isTrustReportReason(value: string): value is TrustReportReasonId {
  return TRUST_REPORT_REASONS.some((reason) => reason.id === value);
}

export function labelForTrustReportReason(id: string): string {
  return TRUST_REPORT_REASONS.find((reason) => reason.id === id)?.label ?? id;
}
