"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { isKnownExercise } from "@/lib/workouts/exercise-catalog";
import {
  bundledExerciseMedia,
  cachedExerciseGuide,
  loadExerciseGuide,
  type ExerciseGuide,
} from "@/lib/workouts/exercise-media-client";

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
  const library = isKnownExercise(name);
  const bundled = library ? bundledExerciseMedia(name) : null;
  const [guide, setGuide] = useState<ExerciseGuide | null>(() => {
    if (bundled) {
      return { gifUrl: bundled.gifUrl, overview: null, instructions: [...bundled.instructions] };
    }
    return library ? cachedExerciseGuide(name) : null;
  });
  const titleId = "exercise-howto-title";

  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }, []);

  useEffect(() => {
    if (!library) {
      setGuide(null);
      return;
    }
    if (bundled?.instructions.length) {
      setGuide({ gifUrl: bundled.gifUrl, overview: null, instructions: [...bundled.instructions] });
      return;
    }
    const cached = cachedExerciseGuide(name);
    if (cached) {
      setGuide(cached);
      return;
    }
    let cancelled = false;
    void loadExerciseGuide(name).then((next) => {
      if (!cancelled) setGuide(next);
    });
    return () => {
      cancelled = true;
    };
  }, [bundled, library, name]);

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
            gifUrl={guide?.gifUrl || undefined}
            logoWhenEmpty={logoWhenEmpty}
            animated
            className="exercise-howto__media"
          />
        </div>

        <div className="exercise-howto__body">
          <h3 className="exercise-howto__name">{name}</h3>
          {library && guide ? (
            steps.length > 0 ? (
              <ol className="exercise-howto__steps">
                {steps.map((step, index) => (
                  <li key={`${index}-${step}`}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="exercise-howto__empty">No steps for this exercise yet.</p>
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
