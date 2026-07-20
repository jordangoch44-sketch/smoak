/**
 * Central support contact for public pages (Contact Us, Report a Concern, Help).
 * Update here if the inbox changes — do not scatter hardcoded addresses.
 */
export const SUPPORT_EMAIL = "support@smoac.com";

export function supportMailto(options?: {
  subject?: string;
  body?: string;
}): string {
  const params = new URLSearchParams();
  if (options?.subject) params.set("subject", options.subject);
  if (options?.body) params.set("body", options.body);
  const query = params.toString();
  return query
    ? `mailto:${SUPPORT_EMAIL}?${query}`
    : `mailto:${SUPPORT_EMAIL}`;
}
