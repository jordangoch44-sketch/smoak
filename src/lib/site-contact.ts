/**
 * Central support contact for public pages (Contact Us, Report a Concern, Help).
 * Update here if the inbox changes — do not scatter hardcoded addresses.
 */
export const SUPPORT_EMAIL = "support@smoac.com";

export function supportMailto(options?: {
  subject?: string;
  body?: string;
}): string {
  /* mailto must percent-encode spaces as %20. URLSearchParams uses +, which iOS Mail shows literally. */
  const parts: string[] = [];
  if (options?.subject) {
    parts.push(`subject=${encodeURIComponent(options.subject)}`);
  }
  if (options?.body) {
    parts.push(`body=${encodeURIComponent(options.body)}`);
  }
  return parts.length > 0
    ? `mailto:${SUPPORT_EMAIL}?${parts.join("&")}`
    : `mailto:${SUPPORT_EMAIL}`;
}

/** Prefills a review dispute so the specialist can state the issue. */
export function disputeReviewMailto(options?: {
  specialistName?: string;
  specialistId?: string;
}): string {
  const name = options?.specialistName?.trim();
  const id = options?.specialistId?.trim();
  const lines = [
    "I would like to dispute a SMOAC review.",
    "",
    name ? `Specialist: ${name}` : null,
    id ? `Profile ID: ${id}` : null,
    "",
    "Please describe the issue:",
    "",
  ].filter((line): line is string => line !== null);

  return supportMailto({
    subject: "Dispute a SMOAC review",
    body: lines.join("\n"),
  });
}

/** Prefills a deletion request so support can confirm the account email. */
export function accountDeletionMailto(role?: "client" | "specialist"): string {
  const who =
    role === "specialist"
      ? "specialist account"
      : role === "client"
        ? "client account"
        : "account";
  return supportMailto({
    subject: "Account deletion request",
    body: `Please delete my SMOAC ${who}.\n\nAccount email:\n\nI understand this may remove my profile, saved specialists, and access to inquiries.`,
  });
}
