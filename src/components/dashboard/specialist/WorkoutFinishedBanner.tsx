"use client";

import { FastActivateButton } from "@/components/ui/FastActivateButton";

export interface WorkoutFinishedNotice {
  id: string;
  clientFirstName: string;
  title: string;
}

interface WorkoutFinishedBannerProps {
  notices: readonly WorkoutFinishedNotice[];
  onView: () => void;
  onDismiss: () => void;
}

/** Small portal notice once a client presses Finish workout. */
export function WorkoutFinishedBanner({
  notices,
  onView,
  onDismiss,
}: WorkoutFinishedBannerProps) {
  const latest = notices[0];
  if (!latest) return null;
  const extra = notices.length - 1;
  const client = latest.clientFirstName.trim() || "Your client";
  const title = latest.title.trim() || "their workout";

  return (
    <aside className="specialist-inquiry-banner" role="status" aria-live="polite">
      <div className="specialist-inquiry-banner__copy">
        <p className="specialist-inquiry-banner__eyebrow">Notification</p>
        <p className="specialist-inquiry-banner__title">
          {client} finished {title}
        </p>
        <p className="specialist-inquiry-banner__body">
          {extra > 0
            ? `${extra} more finished workout${extra === 1 ? "" : "s"}. Open Clients to see the sets they logged.`
            : "Open Clients to see the sets they logged."}
        </p>
      </div>
      <div className="specialist-inquiry-banner__actions">
        <FastActivateButton
          className="smoac-control specialist-inquiry-banner__primary"
          onActivate={onView}
        >
          View
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
