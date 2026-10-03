"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { WORKOUT_EXERCISE_LIBRARY } from "@/data/workout-exercise-library";
import type { ExerciseSetMemory } from "@/lib/workouts/client-workout";
import type { ClientWorkoutExercise } from "@/types/client-workout";

type MenuView = "menu" | "reorder" | "superset" | "replace";

/** Slide-up actions for one exercise. Does not grow the workout sheet. */
export function ExerciseOptionsSheet({
  exercise,
  exercises,
  prior,
  onClose,
  onMove,
  onJoinSuperset,
  onLeaveSuperset,
  onReplace,
  onRemove,
}: {
  exercise: ClientWorkoutExercise;
  exercises: readonly ClientWorkoutExercise[];
  prior: readonly ExerciseSetMemory[];
  onClose: () => void;
  onMove: (direction: -1 | 1) => void;
  onJoinSuperset: (targetId: string) => void;
  onLeaveSuperset: () => void;
  onReplace: (name: string) => void;
  onRemove: () => void;
}) {
  const [view, setView] = useState<MenuView>("menu");
  const [query, setQuery] = useState("");
  const index = exercises.findIndex((item) => item.id === exercise.id);
  const others = exercises.filter((item) => item.id !== exercise.id);
  const inSuperset = Boolean(
    exercise.supersetId &&
      exercises.some(
        (item) => item.id !== exercise.id && item.supersetId === exercise.supersetId
      )
  );
  const title = exercise.name.trim() || "Exercise";

  const replacements = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const item of exercises) {
      if (item.id === exercise.id) continue;
      const name = item.name.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
    for (const item of prior) {
      const name = item.name.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
    for (const item of WORKOUT_EXERCISE_LIBRARY) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(item.name);
    }
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? names.filter((name) => name.toLowerCase().includes(needle))
      : names;
    return matches.slice(0, 8);
  }, [exercise.id, exercises, prior, query]);

  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (view === "menu") onClose();
      else setView("menu");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, view]);

  return createPortal(
    <div className="exercise-menu" role="presentation">
      <button
        type="button"
        className="exercise-menu__backdrop"
        aria-label="Close exercise options"
        onClick={onClose}
      />
      <div
        className="exercise-menu__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-menu-title"
      >
        <div className="exercise-menu__grab" aria-hidden />
        <div className="exercise-menu__heading">
          {view === "menu" ? (
            <span className="exercise-menu__back-spacer" />
          ) : (
            <FastActivateButton
              className="exercise-menu__back"
              aria-label="Back"
              onActivate={() => setView("menu")}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </FastActivateButton>
          )}
          <h2 id="exercise-menu-title" className="exercise-menu__title">
            {view === "reorder"
              ? "Reorder exercise"
              : view === "superset"
                ? "Add to superset"
                : view === "replace"
                  ? "Replace exercise"
                  : title}
          </h2>
          <span className="exercise-menu__back-spacer" />
        </div>

        {view === "menu" ? (
          <div className="exercise-menu__list">
            <FastActivateButton className="exercise-menu__item" onActivate={() => setView("reorder")}>
              Reorder exercise
            </FastActivateButton>
            <FastActivateButton className="exercise-menu__item" onActivate={() => setView("superset")}>
              Add to superset
            </FastActivateButton>
            <FastActivateButton className="exercise-menu__item" onActivate={() => setView("replace")}>
              Replace exercise
            </FastActivateButton>
            <FastActivateButton
              className="exercise-menu__item exercise-menu__item--danger"
              onActivate={onRemove}
            >
              Remove exercise
            </FastActivateButton>
          </div>
        ) : null}

        {view === "reorder" ? (
          <div className="exercise-menu__list">
            {exercises.length < 2 ? (
              <p className="exercise-menu__note">Add another exercise before reordering.</p>
            ) : (
              <>
                <FastActivateButton
                  className="exercise-menu__item"
                  disabled={index <= 0}
                  onActivate={() => onMove(-1)}
                >
                  Move up
                </FastActivateButton>
                <FastActivateButton
                  className="exercise-menu__item"
                  disabled={index < 0 || index >= exercises.length - 1}
                  onActivate={() => onMove(1)}
                >
                  Move down
                </FastActivateButton>
              </>
            )}
          </div>
        ) : null}

        {view === "superset" ? (
          <div className="exercise-menu__list">
            {others.length === 0 ? (
              <p className="exercise-menu__note">Add another exercise to make a superset.</p>
            ) : (
              others.map((item) => (
                <FastActivateButton
                  key={item.id}
                  className="exercise-menu__item"
                  onActivate={() => onJoinSuperset(item.id)}
                >
                  {item.name.trim() || "Exercise"}
                </FastActivateButton>
              ))
            )}
            {inSuperset ? (
              <FastActivateButton
                className="exercise-menu__item exercise-menu__item--danger"
                onActivate={onLeaveSuperset}
              >
                Remove from superset
              </FastActivateButton>
            ) : null}
          </div>
        ) : null}

        {view === "replace" ? (
          <div className="exercise-menu__list">
            <input
              className="exercise-menu__search"
              value={query}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              placeholder="Search exercises"
              aria-label="Replacement exercise"
              onChange={(event) => setQuery(event.target.value)}
            />
            {replacements.length === 0 ? (
              <p className="exercise-menu__note">No matching exercises.</p>
            ) : (
              replacements.map((name) => (
                <FastActivateButton
                  key={name}
                  className="exercise-menu__item"
                  onActivate={() => onReplace(name)}
                >
                  <ExerciseAvatar name={name} className="exercise-menu__mark" />
                  {name}
                </FastActivateButton>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
