"use client";

import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { BellIcon, CloseIcon } from "@/components/ui/icons";

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

/** One-line notice once a client presses Finish workout. */
export function WorkoutFinishedBanner({
  notices,
  onView,
  onDismiss,
}: WorkoutFinishedBannerProps) {
  const latest = notices[0];
  if (!latest) return null;
  const client = latest.clientFirstName.trim() || "Your client";
  const title = latest.title.trim() || "their workout";

  return (
    <aside className="workout-finished-banner" role="status" aria-live="polite">
      <p className="workout-finished-banner__line">
        <BellIcon className="workout-finished-banner__bell" />
        <span className="workout-finished-banner__text">
          {client} has finished {title}
        </span>
      </p>
      <div className="workout-finished-banner__actions">
        <FastActivateButton
          className="smoac-control workout-finished-banner__view"
          onActivate={onView}
        >
          View
        </FastActivateButton>
        <FastActivateButton
          className="smoac-control workout-finished-banner__dismiss"
          aria-label="Dismiss notification"
          onActivate={onDismiss}
        >
          <CloseIcon className="h-4 w-4" />
        </FastActivateButton>
      </div>
    </aside>
  );
}
