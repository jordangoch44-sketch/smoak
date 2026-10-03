"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import {
  equipmentLabel,
  EXERCISE_EQUIPMENT_OPTIONS,
  EXERCISE_MUSCLE_OPTIONS,
  muscleLabel,
  type ExerciseEquipment,
  type ExerciseMuscle,
} from "@/lib/workouts/exercise-catalog";
import {
  CUSTOM_EXERCISE_TYPES,
  exerciseTypeLabel,
  readExercisePhoto,
  type CustomExercise,
  type CustomExerciseType,
} from "@/lib/workouts/custom-exercises";

type CreateView = "form" | "equipment" | "muscle" | "other" | "type";

const VIEW_TITLE: Record<Exclude<CreateView, "form">, string> = {
  equipment: "Equipment",
  muscle: "Primary muscle",
  other: "Other muscles",
  type: "Exercise type",
};

/** Collects a client-made exercise. Only the name is required. */
export function CreateExerciseSheet({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string;
  onClose: () => void;
  onSave: (exercise: CustomExercise) => void;
}) {
  const [view, setView] = useState<CreateView>("form");
  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [equipment, setEquipment] = useState<ExerciseEquipment | undefined>();
  const [muscle, setMuscle] = useState<ExerciseMuscle | undefined>();
  const [otherMuscles, setOtherMuscles] = useState<ExerciseMuscle[]>([]);
  const [exerciseType, setExerciseType] = useState<CustomExerciseType | undefined>();
  const [readingPhoto, setReadingPhoto] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const trimmed = name.trim();

  useEffect(() => {
    if (view !== "form") return;
    const frame = window.requestAnimationFrame(() => nameRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  function save() {
    if (!trimmed) return;
    onSave({
      name: trimmed,
      ...(imageUrl ? { imageUrl } : {}),
      ...(equipment ? { equipment } : {}),
      ...(muscle ? { muscle } : {}),
      ...(otherMuscles.length ? { otherMuscles } : {}),
      ...(exerciseType ? { exerciseType } : {}),
    });
  }

  function toggleOther(next: ExerciseMuscle) {
    setOtherMuscles((current) =>
      current.includes(next) ? current.filter((item) => item !== next) : [...current, next].slice(0, 4)
    );
  }

  const otherLabel =
    otherMuscles.length > 0
      ? otherMuscles.map((item) => muscleLabel(item)).join(", ")
      : "Select (optional)";

  return createPortal(
    <div className="create-exercise" role="dialog" aria-modal="true" aria-labelledby="create-exercise-title">
      <div className="create-exercise__bar">
        <FastActivateButton
          className="create-exercise__back"
          aria-label={view === "form" ? "Back to search" : "Back"}
          onActivate={() => (view === "form" ? onClose() : setView("form"))}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </FastActivateButton>
        <h2 id="create-exercise-title" className="create-exercise__title">
          {view === "form" ? "Create exercise" : VIEW_TITLE[view]}
        </h2>
        {view === "form" ? (
          <FastActivateButton className="create-exercise__save" disabled={!trimmed} onActivate={save}>
            Save
          </FastActivateButton>
        ) : view === "other" ? (
          <FastActivateButton className="create-exercise__save" onActivate={() => setView("form")}>
            Done
          </FastActivateButton>
        ) : (
          <span className="create-exercise__save-spacer" />
        )}
      </div>

      {view === "form" ? (
        <div className="create-exercise__body">
          <div className="create-exercise__photo">
            <FastActivateButton
              className="create-exercise__photo-btn"
              aria-label={imageUrl ? "Change photo" : "Add photo"}
              disabled={readingPhoto}
              onActivate={() => fileRef.current?.click()}
            >
              <ExerciseAvatar
                name=""
                imageUrl={imageUrl}
                logoWhenEmpty
                className="create-exercise__photo-mark"
              />
            </FastActivateButton>
            <input
              ref={fileRef}
              className="create-exercise__file"
              type="file"
              accept="image/*"
              aria-label="Exercise photo"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setReadingPhoto(true);
                void readExercisePhoto(file)
                  .then((url) => {
                    if (url) setImageUrl(url);
                  })
                  .finally(() => setReadingPhoto(false));
              }}
            />
            <FastActivateButton
              className="create-exercise__photo-label"
              onActivate={() => fileRef.current?.click()}
            >
              {readingPhoto ? "Adding photo…" : imageUrl ? "Change photo" : "Add photo"}
            </FastActivateButton>
          </div>

          <label className="create-exercise__name">
            <span>Exercise name</span>
            <input
              ref={nameRef}
              value={name}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              enterKeyHint="done"
              maxLength={80}
              placeholder="Name"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                save();
              }}
            />
          </label>

          <div className="create-exercise__fields">
            <Field label="Equipment" value={equipment ? equipmentLabel(equipment) : "Select"} onOpen={() => setView("equipment")} />
            <Field label="Primary muscle group" value={muscle ? muscleLabel(muscle) : "Select"} onOpen={() => setView("muscle")} />
            <Field label="Other muscles" value={otherLabel} onOpen={() => setView("other")} />
            <Field
              label="Exercise type"
              value={exerciseType ? exerciseTypeLabel(exerciseType) : "Select"}
              onOpen={() => setView("type")}
            />
          </div>
        </div>
      ) : null}

      {view === "equipment" ? (
        <OptionList
          options={EXERCISE_EQUIPMENT_OPTIONS}
          selected={equipment}
          onPick={(id) => {
            setEquipment(id);
            setView("form");
          }}
        />
      ) : null}
      {view === "muscle" ? (
        <OptionList
          options={EXERCISE_MUSCLE_OPTIONS}
          selected={muscle}
          onPick={(id) => {
            setMuscle(id);
            setOtherMuscles((current) => current.filter((item) => item !== id));
            setView("form");
          }}
        />
      ) : null}
      {view === "other" ? (
        <div className="create-exercise__options">
          {EXERCISE_MUSCLE_OPTIONS.filter((option) => option.id !== muscle).map((option) => {
            const on = otherMuscles.includes(option.id);
            return (
              <FastActivateButton
                key={option.id}
                className={on ? "create-exercise__option create-exercise__option--on" : "create-exercise__option"}
                aria-pressed={on}
                onActivate={() => toggleOther(option.id)}
              >
                {option.label}
              </FastActivateButton>
            );
          })}
        </div>
      ) : null}
      {view === "type" ? (
        <OptionList
          options={CUSTOM_EXERCISE_TYPES}
          selected={exerciseType}
          onPick={(id) => {
            setExerciseType(id);
            setView("form");
          }}
        />
      ) : null}
    </div>,
    document.body
  );
}

function Field({ label, value, onOpen }: { label: string; value: string; onOpen: () => void }) {
  const empty = value.startsWith("Select");
  return (
    <FastActivateButton className="create-exercise__field" onActivate={onOpen}>
      <span className="create-exercise__field-copy">
        <span className="create-exercise__field-label">{label}</span>
        <span className={empty ? "create-exercise__field-value" : "create-exercise__field-value create-exercise__field-value--set"}>
          {value}
        </span>
      </span>
      <ChevronRightIcon className="create-exercise__chevron" />
    </FastActivateButton>
  );
}

function OptionList<T extends string>({
  options,
  selected,
  onPick,
}: {
  options: readonly { id: T; label: string }[];
  selected?: T;
  onPick: (id: T) => void;
}) {
  return (
    <div className="create-exercise__options">
      {options.map((option) => (
        <FastActivateButton
          key={option.id}
          className={
            option.id === selected
              ? "create-exercise__option create-exercise__option--on"
              : "create-exercise__option"
          }
          onActivate={() => onPick(option.id)}
        >
          {option.label}
        </FastActivateButton>
      ))}
    </div>
  );
}
