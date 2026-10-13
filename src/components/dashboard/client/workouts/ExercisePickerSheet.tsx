"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CreateExerciseSheet } from "@/components/dashboard/client/workouts/CreateExerciseSheet";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { ExerciseHowToSheet } from "@/components/dashboard/client/workouts/ExerciseHowToSheet";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CheckIcon, SearchIcon } from "@/components/ui/icons";
import { catalogExerciseId, catalogExercises } from "@/data/exercise-db-catalog";
import { exerciseLabel } from "@/data/exercise-display";
import { formatExerciseName, WORKOUT_EXERCISE_LIBRARY } from "@/data/workout-exercise-library";
import {
  equipmentForExercise,
  equipmentLabel,
  EXERCISE_EQUIPMENT_OPTIONS,
  EXERCISE_MUSCLE_OPTIONS,
  isKnownExercise,
  muscleLabel,
  POPULAR_EXERCISE_NAMES,
  type ExerciseEquipment,
  type ExerciseMuscle,
} from "@/lib/workouts/exercise-catalog";
import { rankExerciseSearch } from "@/lib/workouts/exercise-search";
import {
  fetchExerciseFavoriteIds,
  setExerciseFavorite,
} from "@/lib/workouts/exercise-favorites";
import { useAuthSession } from "@/hooks/useAuthSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  loadCustomExercises,
  saveCustomExercise,
  type CustomExercise,
} from "@/lib/workouts/custom-exercises";
import type { ExerciseSetMemory } from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";

interface PickerExercise extends CustomExercise {
  custom?: boolean;
  /** ExerciseDB id, or the custom exercise id. Favorites are stored on this. */
  exerciseId?: string;
}

