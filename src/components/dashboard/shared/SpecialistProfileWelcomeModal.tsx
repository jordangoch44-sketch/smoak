"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { AlertTriangleIcon } from "@/components/ui/icons";
import {
  SMOAC_PROFILE_WELCOME,
  SPECIALIST_PROFILE_WELCOME_LOCK_CLASS,
  type ProfileWelcomeTask,
} from "@/lib/specialist-profile-welcome";
import { DashboardButton } from "./DashboardButton";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalCloseButton,
  DashboardModalScrim,
} from "./DashboardModalScrim";

interface SpecialistProfileWelcomeModalProps {
  open: boolean;
  tasks: ProfileWelcomeTask[];
  onClose: () => void;
  onStartWithPhotos: () => void;
  onSelectTask?: (sectionId: string) => void;
}

/**
 * One-time glass welcome after a specialist is approved and first signs in.
 * Lists unfinished profile sections, then the complimentary Pro trial.
 */
export function SpecialistProfileWelcomeModal({
  open,
  tasks,
  onClose,
  onStartWithPhotos,
  onSelectTask,
}: SpecialistProfileWelcomeModalProps) {
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

  const describedBy =
    tasks.length > 0
      ? "profile-welcome-tasks profile-welcome-trial"
      : "profile-welcome-trial";

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
        aria-describedby={describedBy}
        {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
      >
        <div className="dashboard-modal__glow" aria-hidden />
        <DashboardModalCloseButton onClose={onClose} />
        <div className="dashboard-modal__content">
          <p className="dashboard-modal__eyebrow">
            {SMOAC_PROFILE_WELCOME.eyebrow}
          </p>
          <h2 id="profile-welcome-title" className="dashboard-modal__title">
            {SMOAC_PROFILE_WELCOME.title}
          </h2>
          {tasks.length > 0 ? (
            <ul id="profile-welcome-tasks" className="dashboard-welcome-tasks">
              {tasks.map((task) => (
                <li key={task.id} className="dashboard-welcome-tasks__item">
                  {onSelectTask ? (
                    <FastActivateButton
                      className="dashboard-welcome-tasks__btn"
                      onActivate={() => onSelectTask(task.id)}
                    >
                      <span
                        className="ig-profile-edit__badge ig-profile-edit__badge--incomplete"
                        aria-hidden
                      >
                        <AlertTriangleIcon className="ig-profile-edit__badge-icon" />
                      </span>
                      <span className="dashboard-welcome-tasks__label">
                        {task.label}
                      </span>
                    </FastActivateButton>
                  ) : (
                    <span className="dashboard-welcome-tasks__row">
                      <span
                        className="ig-profile-edit__badge ig-profile-edit__badge--incomplete"
                        aria-hidden
                      >
                        <AlertTriangleIcon className="ig-profile-edit__badge-icon" />
                      </span>
                      <span className="dashboard-welcome-tasks__label">
                        {task.label}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          <p
            id="profile-welcome-trial"
            className="dashboard-modal__trial-headline"
          >
            {SMOAC_PROFILE_WELCOME.trialHeadline}
          </p>
          <DashboardButton
            className="dashboard-pro-upgrade-btn"
            onClick={onStartWithPhotos}
          >
            {SMOAC_PROFILE_WELCOME.primaryCta}
          </DashboardButton>
          <FastActivateButton
            className="dashboard-modal__secondary"
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
