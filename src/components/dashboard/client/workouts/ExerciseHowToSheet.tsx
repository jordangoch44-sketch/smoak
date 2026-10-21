"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { exerciseLabel, storedExerciseName } from "@/data/exercise-display";
import { isKnownExercise } from "@/lib/workouts/exercise-catalog";
import { exerciseSteps } from "@/lib/workouts/exercise-steps";
import { bundledExerciseMedia, loadExerciseGuide } from "@/lib/workouts/exercise-media-client";

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
  const lookupName = storedExerciseName(name);
  const label = exerciseLabel(name);
  const library = isKnownExercise(lookupName);
  const bundled = library ? bundledExerciseMedia(lookupName) : null;
  const steps = exerciseSteps(lookupName);
  const [gifUrl, setGifUrl] = useState(bundled?.gifUrl ?? "");
  const titleId = "exercise-howto-title";

  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }, []);

  useEffect(() => {
    if (bundled?.gifUrl) {
      setGifUrl(bundled.gifUrl);
      return;
    }
    setGifUrl("");
    if (!library) return;
    let cancelled = false;
    void loadExerciseGuide(lookupName).then((next) => {
      if (!cancelled && next.gifUrl) setGifUrl(next.gifUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [bundled, library, lookupName]);

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

  return createPortal(
    <div className="exercise-howto" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="exercise-howto__bar">
        <FastActivateButton className="exercise-howto__back" aria-label="Back" onActivate={onClose}>
          <ChevronLeftIcon className="h-5 w-5" />
        </FastActivateButton>
        <h2 id={titleId} className="exercise-howto__title">
          {label}
        </h2>
        <span className="exercise-howto__bar-spacer" aria-hidden />
      </div>

      <div className="exercise-howto__scroll">
        <div className="exercise-howto__stage">
          <ExerciseAvatar
            name={lookupName}
            imageUrl={imageUrl}
            gifUrl={gifUrl || undefined}
            logoWhenEmpty={logoWhenEmpty}
            animated
            className="exercise-howto__media"
          />
        </div>

        <div className="exercise-howto__body">
          <h3 className="exercise-howto__name">{label}</h3>
          <ol className="exercise-howto__steps">
            {steps.map((step, index) => (
              <li key={`${index}-${step}`}>{step}</li>
            ))}
          </ol>
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