type PickerTab = "all" | "favorites";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3.4 14.5 8.6l5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 18.8l1.1-5.6L3.8 9.3l5.7-.7L12 3.4z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const [tab, setTab] = useState<PickerTab>("all");
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<string>>(() => new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const { session } = useAuthSession();
  const accountId =
    session && (session.role === "specialist" || session.role === "client") ? session.userId : "";
  const needle = query.trim().toLowerCase();

  const catalog = useMemo(() => {
    const byName = new Map<string, PickerExercise>();
    for (const item of prior) {
      const name = formatExerciseName(item.name);
      const key = name.toLowerCase();
      if (!name || byName.has(key)) continue;
      const exerciseId = catalogExerciseId(name);
      byName.set(key, { name, ...(exerciseId ? { exerciseId } : {}) });
    }
    for (const item of catalogExercises()) {
      const key = item.name.toLowerCase();
      const known = byName.get(key);
      if (known) {
        byName.set(key, {
          ...known,
          exerciseId: known.exerciseId || item.exerciseId,
          muscle: known.muscle ?? item.muscle ?? undefined,
          equipment: known.equipment ?? item.equipment ?? undefined,
        });
        continue;
      }
      byName.set(key, {
        name: item.name,
        exerciseId: item.exerciseId,
        ...(item.muscle ? { muscle: item.muscle } : {}),
        ...(item.equipment ? { equipment: item.equipment } : {}),
      });
    }
    for (const item of WORKOUT_EXERCISE_LIBRARY) {
      const key = item.name.toLowerCase();
      const known = byName.get(key);
      const next: PickerExercise = {
        name: formatExerciseName(item.name),
        exerciseId: item.exerciseId,
        muscle: item.muscle,
        equipment: equipmentForExercise(item.name) ?? known?.equipment,
      };
      if (known) byName.set(key, { ...known, ...next, name: formatExerciseName(item.name) });
      else byName.set(key, next);
    }
    for (const custom of loadCustomExercises()) {
      const key = custom.name.toLowerCase();
      const known = byName.get(key);
      const customOnly = !isKnownExercise(custom.name);
      byName.set(key, {
        ...known,
        ...custom,
        name: formatExerciseName(custom.name),
        exerciseId: customOnly ? custom.id : known?.exerciseId || custom.id,
        muscle: custom.muscle ?? known?.muscle,
        equipment: custom.equipment ?? known?.equipment,
        custom: customOnly,
      });
    }
    return [...byName.values()];
  }, [prior]);

  const filtered = useMemo(() => {
    const narrowed = catalog.filter((item) => {
      if (muscle && item.muscle !== muscle) return false;
      if (equipment && item.equipment !== equipment) return false;
      return true;
    });
    if (!needle) return narrowed;
    return rankExerciseSearch(narrowed, needle);
  }, [catalog, equipment, muscle, needle]);

  const browsing = !needle && !muscle && !equipment;
  const results = useMemo(() => {
    const favored = (item: PickerExercise) =>
      Boolean(item.exerciseId && favoriteIds.has(item.exerciseId));
    const favoritesFirst = (items: readonly PickerExercise[]) => {
      const starred: PickerExercise[] = [];
      const rest: PickerExercise[] = [];
      for (const item of items) {
        if (favored(item)) starred.push(item);
        else rest.push(item);
      }
      return [...starred, ...rest];
    };
    if (tab === "favorites") {
      const pool = browsing ? catalog : filtered;
      return pool.filter(favored);
    }
    if (!browsing) return favoritesFirst(filtered);
    const popular = POPULAR_EXERCISE_NAMES.map((name) =>
      catalog.find((item) => item.name.toLowerCase() === name.toLowerCase())
    ).filter((item): item is PickerExercise => Boolean(item));
    const starred = catalog.filter(favored);
    const starredNames = new Set(starred.map((item) => item.name.toLowerCase()));
    return [
      ...starred,
      ...popular.filter((item) => !starredNames.has(item.name.toLowerCase())),
    ];
  }, [browsing, catalog, favoriteIds, filtered, tab]);

  const sectionLabel =
    tab === "favorites"
      ? null
      : browsing
        ? results.some((item) => item.exerciseId && favoriteIds.has(item.exerciseId))
          ? null
          : "Popular exercises"
        : muscle
          ? muscleLabel(muscle)
          : "Exercises";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!accountId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    void fetchExerciseFavoriteIds(supabase, accountId).then((result) => {
      if (!cancelled && result.ok) setFavoriteIds(new Set(result.exerciseIds));
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

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

  function toggleFavorite(exerciseId: string) {
    if (!accountId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const next = !favoriteIds.has(exerciseId);
    setFavoriteIds((current) => {
      const copy = new Set(current);
      if (next) copy.add(exerciseId);
      else copy.delete(exerciseId);
      return copy;
    });
    void setExerciseFavorite(supabase, accountId, exerciseId, next).then((result) => {
      if (result.ok) return;
      setFavoriteIds((current) => {
        const copy = new Set(current);
        if (next) copy.delete(exerciseId);
        else copy.add(exerciseId);
        return copy;
      });
    });
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
      className={cn("exercise-picker", frame ? "exercise-picker--keyboard" : undefined)}
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
            className={cn(
              "exercise-picker__filter",
              equipment ? "exercise-picker__filter--on" : undefined
            )}
            aria-expanded={openFilter === "equipment"}
            onActivate={() => toggleFilter("equipment")}
          >
            {equipment ? equipmentLabel(equipment) : "All equipment"}
          </FastActivateButton>
          <FastActivateButton
            className={cn(
              "exercise-picker__filter",
              muscle ? "exercise-picker__filter--on" : undefined
            )}
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
        <div className="exercise-picker__tabs" role="tablist" aria-label="Exercise lists">
          <FastActivateButton
            className={cn("exercise-picker__tab", tab === "all" && "exercise-picker__tab--on")}
            role="tab"
            aria-selected={tab === "all"}
            onActivate={() => setTab("all")}
          >
            All Exercises
          </FastActivateButton>
          <FastActivateButton
            className={cn(
              "exercise-picker__tab",
              tab === "favorites" && "exercise-picker__tab--on"
            )}
            role="tab"
            aria-selected={tab === "favorites"}
            onActivate={() => setTab("favorites")}
          >
            Favorites
          </FastActivateButton>
        </div>
      </div>
      <div className="exercise-picker__list">
        {sectionLabel && results.length > 0 ? (
          <p className="exercise-picker__label">{sectionLabel}</p>
        ) : null}
        {results.map((item, index) => {
          const on = selected.some((entry) => entry.name.toLowerCase() === item.name.toLowerCase());
          const favored = Boolean(item.exerciseId && favoriteIds.has(item.exerciseId));
          const label = exerciseLabel(item.name);
          return (
            <div
              key={item.name}
              className={cn("exercise-picker__row", on && "exercise-picker__row--selected")}
            >
              <button
                type="button"
                className="exercise-picker__thumb"
                aria-label={`How to do ${label}`}
                onClick={() => setDetail(item)}
              >
                <span className="exercise-picker__avatar">
                  <ExerciseAvatar
                    name={item.name}
                    imageUrl={item.imageUrl}
                    logoWhenEmpty={item.custom}
                    priority={index < 12}
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
                  <span className="exercise-picker__name">{label}</span>
                  {item.muscle ? (
                    <span className="exercise-picker__muscle">{muscleLabel(item.muscle)}</span>
                  ) : null}
                </span>
              </FastActivateButton>
              {item.exerciseId ? (
                <FastActivateButton
                  className={cn("exercise-picker__star", favored && "exercise-picker__star--on")}
                  aria-pressed={favored}
                  aria-label={
                    favored ? `Remove ${label} from favorites` : `Favorite ${label}`
                  }
                  onActivate={() => toggleFavorite(item.exerciseId!)}
                >
                  <StarIcon filled={favored} />
                </FastActivateButton>
              ) : (
                <span className="exercise-picker__star" aria-hidden />
              )}
              <FastActivateButton
                className="exercise-picker__info"
                aria-label={`About ${label}`}
                onActivate={() => setDetail(item)}
              >
                <InfoIcon />
              </FastActivateButton>
            </div>
          );
        })}
        {results.length === 0 ? (
          <p className="exercise-picker__empty">
            {tab === "favorites"
              ? needle || muscle || equipment
                ? "No favorites match."
                : "No favorites yet."
              : needle
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
