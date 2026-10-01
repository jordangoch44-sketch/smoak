"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { SearchIcon } from "@/components/ui/icons";
import {
  WORKOUT_EXERCISE_LIBRARY,
  type ExerciseMuscle,
} from "@/data/workout-exercise-library";
import type { ExerciseSetMemory } from "@/lib/workouts/client-workout";

function muscleLabel(muscle: ExerciseMuscle): string {
  if (muscle === "rear-delts") return "Rear delts";
  return muscle.charAt(0).toUpperCase() + muscle.slice(1);
}

/** Full-page exercise search. Opens from Add exercise. */
export function ExercisePickerSheet({
  prior,
  onClose,
  onPick,
}: {
  prior: readonly ExerciseSetMemory[];
  onClose: () => void;
  onPick: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const needle = query.trim().toLowerCase();

  const catalog = useMemo(() => {
    const byName = new Map<string, { name: string; muscle?: string }>();
    for (const item of prior) {
      const name = item.name.trim();
      const key = name.toLowerCase();
      if (!name || byName.has(key)) continue;
      byName.set(key, { name });
    }
    for (const item of WORKOUT_EXERCISE_LIBRARY) {
      const key = item.name.toLowerCase();
      const muscle = muscleLabel(item.muscle);
      const existing = byName.get(key);
      if (existing) existing.muscle = muscle;
      else byName.set(key, { name: item.name, muscle });
    }
    return [...byName.values()];
  }, [prior]);

  const results = needle
    ? catalog.filter((item) => item.name.toLowerCase().includes(needle))
    : catalog;

  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== searchRef.current) active.blur();
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="exercise-picker" role="dialog" aria-modal="true" aria-labelledby="exercise-picker-title">
      <div className="exercise-picker__top">
        <div className="exercise-picker__bar">
          <FastActivateButton className="exercise-picker__cancel" onActivate={onClose}>
            Cancel
          </FastActivateButton>
          <h2 id="exercise-picker-title" className="exercise-picker__title">
            Add exercise
          </h2>
          <FastActivateButton
            className="exercise-picker__create"
            disabled={!query.trim()}
            onActivate={() => onPick(query.trim())}
          >
            Create
          </FastActivateButton>
        </div>
        <label className="exercise-picker__search">
          <SearchIcon className="exercise-picker__search-icon" />
          <input
            ref={searchRef}
            className="exercise-picker__input"
            value={query}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            enterKeyHint="search"
            placeholder="Search exercise"
            aria-label="Search exercise"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div className="exercise-picker__list">
        {needle ? null : <p className="exercise-picker__label">Exercises</p>}
        {results.map((item) => (
          <FastActivateButton
            key={item.name}
            className="exercise-picker__row"
            onActivate={() => onPick(item.name)}
          >
            <span className="exercise-picker__name">{item.name}</span>
            {item.muscle ? <span className="exercise-picker__muscle">{item.muscle}</span> : null}
          </FastActivateButton>
        ))}
        {needle && results.length === 0 ? (
          <p className="exercise-picker__empty">No matches. Create adds “{query.trim()}”.</p>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
