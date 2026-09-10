"use client";

import { FastActivateButton } from "@/components/ui/FastActivateButton";

interface InquiryNotificationBannerProps {
  unreadCount: number;
  latestSummary?: string | null;
  onReview: () => void;
  onDismiss: () => void;
}

export function InquiryNotificationBanner({
  unreadCount,
  latestSummary,
  onReview,
  onDismiss,
}: InquiryNotificationBannerProps) {
  if (unreadCount <= 0) return null;

  const title =
    unreadCount === 1
      ? "Want to review this message?"
      : `Want to review these ${unreadCount} messages?`;

  return (
    <aside
      className="specialist-inquiry-banner"
      role="status"
      aria-live="polite"
    >
      <div className="specialist-inquiry-banner__copy">
        <p className="specialist-inquiry-banner__eyebrow">Notification</p>
        <p className="specialist-inquiry-banner__title">{title}</p>
        <p className="specialist-inquiry-banner__body">
          {latestSummary
            ? latestSummary
            : "Open Inquiries to read and reply in the thread."}
        </p>
      </div>
      <div className="specialist-inquiry-banner__actions">
        <FastActivateButton
          className="smoac-control specialist-inquiry-banner__primary"
          onActivate={onReview}
        >
          Yes
        </FastActivateButton>
        <FastActivateButton
          className="smoac-control specialist-inquiry-banner__secondary"
          onActivate={onDismiss}
        >
          Not now
        </FastActivateButton>
      </div>
    </aside>
  );
}
