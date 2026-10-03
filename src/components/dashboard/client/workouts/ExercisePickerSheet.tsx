"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CreateExerciseSheet } from "@/components/dashboard/client/workouts/CreateExerciseSheet";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { ExerciseHowToSheet } from "@/components/dashboard/client/workouts/ExerciseHowToSheet";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CheckIcon, SearchIcon } from "@/components/ui/icons";
import { WORKOUT_EXERCISE_LIBRARY } from "@/data/workout-exercise-library";
import {
  equipmentForExercise,
  equipmentLabel,
  EXERCISE_EQUIPMENT_OPTIONS,
  EXERCISE_MUSCLE_OPTIONS,
  findLibraryExercise,
  muscleLabel,
  POPULAR_EXERCISE_NAMES,
  type ExerciseEquipment,
  type ExerciseMuscle,
} from "@/lib/workouts/exercise-catalog";
import {
  loadCustomExercises,
  saveCustomExercise,
  type CustomExercise,
} from "@/lib/workouts/custom-exercises";
import type { ExerciseSetMemory } from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";

interface PickerExercise extends CustomExercise {
  custom?: boolean;
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="8.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** Full-page exercise search. Opens from Add exercise. */
export function ExercisePickerSheet({
  prior,
  onClose,
  onPick,
}: {
  prior: readonly ExerciseSetMemory[];
  onClose: () => void;
  onPick: (exercises: CustomExercise[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<ExerciseMuscle | null>(null);
  const [equipment, setEquipment] = useState<ExerciseEquipment | null>(null);
  const [openFilter, setOpenFilter] = useState<"muscle" | "equipment" | null>(null);
  const [detail, setDetail] = useState<PickerExercise | null>(null);
  const [selected, setSelected] = useState<PickerExercise[]>([]);
  const [frame, setFrame] = useState<{ top: number; height: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const needle = query.trim().toLowerCase();

  const catalog = useMemo(() => {
    const byName = new Map<string, PickerExercise>();
    for (const item of prior) {
      const name = item.name.trim();
      const key = name.toLowerCase();
      if (!name || byName.has(key)) continue;
      byName.set(key, { name });
    }
    for (const item of WORKOUT_EXERCISE_LIBRARY) {
      const key = item.name.toLowerCase();
      const known = byName.get(key);
      const next: PickerExercise = {
        name: item.name,
        muscle: item.muscle,
        equipment: equipmentForExercise(item.name) ?? undefined,
      };
      if (known) byName.set(key, { ...known, ...next, name: item.name });
      else byName.set(key, next);
    }
    for (const custom of loadCustomExercises()) {
      const key = custom.name.toLowerCase();
      const known = byName.get(key);
      byName.set(key, {
        ...known,
        ...custom,
        name: custom.name,
        muscle: custom.muscle ?? known?.muscle,
        equipment: custom.equipment ?? known?.equipment,
        custom: !findLibraryExercise(custom.name),
      });
    }
    return [...byName.values()];
  }, [prior]);

  const filtered = useMemo(() => {
    return catalog.filter((item) => {
      if (muscle && item.muscle !== muscle) return false;
      if (equipment && item.equipment !== equipment) return false;
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [catalog, equipment, muscle, needle]);

  const browsing = !needle && !muscle && !equipment;
  const results = useMemo(() => {
    if (!browsing) return filtered;
    return POPULAR_EXERCISE_NAMES.map((name) =>
      catalog.find((item) => item.name.toLowerCase() === name.toLowerCase())
    ).filter((item): item is PickerExercise => Boolean(item));
  }, [browsing, catalog, filtered]);

  const sectionLabel = browsing
    ? "Popular exercises"
    : muscle
      ? muscleLabel(muscle)
      : "Exercises";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== searchRef.current) active.blur();
    const frameId = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frameId);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setFrame(covered > 80 ? { top: viewport.offsetTop, height: viewport.height } : null);
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, [mounted]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (detail) {
        setDetail(null);
        return;
      }
      if (creating) {
        setCreating(false);
        return;
      }
      if (openFilter) {
        setOpenFilter(null);
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [creating, detail, onClose, openFilter]);

  function draft(item: PickerExercise): CustomExercise {
    return {
      name: item.name,
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
      ...(item.custom && item.equipment ? { equipment: item.equipment } : {}),
      ...(item.custom && item.muscle ? { muscle: item.muscle } : {}),
      ...(item.custom && item.otherMuscles?.length ? { otherMuscles: item.otherMuscles } : {}),
      ...(item.custom && item.exerciseType ? { exerciseType: item.exerciseType } : {}),
    };
  }

  function toggle(item: PickerExercise) {
    const key = item.name.toLowerCase();
    setSelected((current) =>
      current.some((entry) => entry.name.toLowerCase() === key)
        ? current.filter((entry) => entry.name.toLowerCase() !== key)
        : [...current, item]
    );
  }

  function toggleFilter(next: "muscle" | "equipment") {
    setOpenFilter((current) => (current === next ? null : next));
  }

  if (!mounted) return null;

  return createPortal(
    <>
    <div
      className={cn("exercise-picker", frame && "exercise-picker--keyboard")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-picker-title"
      style={frame ? { top: frame.top, height: frame.height, bottom: "auto" } : undefined}
    >
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
            onActivate={() => {
              searchRef.current?.blur();
              setCreating(true);
            }}
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
        <div className="exercise-picker__filters">
          <FastActivateButton
            className={cn("exercise-picker__filter", equipment && "exercise-picker__filter--on")}
            aria-expanded={openFilter === "equipment"}
            onActivate={() => toggleFilter("equipment")}
          >
            {equipment ? equipmentLabel(equipment) : "All equipment"}
          </FastActivateButton>
          <FastActivateButton
            className={cn("exercise-picker__filter", muscle && "exercise-picker__filter--on")}
            aria-expanded={openFilter === "muscle"}
            onActivate={() => toggleFilter("muscle")}
          >
            {muscle ? muscleLabel(muscle) : "All muscles"}
          </FastActivateButton>
        </div>
        {openFilter === "equipment" ? (
          <div className="exercise-picker__choices" role="group" aria-label="Equipment">
            <FastActivateButton
              className={cn("exercise-picker__choice", !equipment && "exercise-picker__choice--on")}
              onActivate={() => {
                setEquipment(null);
                setOpenFilter(null);
              }}
            >
              All
            </FastActivateButton>
            {EXERCISE_EQUIPMENT_OPTIONS.map((option) => (
              <FastActivateButton
                key={option.id}
                className={cn(
                  "exercise-picker__choice",
                  equipment === option.id && "exercise-picker__choice--on"
                )}
                onActivate={() => {
                  setEquipment(option.id);
                  setOpenFilter(null);
                }}
              >
                {option.label}
              </FastActivateButton>
            ))}
          </div>
        ) : null}
        {openFilter === "muscle" ? (
          <div className="exercise-picker__choices" role="group" aria-label="Muscles">
            <FastActivateButton
              className={cn("exercise-picker__choice", !muscle && "exercise-picker__choice--on")}
              onActivate={() => {
                setMuscle(null);
                setOpenFilter(null);
              }}
            >
              All
            </FastActivateButton>
            {EXERCISE_MUSCLE_OPTIONS.map((option) => (
              <FastActivateButton
                key={option.id}
                className={cn(
                  "exercise-picker__choice",
                  muscle === option.id && "exercise-picker__choice--on"
                )}
                onActivate={() => {
                  setMuscle(option.id);
                  setOpenFilter(null);
                }}
              >
                {option.label}
              </FastActivateButton>
            ))}
          </div>
        ) : null}
      </div>
      <div className="exercise-picker__list">
        {results.length > 0 ? <p className="exercise-picker__label">{sectionLabel}</p> : null}
        {results.map((item) => {
          const on = selected.some((entry) => entry.name.toLowerCase() === item.name.toLowerCase());
          return (
            <div
              key={item.name}
              className={cn("exercise-picker__row", on && "exercise-picker__row--selected")}
            >
              <button
                type="button"
                className="exercise-picker__thumb"
                aria-label={`How to do ${item.name}`}
                onClick={() => setDetail(item)}
              >
                <span className="exercise-picker__avatar">
                  <ExerciseAvatar
                    name={item.name}
                    imageUrl={item.imageUrl}
                    logoWhenEmpty={item.custom}
                    className="exercise-picker__mark"
                  />
                  {on ? (
                    <span className="exercise-picker__check">
                      <CheckIcon className="exercise-picker__check-glyph" />
                    </span>
                  ) : null}
                </span>
              </button>
              <FastActivateButton
                className="exercise-picker__pick"
                aria-pressed={on}
                onActivate={() => toggle(item)}
              >
                <span className="exercise-picker__copy">
                  <span className="exercise-picker__name">{item.name}</span>
                  {item.muscle ? (
                    <span className="exercise-picker__muscle">{muscleLabel(item.muscle)}</span>
                  ) : null}
                </span>
              </FastActivateButton>
              <FastActivateButton
                className="exercise-picker__info"
                aria-label={`About ${item.name}`}
                onActivate={() => setDetail(item)}
              >
                <InfoIcon />
              </FastActivateButton>
            </div>
          );
        })}
        {results.length === 0 ? (
          <p className="exercise-picker__empty">
            {needle
              ? `No matches. Create “${query.trim()}” to add it.`
              : "No exercises match these filters."}
          </p>
        ) : null}
      </div>
      {selected.length > 0 ? (
        <div className="exercise-picker__dock">
          <FastActivateButton className="exercise-picker__dock-button" onActivate={() => onPick(selected.map(draft))}>
            {selected.length === 1 ? "Add 1 exercise" : `Add ${selected.length} exercises`}
          </FastActivateButton>
        </div>
      ) : null}
      {detail ? (
        <ExerciseHowToSheet
          name={detail.name}
          imageUrl={detail.imageUrl}
          logoWhenEmpty={detail.custom}
          onClose={() => setDetail(null)}
          actionLabel="Add exercise"
          onAction={() => onPick([draft(detail)])}
        />
      ) : null}
    </div>
    {creating ? (
      <CreateExerciseSheet
        initialName={query.trim()}
        onClose={() => setCreating(false)}
        onSave={(exercise) => {
          saveCustomExercise(exercise);
          onPick([exercise]);
        }}
      />
    ) : null}
    </>,
    document.body
  );
}
