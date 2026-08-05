"use client";

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
      ? "New client inquiry"
      : `${unreadCount} new client inquiries`;

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
            ? `${latestSummary}. Reply by email from Inquiries below.`
            : "Open Inquiries below for client details, then reply by email."}
        </p>
      </div>
      <div className="specialist-inquiry-banner__actions">
        <button
          type="button"
          className="smoac-control specialist-inquiry-banner__primary"
          onClick={onReview}
        >
          Review inquiries
        </button>
        <button
          type="button"
          className="smoac-control specialist-inquiry-banner__secondary"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </aside>
  );
}
