"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  AlertTriangleIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  CrownIcon,
} from "@/components/ui/icons";
import { BRAND_NAME } from "@/lib/brand";
import {
  PROFILE_WELCOME_PHOTOS_TASK_ID,
  SMOAC_PROFILE_WELCOME,
  SPECIALIST_PROFILE_WELCOME_LOCK_CLASS,
  profileWelcomeRemainingLabel,
  profileWelcomeTaskDescription,
  splitProfileWelcomeTasks,
  type ProfileWelcomeTask,
} from "@/lib/specialist-profile-welcome";
import { getInitials } from "@/lib/utils";
import { DashboardButton } from "./DashboardButton";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalCloseButton,
  DashboardModalScrim,
} from "./DashboardModalScrim";

interface SpecialistProfileWelcomeModalProps {
  open: boolean;
  tasks: ProfileWelcomeTask[];
  avatarUrl?: string;
  specialistName?: string;
  showTrial?: boolean;
  onClose: () => void;
  onStartWithPhotos: () => void;
  onSelectTask?: (sectionId: string) => void;
}

function WelcomeAvatar({
  src,
  name,
}: {
  src?: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const photo = src?.trim() && !failed ? src.trim() : "";
  const initials = getInitials(name);

  return (
    <div className="dashboard-welcome-avatar">
      <div className="dashboard-welcome-avatar__ring" aria-hidden>
        {photo ? (
          <img
            src={photo}
            alt=""
            className="dashboard-welcome-avatar__photo"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="dashboard-welcome-avatar__fallback">{initials}</span>
        )}
      </div>
      <span className="dashboard-welcome-avatar__check" aria-hidden>
        <CheckIcon className="dashboard-welcome-avatar__check-icon" />
      </span>
    </div>
  );
}

/**
 * One-time welcome after a specialist is approved and first signs in.
 * Live avatar, one featured next step, leftover sections, then the Pro trial.
 */
export function SpecialistProfileWelcomeModal({
  open,
  tasks,
  avatarUrl,
  specialistName = "Specialist",
  showTrial = true,
  onClose,
  onStartWithPhotos,
  onSelectTask,
}: SpecialistProfileWelcomeModalProps) {
  const { nextStep, remaining } = splitProfileWelcomeTasks(tasks);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add(SPECIALIST_PROFILE_WELCOME_LOCK_CLASS);
    document.documentElement.classList.add(SPECIALIST_PROFILE_WELCOME_LOCK_CLASS);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove(SPECIALIST_PROFILE_WELCOME_LOCK_CLASS);
      document.documentElement.classList.remove(
        SPECIALIST_PROFILE_WELCOME_LOCK_CLASS
      );
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const describedBy = [
    "profile-welcome-subtitle",
    nextStep ? "profile-welcome-next" : null,
    remaining.length > 0 ? "profile-welcome-tasks" : null,
    showTrial ? "profile-welcome-trial" : null,
  ]
    .filter(Boolean)
    .join(" ");

  function activateTask(sectionId: string) {
    if (onSelectTask) {
      onSelectTask(sectionId);
      return;
    }
    onStartWithPhotos();
  }

  const primaryLabel = nextStep?.label ?? SMOAC_PROFILE_WELCOME.primaryCta;

  return createPortal(
    <DashboardModalScrim
      className="dashboard-modal--welcome"
      onDismiss={onClose}
    >
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-welcome-title"
        aria-describedby={describedBy || undefined}
        {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
      >
        <div className="dashboard-modal__glow dashboard-modal__glow--welcome" aria-hidden />
        <DashboardModalCloseButton onClose={onClose} />
        <div className="dashboard-modal__content dashboard-welcome">
          <div className="dashboard-welcome__hero">
            <WelcomeAvatar src={avatarUrl} name={specialistName} />
            <p className="dashboard-welcome-live">
              <span className="dashboard-live-indicator" aria-hidden>
                <span className="dashboard-live-indicator__dot" />
              </span>
              {SMOAC_PROFILE_WELCOME.eyebrow}
            </p>
            <h2 id="profile-welcome-title" className="dashboard-welcome__title">
              {SMOAC_PROFILE_WELCOME.titlePrefix}{" "}
              <span className="smoac-color-text">{BRAND_NAME}</span>
            </h2>
            <p id="profile-welcome-subtitle" className="dashboard-welcome__subtitle">
              {SMOAC_PROFILE_WELCOME.subtitle}
            </p>
          </div>

          {nextStep ? (
            <FastActivateButton
              id="profile-welcome-next"
              className="dashboard-welcome-card dashboard-welcome-card--next"
              onActivate={() => activateTask(nextStep.id)}
            >
              <span className="dashboard-welcome-card__icon" aria-hidden>
                {nextStep.id === PROFILE_WELCOME_PHOTOS_TASK_ID ? (
                  <CameraIcon className="dashboard-welcome-card__glyph" />
                ) : (
                  <AlertTriangleIcon className="dashboard-welcome-card__glyph" />
                )}
              </span>
              <span className="dashboard-welcome-card__copy">
                <span className="dashboard-welcome-card__eyebrow">
                  {SMOAC_PROFILE_WELCOME.nextStepEyebrow}
                </span>
                <span className="dashboard-welcome-card__title">{nextStep.label}</span>
                <span className="dashboard-welcome-card__body">
                  {profileWelcomeTaskDescription(nextStep)}
                </span>
              </span>
              <ChevronRightIcon className="dashboard-welcome-card__chevron" />
            </FastActivateButton>
          ) : null}

          {remaining.length > 0 ? (
            <div id="profile-welcome-tasks" className="dashboard-welcome-remaining">
              <p className="dashboard-welcome-remaining__label">
                {profileWelcomeRemainingLabel(remaining.length)}
              </p>
              <ul className="dashboard-welcome-remaining__list">
                {remaining.map((task) => (
                  <li key={task.id} className="dashboard-welcome-remaining__item">
                    {onSelectTask ? (
                      <FastActivateButton
                        className="dashboard-welcome-remaining__btn"
                        onActivate={() => onSelectTask(task.id)}
                      >
                        <span
                          className="ig-profile-edit__badge ig-profile-edit__badge--incomplete"
                          aria-hidden
                        >
                          <AlertTriangleIcon className="ig-profile-edit__badge-icon" />
                        </span>
                        <span className="dashboard-welcome-remaining__name">
                          {task.label}
                        </span>
                        <ChevronRightIcon className="dashboard-welcome-card__chevron" />
                      </FastActivateButton>
                    ) : (
                      <span className="dashboard-welcome-remaining__row">
                        <span
                          className="ig-profile-edit__badge ig-profile-edit__badge--incomplete"
                          aria-hidden
                        >
                          <AlertTriangleIcon className="ig-profile-edit__badge-icon" />
                        </span>
                        <span className="dashboard-welcome-remaining__name">
                          {task.label}
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {showTrial ? (
            <div
              id="profile-welcome-trial"
              className="dashboard-welcome-card dashboard-welcome-card--trial"
            >
              <span className="dashboard-welcome-card__icon dashboard-welcome-card__icon--trial" aria-hidden>
                <CrownIcon className="dashboard-welcome-card__glyph" />
              </span>
              <span className="dashboard-welcome-card__copy">
                <span className="dashboard-welcome-card__title">
                  {SMOAC_PROFILE_WELCOME.trialHeadline}
                </span>
                <span className="dashboard-welcome-card__body">
                  {SMOAC_PROFILE_WELCOME.trialBody}
                </span>
              </span>
            </div>
          ) : null}

          {nextStep ? (
            <DashboardButton
              className="dashboard-pro-upgrade-btn dashboard-welcome__cta"
              onClick={() => activateTask(nextStep.id)}
            >
              {primaryLabel}
            </DashboardButton>
          ) : null}
          <FastActivateButton
            className="dashboard-modal__secondary dashboard-welcome__later"
            onActivate={onClose}
          >
            {SMOAC_PROFILE_WELCOME.secondaryCta}
          </FastActivateButton>
        </div>
      </div>
    </DashboardModalScrim>,
    document.body
  );
}
