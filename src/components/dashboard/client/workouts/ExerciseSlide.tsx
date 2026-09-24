"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { flushSync } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CheckIcon } from "@/components/ui/icons";
import {
  formatSetCount,
  formatSetLogLine,
  parseWorkoutSetCount,
  sanitizeWorkoutCount,
  sanitizeWorkoutExercise,
  sanitizeWorkoutWeight,
} from "@/lib/workouts/client-workout";
import type { ClientWorkoutExercise, ClientWorkoutSetLog } from "@/types/client-workout";

type SlideStep = "name" | "sets" | "set" | "review";

interface SlideModel {
  name: string;
  sets: string;
  reps: string;
  setLogs?: ClientWorkoutSetLog[];
}

interface LiveSlide {
  step: SlideStep;
  nameDraft: string;
  setsDraft: string;
  repsDraft: string;
  weightDraft: string;
  activeSet: number;
  model: SlideModel;
  exercise: ClientWorkoutExercise;
}

export interface ExerciseSlideHandle {
  snapshot: () => ClientWorkoutExercise;
}

function resizeLogs(
  previous: ClientWorkoutSetLog[] | undefined,
  count: number
): ClientWorkoutSetLog[] {
  return Array.from(
    { length: count },
    (_, index) => previous?.[index] ?? { reps: "", weight: "" }
  );
}

function modelFromLive(live: LiveSlide): SlideModel {
  const next: SlideModel = {
    ...live.model,
    setLogs: live.model.setLogs?.map((log) => ({ ...log })),
  };
  if (live.step === "name") return { ...next, name: live.nameDraft };
  if (live.step === "sets") {
    const count = parseWorkoutSetCount(live.setsDraft);
    if (!count) return { ...next, sets: "", setLogs: undefined };
    const resized = resizeLogs(next.setLogs, count);
    const hasDetail = resized.some((log) => log.reps || log.weight);
    return {
      ...next,
      sets: String(count),
      reps: hasDetail ? "" : next.reps,
      setLogs: hasDetail ? resized : undefined,
    };
  }
  if (live.step === "set" && next.setLogs && next.setLogs[live.activeSet]) {
    const logs = next.setLogs.map((log) => ({ ...log }));
    logs[live.activeSet] = {
      reps: sanitizeWorkoutCount(live.repsDraft, 4),
      weight: sanitizeWorkoutWeight(live.weightDraft),
    };
    return { ...next, setLogs: logs, sets: String(logs.length), reps: "" };
  }
  return next;
}

function toSavedExercise(source: ClientWorkoutExercise, model: SlideModel): ClientWorkoutExercise | null {
  return sanitizeWorkoutExercise({
    id: source.id,
    name: model.name,
    sets: model.sets,
    reps: model.reps,
    setLogs: model.setLogs,
    completed: source.completed,
  });
}

export const ExerciseSlide = forwardRef<
  ExerciseSlideHandle,
  {
    exercise: ClientWorkoutExercise;
    editing?: boolean;
    onChange: (
      patch: Partial<Pick<ClientWorkoutExercise, "name" | "sets" | "reps" | "setLogs">>
    ) => void;
    onFinished?: (exercise: ClientWorkoutExercise) => void;
    onDone?: () => void;
    onRemove?: () => void;
    /** Focus the exercise name when this card mounts. */
    autoFocus?: boolean;
  }
