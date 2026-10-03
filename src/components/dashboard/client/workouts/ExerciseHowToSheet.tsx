"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { findLibraryExercise } from "@/lib/workouts/exercise-catalog";
import { loadExerciseGuide, type ExerciseGuide } from "@/lib/workouts/exercise-media-client";

/** Full-screen clip and numbered steps for one exercise. */
export function ExerciseHowToSheet({
  name,
  imageUrl,
  logoWhenEmpty = false,
  onClose,
  actionLabel,
  onAction,
}: {
  name: string;
  imageUrl?: string;
  logoWhenEmpty?: boolean;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const [guide, setGuide] = useState<ExerciseGuide | null>(null);
  const [ready, setReady] = useState(false);
  const library = findLibraryExercise(name);
  const titleId = "exercise-howto-title";

  useEffect(() => {
    setReady(true);
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }, []);

  useEffect(() => {
    if (!library) {
      setGuide(null);
      return;
    }
    let cancelled = false;
    setGuide(null);
    void loadExerciseGuide(name).then((next) => {
      if (!cancelled) setGuide(next);
    });
    return () => {
      cancelled = true;
    };
  }, [library, name]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  const steps = guide?.instructions ?? [];
  if (!ready) return null;

  return createPortal(
    <div className="exercise-howto" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="exercise-howto__bar">
        <FastActivateButton className="exercise-howto__back" aria-label="Back" onActivate={onClose}>
          <ChevronLeftIcon className="h-5 w-5" />
        </FastActivateButton>
        <h2 id={titleId} className="exercise-howto__title">
          {name}
        </h2>
        <span className="exercise-howto__bar-spacer" aria-hidden />
      </div>

      <div className="exercise-howto__scroll">
        <div className="exercise-howto__stage">
          <ExerciseAvatar
            name={name}
            imageUrl={imageUrl}
            logoWhenEmpty={logoWhenEmpty}
            animated
            className="exercise-howto__media"
          />
        </div>

        <div className="exercise-howto__body">
          <h3 className="exercise-howto__name">{name}</h3>
          {library ? (
            guide ? (
              steps.length > 0 ? (
                <ol className="exercise-howto__steps">
                  {steps.map((step, index) => (
                    <li key={`${index}-${step}`}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="exercise-howto__empty">No steps for this exercise yet.</p>
              )
            ) : (
              <p className="exercise-howto__empty">Loading the how-to…</p>
            )
          ) : null}
          {actionLabel && onAction ? (
            <FastActivateButton className="exercise-howto__add" onActivate={onAction}>
              {actionLabel}
            </FastActivateButton>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
