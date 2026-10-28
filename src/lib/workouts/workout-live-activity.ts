import { isIosApp } from "@/lib/health/apple-health";
import { exerciseThumbSlug, libraryThumbUrl } from "@/lib/workouts/exercise-media-client";
import {
  activeWorkoutForLiveActivity,
  currentWorkoutPosition,
  emptyClientWorkoutLog,
  recordedWorkoutDuration,
  workoutElapsedMs,
  type ActiveWorkoutLive,
  type ExternalWorkoutClock,
  type WorkoutLivePosition,
} from "@/lib/workouts/client-workout";
import { applyExternalWorkoutClock } from "@/lib/workouts/client-workout-store";
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
    paused: boolean;
    pausedSeconds: number;
    pausedSince: number;
    elapsedSeconds: number;
  }): Promise<{ ok: boolean }>;
  end(): Promise<{ ok: boolean }>;
  takeClockCommand(): Promise<Record<string, unknown>>;
  addListener(
    eventName: "clock",
    listenerFunc: () => void
  ): Promise<{ remove: () => Promise<void> }>;
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
/** The open workout sheet adopts a lock-screen pause before the saved log does. */
let clockApplier: ((command: ExternalWorkoutClock) => void) | null = null;

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

export function registerWorkoutClockApplier(
  apply: (command: ExternalWorkoutClock) => void
): () => void {
  clockApplier = apply;
  return () => {
    if (clockApplier === apply) clockApplier = null;
  };
}

/**
 * Pull a pause or resume made on the lock screen into the open sheet and the saved log.
 * No command is the usual case. The website has no lock screen.
 */
export async function adoptLockScreenClock(userId: string | null): Promise<void> {
  if (!userId || !isIosApp()) return;
  const ready = await ensurePlugin();
  if (!ready || !plugin) return;
  const command = readClockCommand(await plugin.takeClockCommand());
  if (!command) return;
  clockApplier?.(command);
  applyExternalWorkoutClock(userId, command);
}

/** Listen while the app is open so a Dynamic Island pause lands without a relaunch. */
export async function subscribeLockScreenClock(onClock: () => void): Promise<() => void> {
  if (!isIosApp()) return () => {};
  const ready = await ensurePlugin();
  if (!ready || !plugin) return () => {};
  const handle = await plugin.addListener("clock", onClock);
  return () => {
    void handle.remove();
  };
}

function readClockCommand(raw: Record<string, unknown> | null | undefined): ExternalWorkoutClock | null {
  const startedAt = raw?.startedAt;
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) return null;
  const pausedSince = raw?.pausedSince;
  return {
    startedAt,
    paused: raw?.paused === true,
    pausedSeconds: typeof raw?.pausedSeconds === "number" ? raw.pausedSeconds : 0,
    pausedSince: typeof pausedSince === "number" ? pausedSince : null,
  };
}

export function presentWorkoutOnLockScreen(input: {
  dateKey: string;
  startedAt: string | null;
  endedAt: string | null;
  pausedAt?: string | null;
  pausedMs?: number | null;
  exercises: readonly ClientWorkoutExercise[];
}): Promise<void> {
  if (!input.startedAt || input.endedAt || recordedWorkoutDuration(input) === null) {
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
    ...(input.pausedAt ? { pausedAt: input.pausedAt } : {}),
    ...(input.pausedMs ? { pausedMs: input.pausedMs } : {}),
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
  if ((!active || !position) && chipIsRunning) {
    const pastLimit = Object.values(log.days).some(
      (day) => Boolean(day.startedAt) && !day.endedAt && recordedWorkoutDuration(day) === null
    );
    if (!pastLimit) return;
    presented = false;
    chipIsRunning = false;
    return endLiveActivity(true);
  }
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
    const elapsedMs = workoutElapsedMs(active);
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
      paused: Boolean(active.pausedAt),
      pausedSeconds: Math.max(0, (active.pausedMs ?? 0) / 1000),
      pausedSince: active.pausedAt ? Date.parse(active.pausedAt) : 0,
      elapsedSeconds: Math.max(0, Math.floor(elapsedMs / 1000)),
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
  const pause = active.pausedAt ? `p:${active.pausedAt}:${active.pausedMs ?? 0}` : `r:${active.pausedMs ?? 0}`;
  return `${active.startedAt}|${pause}|${exerciseName}|${setLabel}|${positionKey(active)}`;
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
