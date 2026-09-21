import type { ReactNode } from "react";
import {
  BookmarkIcon,
  ChartIcon,
  CheckIcon,
  LockIcon,
  MailIcon,
  MessageBubbleIcon,
  UsersIcon,
} from "@/components/ui/icons";

interface SpecialistPendingOverviewProps {
  submittedAt?: string | null;
}

const LOCKED_METRICS: {
  id: string;
  label: string;
  icon: ReactNode;
}[] = [
  {
    id: "views",
    label: "Profile Views",
    icon: <UsersIcon className="specialist-pending-overview__metric-icon" />,
  },
  {
    id: "inquiries",
    label: "Inquiries",
    icon: (
      <MessageBubbleIcon className="specialist-pending-overview__metric-icon" />
    ),
  },
  {
    id: "saves",
    label: "Saves",
    icon: <BookmarkIcon className="specialist-pending-overview__metric-icon" />,
  },
  {
    id: "completion",
    label: "Profile Completion",
    icon: <ChartIcon className="specialist-pending-overview__metric-icon" />,
  },
];

function formatSubmittedDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PendingClockMark() {
  return (
    <div className="specialist-pending-overview__clock" aria-hidden>
      <span className="specialist-pending-overview__clock-face">
        <svg
          className="specialist-pending-overview__clock-svg"
          viewBox="0 0 48 48"
          fill="none"
        >
          <circle cx="24" cy="24" r="1.7" fill="#fff" />
          <path
            d="M24 13.5V24l8 4.2"
            stroke="#fff"
            strokeWidth="2.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

/** Waiting-for-approval Overview — status timeline plus locked analytics. */
export function SpecialistPendingOverview({
  submittedAt,
}: SpecialistPendingOverviewProps) {
  const submittedLabel = formatSubmittedDate(submittedAt);

  return (
    <section
      className="specialist-pending-overview"
      aria-labelledby="specialist-pending-overview-title"
    >
      <header className="specialist-pending-overview__header">
        <h1
          id="specialist-pending-overview-title"
          className="specialist-pending-overview__title"
        >
          Overview
        </h1>
        <p className="specialist-pending-overview__lede">
          Your performance at a glance
        </p>
      </header>

      <div
        className="specialist-pending-overview__review"
        role="status"
        aria-labelledby="specialist-pending-review-title"
      >
        <PendingClockMark />
        <h2
          id="specialist-pending-review-title"
          className="specialist-pending-overview__review-title"
        >
          Profile Under Review
        </h2>
        <p className="specialist-pending-overview__review-copy">
          Your dashboard unlocks after your profile is approved.
        </p>

        <ol className="specialist-pending-overview__steps">
          <li className="specialist-pending-overview__step specialist-pending-overview__step--complete">
            <span className="specialist-pending-overview__dot" aria-hidden>
              <CheckIcon className="specialist-pending-overview__check" />
            </span>
            <span className="specialist-pending-overview__step-label">
              Submitted
            </span>
            {submittedLabel ? (
              <time
                className="specialist-pending-overview__step-meta"
                dateTime={submittedAt ?? undefined}
              >
                {submittedLabel}
              </time>
            ) : (
              <span className="specialist-pending-overview__step-meta">
                Received
              </span>
            )}
          </li>
          <li className="specialist-pending-overview__step specialist-pending-overview__step--current">
            <span className="specialist-pending-overview__dot" aria-hidden />
            <span className="specialist-pending-overview__step-label">
              Review
            </span>
            <span className="specialist-pending-overview__step-meta specialist-pending-overview__step-meta--live">
              in progress
            </span>
          </li>
          <li className="specialist-pending-overview__step specialist-pending-overview__step--upcoming">
            <span className="specialist-pending-overview__dot" aria-hidden />
            <span className="specialist-pending-overview__step-label">
              Approved
            </span>
          </li>
        </ol>

        <p className="specialist-pending-overview__notify">
          <MailIcon className="specialist-pending-overview__notify-icon" />
          <span>We’ll notify you as soon as your profile is approved.</span>
        </p>
      </div>

      <ul className="specialist-pending-overview__metrics">
        {LOCKED_METRICS.map((metric) => (
          <li key={metric.id} className="specialist-pending-overview__metric">
            <span className="specialist-pending-overview__metric-lead" aria-hidden>
              {metric.icon}
              <LockIcon className="specialist-pending-overview__metric-lock" />
            </span>
            <p className="specialist-pending-overview__metric-label">
              {metric.label}
            </p>
            <p className="specialist-pending-overview__metric-value">N/A</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
