"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardButton } from "@/components/dashboard/shared";
import {
  ChartIcon,
  CheckIcon,
  ChevronRightIcon,
  DumbbellIcon,
  PencilIcon,
  PhotosStackIcon,
  TrophyIcon,
  UserIcon,
} from "@/components/ui/icons";
import {
  activationStatusLabel,
  PROFILE_PREVIEW_HREF,
  type ProfileStrength,
  type ProfileStrengthSectionId,
  type SpecialistActivationPhase,
} from "@/lib/specialist-profile-strength";

const SECTION_ICON: Record<ProfileStrengthSectionId, typeof UserIcon> = {
  basic: UserIcon,
  specialties: DumbbellIcon,
  media: PhotosStackIcon,
  services: ChartIcon,
  bio: PencilIcon,
  credentials: TrophyIcon,
};

interface SpecialistActivationBoardProps {
  phase: Exclude<SpecialistActivationPhase, "published">;
  strength: ProfileStrength;
  rejectionReason?: string;
  canPublish?: boolean;
  publishBusy?: boolean;
  publishError?: string | null;
  onPublish?: () => void;
  requestReviewBusy?: boolean;
  requestReviewError?: string | null;
  onRequestReview?: () => void;
}

function StrengthMeter({
  score,
  label,
  compact = false,
}: {
  score: number;
  label: string;
  compact?: boolean;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setWidth(score));
    return () => window.cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className={compact ? "specialist-strength__meter specialist-strength__meter--compact" : "specialist-strength__meter"}>
      <div className="specialist-strength__meter-row">
        <p className="specialist-strength__meter-label">{label}</p>
        <p className="specialist-strength__meter-value">{score}%</p>
      </div>
      <div
        className="specialist-strength__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label={`Profile strength ${score} percent, ${label}`}
      >
        <span className="specialist-strength__bar-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function welcomeCopy(
  phase: Exclude<SpecialistActivationPhase, "published">,
  canPublish: boolean
): { title: string; subtitle: string } {
  if (phase === "changes-requested") {
    return {
      title: "Your next chapter starts here.",
      subtitle:
        "We need a few updates before this application can move forward. Edit the sections below, then request another review.",
    };
  }
  if (phase === "approved-unpublished") {
    return {
      title: "You’re approved.",
      subtitle: canPublish
        ? "Your profile meets the listing requirements. Publish it when you want clients to find you."
        : "Finish the required profile details. Your listing stays private until it can go live.",
    };
  }
  return {
    title: "Your next chapter starts here.",
    subtitle:
      "We’re reviewing your application. While you wait, build a profile that shows clients what makes you different.",
  };
}

export function SpecialistActivationBoard({
  phase,
  strength,
  rejectionReason,
  canPublish = false,
  publishBusy = false,
  publishError = null,
  onPublish,
  requestReviewBusy = false,
  requestReviewError = null,
  onRequestReview,
}: SpecialistActivationBoardProps) {
  const copy = welcomeCopy(phase, canPublish);
  const reason = rejectionReason?.trim() ?? "";
  const next = strength.recommendation;

  return (
    <section className="specialist-activation" aria-labelledby="specialist-activation-title">
      <header className="specialist-activation__welcome">
        <p
          className={`specialist-activation__status specialist-activation__status--${phase}`}
        >
          {activationStatusLabel(phase)}
        </p>
        <h1 id="specialist-activation-title" className="specialist-activation__title">
          {copy.title}
        </h1>
        <p className="specialist-activation__subtitle">{copy.subtitle}</p>
      </header>

      {phase === "changes-requested" && reason ? (
        <p className="specialist-activation__reason">
          <span className="specialist-activation__reason-label">What to fix</span>
          {reason}
        </p>
      ) : null}

      <StrengthMeter score={strength.score} label={strength.label} />

      <ol className="specialist-activation__list">
        {strength.sections.map((section) => {
          const Icon = SECTION_ICON[section.id];
          return (
            <li key={section.id}>
              <Link
                className={`specialist-activation__item${
                  section.complete ? " specialist-activation__item--done" : ""
                }`}
                href={section.href}
              >
                <span className="specialist-activation__icon" aria-hidden>
                  <Icon className="specialist-activation__icon-svg" />
                </span>
                <span className="specialist-activation__copy">
                  <span className="specialist-activation__item-title">{section.title}</span>
                  <span className="specialist-activation__item-text">{section.description}</span>
                </span>
                {section.complete ? (
                  <CheckIcon className="specialist-activation__check" />
                ) : (
                  <ChevronRightIcon className="specialist-activation__chevron" />
                )}
                <span className="specialist-activation__sr">
                  {section.complete ? "Complete" : "Needs attention"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {next ? (
        <div className="specialist-activation__next">
          <p className="specialist-activation__next-kicker">Next step</p>
          <p className="specialist-activation__next-text">{next.message}</p>
          <DashboardButton href={next.href}>{next.action}</DashboardButton>
        </div>
      ) : null}

      <div className="specialist-activation__actions">
        <DashboardButton href={PROFILE_PREVIEW_HREF} variant="secondary">
          Preview Your Profile
        </DashboardButton>
        <p className="specialist-activation__private">
          This preview is private and is not publicly listed.
        </p>
        {canPublish && onPublish ? (
          <DashboardButton type="button" onClick={() => onPublish()} disabled={publishBusy}>
            {publishBusy ? "Publishing…" : "Publish Profile"}
          </DashboardButton>
        ) : null}
        {publishError ? (
          <p className="specialist-activation__error" role="alert">
            {publishError}
          </p>
        ) : null}
        {phase === "changes-requested" && onRequestReview ? (
          <DashboardButton
            type="button"
            variant="secondary"
            onClick={() => onRequestReview()}
            disabled={requestReviewBusy}
          >
            {requestReviewBusy ? "Sending…" : "Request review"}
          </DashboardButton>
        ) : null}
        {requestReviewError ? (
          <p className="specialist-activation__error" role="alert">
            {requestReviewError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function SpecialistProfileStrengthCard({
  strength,
}: {
  strength: ProfileStrength;
}) {
  const next = strength.recommendation;
  return (
    <section className="specialist-strength-card" aria-label="Profile strength">
      <StrengthMeter score={strength.score} label={`Profile strength · ${strength.label}`} compact />
      {next ? (
        <Link className="specialist-strength-card__link" href={next.href}>
          {next.action}
          <ChevronRightIcon className="specialist-strength-card__chevron" />
        </Link>
      ) : (
        <p className="specialist-strength-card__note">Your profile is in excellent shape.</p>
      )}
    </section>
  );
}
