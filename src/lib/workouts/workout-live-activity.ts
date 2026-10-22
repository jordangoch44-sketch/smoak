import { isIosApp } from "@/lib/health/apple-health";
import { exerciseThumbSlug, libraryThumbUrl } from "@/lib/workouts/exercise-media-client";
import {
  activeWorkoutForLiveActivity,
  currentWorkoutPosition,
  emptyClientWorkoutLog,
  type ActiveWorkoutLive,
  type WorkoutLivePosition,
} from "@/lib/workouts/client-workout";
import type { ClientWorkoutExercise, ClientWorkoutLog } from "@/types/client-workout";

interface WorkoutLiveBridge {
  start(options: {
    exerciseName: string;
    setLabel: string;
    setNumber: number;
    setCount: number;
    weightLabel: string;
    repsLabel: string;
    setsLabel: string;
    progress: number;
    imageUrl: string;
    thumbSlug: string;
    startedAt: number;
  }): Promise<{ ok: boolean }>;
  end(): Promise<{ ok: boolean }>;
}

let plugin: WorkoutLiveBridge | null = null;
let loading: Promise<boolean> | null = null;
let lastKey = "";
let inflightKey = "";
let generation = 0;
/** The open workout sheet is showing a running duration chip. */
let chipIsRunning = false;
/** True only while that sheet wants the island up. Closing it must not leave 18:00:00 behind. */
let presented = false;

/** The plugin proxy is thenable. Returning it from an async function makes Capacitor call `.then()`. */
function ensurePlugin(): Promise<boolean> {
  if (plugin) return Promise.resolve(true);
  if (!isIosApp()) return Promise.resolve(false);
  if (!loading) {
    loading = import("@capacitor/core")
      .then(({ Capacitor, registerPlugin }) => {
        if (!Capacitor.isPluginAvailable("WorkoutLiveActivity")) return false;
        plugin = registerPlugin<WorkoutLiveBridge>("WorkoutLiveActivity");
        return true;
      })
      .catch(() => false)
      .then((ready) => {
        if (!ready) loading = null;
        return ready;
      });
  }
  return loading;
}

/**
 * The duration chip is the source of truth while that sheet is open.
 * The saved log can lag behind it, and that was ending the lock screen card.
 * Closing the sheet takes the island down, and a later log sync must not put it back.
 */
export function dismissWorkoutLiveActivity(): Promise<void> {
  presented = false;
  chipIsRunning = false;
  return endLiveActivity(true);
}

export function presentWorkoutOnLockScreen(input: {
  dateKey: string;
  startedAt: string | null;
  endedAt: string | null;
  exercises: readonly ClientWorkoutExercise[];
}): Promise<void> {
  if (!input.startedAt || input.endedAt) {
    return dismissWorkoutLiveActivity();
  }
  presented = true;
  chipIsRunning = true;
  const named = input.exercises.some((exercise) => exercise.name.trim());
  const exercises = named
    ? input.exercises.map((exercise) => ({ ...exercise }))
    : [
        {
          id: "live-start",
          name: "Workout",
          sets: "1",
          reps: "",
        },
      ];
  const log = emptyClientWorkoutLog();
  log.days[input.dateKey] = {
    date: input.dateKey,
    title: "",
    exercises,
    startedAt: input.startedAt,
  };
  return syncWorkoutLiveActivity(log);
}

/**
 * Push the in-progress workout to the iPhone lock screen. A no-op on the website.
 * `force` asks again even when the workout has not changed, so a card iOS dismissed comes back.
 */
export async function syncWorkoutLiveActivity(
  log: ClientWorkoutLog,
  options?: { force?: boolean }
): Promise<void> {
  if (!isIosApp()) return;
  if (!presented) {
    return endLiveActivity(options?.force === true);
  }
  const active = activeWorkoutForLiveActivity(log);
  const position = active ? currentWorkoutPosition(active.exercises) : null;
  const key = liveKey(active, position?.exerciseName ?? "", position?.setLabel ?? "");
  if ((!active || !position) && chipIsRunning) return;
  if (key === inflightKey) return;
  if (!options?.force && key === lastKey) return;
  const ticket = ++generation;
  inflightKey = key;
  try {
    const ready = await ensurePlugin();
    if (ticket !== generation || !ready || !plugin) return;
    if (!active || !position) {
      if (chipIsRunning) return;
      await plugin.end();
      if (ticket !== generation) return;
      lastKey = "idle";
      return;
    }
    const startedAt = Date.parse(active.startedAt);
    if (!Number.isFinite(startedAt)) {
      if (lastKey === "idle") return;
      await plugin.end();
      if (ticket !== generation) return;
      lastKey = "idle";
      return;
    }
    const result = await plugin.start({
      exerciseName: position.exerciseName,
      setLabel: position.setLabel,
      setNumber: position.setNumber,
      setCount: position.setCount,
      weightLabel: position.weightLabel,
      repsLabel: position.repsLabel,
      setsLabel: position.setsLabel,
      progress: position.setCount > 0 ? position.setNumber / position.setCount : 0,
      imageUrl: absoluteExerciseThumb(position),
      thumbSlug: exerciseThumbSlug(position.exerciseName),
      startedAt,
    });
    if (ticket !== generation) {
      if (!presented) await plugin.end();
      return;
    }
    if (result?.ok) {
      lastKey = key;
      return;
    }
    console.warn(
      "[SMOAC live] Lock screen did not start. Turn on Settings → Face ID & Passcode → Live Activities, then reopen the workout."
    );
  } catch (error) {
    console.warn("[SMOAC live] Lock screen sync failed", error);
  } finally {
    if (inflightKey === key) inflightKey = "";
  }
}

async function endLiveActivity(force = false): Promise<void> {
  if (!force && lastKey === "idle" && inflightKey === "") return;
  const ticket = ++generation;
  const key = "idle";
  inflightKey = key;
  try {
    const ready = await ensurePlugin();
    if (ticket !== generation || !ready || !plugin) return;
    await plugin.end();
    if (ticket !== generation) return;
    lastKey = "idle";
  } catch (error) {
    console.warn("[SMOAC live] Lock screen did not end", error);
  } finally {
    if (inflightKey === key) inflightKey = "";
  }
}

function liveKey(
  active: ActiveWorkoutLive | null,
  exerciseName: string,
  setLabel: string
): string {
  if (!active) return "idle";
  return `${active.startedAt}|${exerciseName}|${setLabel}|${positionKey(active)}`;
}

function positionKey(active: ActiveWorkoutLive): string {
  const position = currentWorkoutPosition(active.exercises);
  if (!position) return "";
  return `${position.weightLabel}|${position.repsLabel}|${absoluteExerciseThumb(position)}`;
}

function absoluteExerciseThumb(position: WorkoutLivePosition): string {
  const raw = position.imageUrl || libraryThumbUrl(position.exerciseName);
  if (!raw || raw.startsWith("data:")) return raw.startsWith("data:") && raw.length < 180_000 ? raw : "";
  if (raw.startsWith("http")) return raw;
  if (typeof window === "undefined" || !raw.startsWith("/")) return "";
  return new URL(raw, window.location.origin).href;
}