>(function ExerciseSlide(
  { exercise, editing = false, onChange, onFinished, onDone, onRemove, autoFocus = false },
  ref
) {
  const [step, setStep] = useState<SlideStep>(editing ? "review" : "name");
  const [nameDraft, setNameDraft] = useState(exercise.name);
  const [setsDraft, setSetsDraft] = useState(exercise.sets);
  const [repsDraft, setRepsDraft] = useState("");
  const [weightDraft, setWeightDraft] = useState("");
  const [activeSet, setActiveSet] = useState(0);
  const [model, setModel] = useState<SlideModel>({
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    setLogs: exercise.setLogs?.map((log) => ({ ...log })),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);
  const liveRef = useRef<LiveSlide>({
    step,
    nameDraft,
    setsDraft,
    repsDraft,
    weightDraft,
    activeSet,
    model,
    exercise,
  });
  liveRef.current = {
    step,
    nameDraft,
    setsDraft,
    repsDraft,
    weightDraft,
    activeSet,
    model,
    exercise,
  };

  useImperativeHandle(
    ref,
    () => ({
      snapshot() {
        const live = liveRef.current;
        const next = modelFromLive(live);
        return (
          toSavedExercise(live.exercise, next) ?? {
            id: live.exercise.id,
            name: "",
            sets: "",
            reps: "",
            completed: live.exercise.completed,
          }
        );
      },
    }),
    []
  );

  useEffect(() => {
    const skipInitialFocus = !mountedRef.current && !autoFocus;
    mountedRef.current = true;
    if (skipInitialFocus || step === "review") return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step, activeSet, autoFocus]);

  function publish(next: SlideModel) {
    setModel(next);
    onChange({
      name: next.name,
      sets: next.sets,
      reps: next.reps,
      setLogs: next.setLogs,
    });
  }

  function focusActiveField() {
    inputRef.current?.focus({ preventScroll: true });
  }

  function finish(next: SlideModel) {
    if (editing) {
      flushSync(() => {
        publish(next);
        setStep("review");
      });
      return;
    }
    const saved = toSavedExercise(exercise, next);
    if (!saved) return;
    flushSync(() => {
      onFinished?.(saved);
    });
  }

  function lockName() {
    const name = nameDraft.trim();
    if (!name) return;
    const next = { ...model, name };
    if (editing) {
      flushSync(() => {
        publish(next);
        setStep("review");
      });
      return;
    }
    flushSync(() => {
      publish(next);
      setStep("sets");
    });
    focusActiveField();
  }

  function lockSets() {
    const count = parseWorkoutSetCount(setsDraft);
    if (!count) {
      finish({ ...model, sets: "", setLogs: undefined, reps: "" });
      return;
    }
    const setLogs = resizeLogs(model.setLogs, count);
    const next = { ...model, sets: String(count), reps: "", setLogs };
    const previousCount = model.setLogs?.length ?? 0;
    if (editing && previousCount >= count) {
      flushSync(() => {
        publish(next);
        setStep("review");
      });
      return;
    }
    const start = editing ? Math.min(previousCount, count - 1) : 0;
    flushSync(() => {
      publish(next);
      setActiveSet(start);
      setRepsDraft(setLogs[start]?.reps ?? "");
      setWeightDraft(setLogs[start]?.weight ?? "");
      setStep("set");
    });
    focusActiveField();
  }

  function lockSet(copyRest = false) {
    const logs = (model.setLogs ?? []).map((log) => ({ ...log }));
    if (logs.length === 0) {
      finish(model);
      return;
    }
    const current = {
      reps: sanitizeWorkoutCount(repsDraft, 4),
      weight: sanitizeWorkoutWeight(weightDraft),
    };
    if (copyRest) {
      for (let index = activeSet; index < logs.length; index += 1) {
        logs[index] = { ...current };
      }
    } else {
      logs[activeSet] = current;
    }
    const next = { ...model, setLogs: logs, sets: String(logs.length), reps: "" };
    const finished = copyRest || editing || activeSet >= logs.length - 1;
    if (!finished) {
      const upcoming = logs[activeSet + 1] ?? { reps: "", weight: "" };
      flushSync(() => {
        publish(next);
        setActiveSet(activeSet + 1);
        setRepsDraft(upcoming.reps);
        setWeightDraft(upcoming.weight);
      });
      focusActiveField();
      return;
    }
    finish(next);
  }

  function onEnter(event: KeyboardEvent<HTMLInputElement>, commit: () => void) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commit();
  }

  const setCount = Number(model.sets);
  const legacyReps = model.setLogs?.length ? "" : model.reps.trim();
  const showSame =
    step === "set" &&
    Boolean(repsDraft.trim() || weightDraft.trim()) &&
    activeSet < (model.setLogs?.length ?? 0) - 1;
  const lockedSets =
    !legacyReps &&
    (step === "set" || step === "review") &&
    Number.isFinite(setCount) &&
    setCount > 0
      ? formatSetCount(setCount)
      : "";
  const lockedLogs =
    step === "review"
      ? (model.setLogs ?? []).map((log, index) => ({ log, index }))
      : step === "set"
        ? (model.setLogs ?? [])
            .map((log, index) => ({ log, index }))
            .filter(({ log, index }) => index < activeSet && Boolean(log.reps || log.weight))
        : [];

  const checkLabel =
    step === "name"
      ? "Lock exercise"
      : step === "sets"
        ? setsDraft.trim()
          ? "Lock sets"
          : "Skip sets"
        : repsDraft.trim() || weightDraft.trim()
          ? `Lock set ${activeSet + 1}`
          : `Skip set ${activeSet + 1}`;

  return (
    <div
      className={
        editing
          ? "client-workouts-ex client-workouts-ex--section client-workouts-ex--editing client-workouts-slide"
          : "client-workouts-ex client-workouts-ex--section client-workouts-slide"
      }
    >
      {editing && onDone ? (
        <FastActivateButton className="client-workouts-bubble__edit" onActivate={onDone}>
          Done
        </FastActivateButton>
      ) : null}

      {step !== "name" ? (
        <div className="client-workouts-slide__locked">
          {step === "review" ? (
            <FastActivateButton
              className="client-workouts-slide__locked-name"
              onActivate={() => {
                flushSync(() => {
                  setNameDraft(model.name);
                  setStep("name");
                });
                focusActiveField();
              }}
            >
              {model.name.trim()}
            </FastActivateButton>
          ) : model.name.trim() ? (
            <p className="client-workouts-slide__locked-name">{model.name.trim()}</p>
          ) : null}
          {step === "review" && legacyReps ? (
            <FastActivateButton
              className="client-workouts-slide__locked-line"
              onActivate={() => {
                flushSync(() => {
                  setSetsDraft(model.sets);
                  setStep("sets");
                });
                focusActiveField();
              }}
            >
              {model.sets.trim() ? `${model.sets.trim()} × ${legacyReps}` : legacyReps}
            </FastActivateButton>
          ) : null}
          {step === "review" && lockedSets ? (
            <FastActivateButton
              className="client-workouts-slide__locked-line"
              onActivate={() => {
                flushSync(() => {
                  setSetsDraft(model.sets);
                  setStep("sets");
                });
                focusActiveField();
              }}
            >
              {lockedSets}
            </FastActivateButton>
          ) : lockedSets ? (
            <p className="client-workouts-slide__locked-line">{lockedSets}</p>
          ) : null}
          {lockedLogs.map(({ log, index }) =>
            step === "review" ? (
              <FastActivateButton
                key={`${exercise.id}-set-${index}`}
                className="client-workouts-slide__locked-line"
                onActivate={() => {
                  flushSync(() => {
                    setActiveSet(index);
                    setRepsDraft(log.reps);
                    setWeightDraft(log.weight);
                    setStep("set");
                  });
                  focusActiveField();
                }}
              >
                {log.reps || log.weight ? formatSetLogLine(index + 1, log) : `Set ${index + 1}`}
              </FastActivateButton>
            ) : (
              <p key={`${exercise.id}-set-${index}`} className="client-workouts-slide__locked-line">
                {formatSetLogLine(index + 1, log)}
              </p>
            )
          )}
        </div>
      ) : null}

      {step === "name" ? (
        <div key="name" className="client-workouts-slide__question">
          <div className="client-workouts-slide__name-row">
            <input
              ref={inputRef}
              className="client-workouts-slide__input"
              value={nameDraft}
              autoComplete="off"
              autoCorrect="off"
              enterKeyHint="next"
              placeholder="Exercise"
              aria-label="Exercise"
              onKeyDown={(event) => onEnter(event, lockName)}
              onChange={(event) => setNameDraft(event.target.value)}
            />
            <FastActivateButton
              className="client-workouts-slide__check"
              aria-label={checkLabel}
              disabled={!nameDraft.trim()}
              onActivate={lockName}
            >
              <CheckIcon className="h-4 w-4" />
            </FastActivateButton>
          </div>
          {editing ? null : (
            <div className="client-workouts-slide__upcoming" aria-hidden>
              <span className="client-workouts-slide__ghost">Sets</span>
              <span className="client-workouts-slide__ghost">reps</span>
              <span className="client-workouts-slide__ghost">#</span>
            </div>
          )}
        </div>
      ) : null}

      {step === "sets" ? (
        <div key="sets" className="client-workouts-slide__question client-workouts-slide__question--sets">
          <input
            ref={inputRef}
            className="client-workouts-slide__input"
            value={setsDraft}
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="next"
            maxLength={2}
            placeholder="Sets"
            aria-label="Sets"
            onKeyDown={(event) => onEnter(event, lockSets)}
            onChange={(event) => {
              const digits = sanitizeWorkoutCount(event.target.value, 2);
              const count = parseWorkoutSetCount(digits);
              setSetsDraft(count ? String(count) : "");
            }}
          />
          <span className="client-workouts-slide__ghost" aria-hidden>
            reps
          </span>
          <span className="client-workouts-slide__ghost" aria-hidden>
            #
          </span>
          <FastActivateButton
            className="client-workouts-slide__check"
            aria-label={checkLabel}
            onActivate={lockSets}
          >
            <CheckIcon className="h-4 w-4" />
          </FastActivateButton>
        </div>
      ) : null}

      {step === "set" ? (
        <div
          key={`set-${activeSet}`}
          className="client-workouts-slide__question client-workouts-slide__question--set"
        >
          <p className="client-workouts-slide__set-label">Set {activeSet + 1}</p>
          <input
            ref={inputRef}
            className="client-workouts-slide__input"
            value={repsDraft}
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="next"
            maxLength={4}
            placeholder="reps"
            aria-label={`Set ${activeSet + 1} reps`}
            onKeyDown={(event) =>
              onEnter(event, () => weightRef.current?.focus({ preventScroll: true }))
            }
            onChange={(event) => setRepsDraft(sanitizeWorkoutCount(event.target.value, 4))}
          />
          <input
            ref={weightRef}
            className="client-workouts-slide__input"
            value={weightDraft}
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="done"
            maxLength={6}
            placeholder="#"
            aria-label={`Set ${activeSet + 1} weight`}
            onKeyDown={(event) => onEnter(event, () => lockSet(false))}
            onChange={(event) => setWeightDraft(sanitizeWorkoutWeight(event.target.value))}
          />
          <FastActivateButton
            className="client-workouts-slide__check"
            aria-label={checkLabel}
            onActivate={() => lockSet(false)}
          >
            <CheckIcon className="h-4 w-4" />
          </FastActivateButton>
          {showSame ? (
            <FastActivateButton
              className="client-workouts-slide__same"
              onActivate={() => lockSet(true)}
            >
              Same for the rest
            </FastActivateButton>
          ) : null}
        </div>
      ) : null}

      {editing && onRemove ? (
        <FastActivateButton className="client-workouts-slide__remove" onActivate={onRemove}>
          Remove
        </FastActivateButton>
      ) : null}
    </div>
  );
});
