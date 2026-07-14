/**
 * Lightweight product analytics for specialist inquiry.
 * No third-party provider — console in development only.
 */

export type InquiryAnalyticsEvent =
  | "specialist_inquiry_opened"
  | "inquiry_action_selected"
  | "inquiry_topic_selected"
  | "inquiry_send_clicked"
  | "quick_signup_opened"
  | "quick_signup_completed"
  | "existing_user_signin_selected"
  | "inquiry_sent"
  | "inquiry_failed"
  | "profile_completion_opened";

export function trackInquiryEvent(
  event: InquiryAnalyticsEvent,
  props?: Record<string, string | number | boolean | null | undefined>
): void {
  if (process.env.NODE_ENV === "production") return;
  console.info("[smoac:analytics]", event, props ?? {});
}
