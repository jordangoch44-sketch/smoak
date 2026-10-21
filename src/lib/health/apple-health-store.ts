import {
  APPLE_HEALTH_CONNECTED_KEY,
  APPLE_HEALTH_DISMISS_KEY,
} from "@/lib/dev-storage-keys";
import {
  dedupeAppleHealthWorkouts,
  sanitizeAppleHealthWorkout,
  type AppleHealthWorkout,
} from "@/lib/health/apple-health";

export type AppleHealthStatus = "idle" | "loading" | "ready" | "unavailable" | "error";

export interface AppleHealthSnapshot {
  connected: boolean;
  dismissed: boolean;
  status: AppleHealthStatus;
  workouts: AppleHealthWorkout[];
  error: string | null;
}

interface AppleHealthBridge {
  isAvailable(): Promise<{ available: boolean }>;
  requestAccess(): Promise<{ ok: boolean }>;
  queryWorkouts(options: { start: number; end: number }): Promise<{ workouts?: unknown[] }>;
}

const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;
/** Bump when a stored choice should be forgotten so the prompt can show again. */
const PROMPT_EPOCH = "2";
const PROMPT_EPOCH_KEY = "smoac_apple_health_epoch";

const INITIAL: AppleHealthSnapshot = {
  connected: false,
  dismissed: false,
  status: "idle",
  workouts: [],
  error: null,
};

const listeners = new Set<() => void>();
let snapshot: AppleHealthSnapshot = INITIAL;
let hydrated = false;
let requestSeq = 0;
let bridgePromise: Promise<AppleHealthBridge> | null = null;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function patch(next: Partial<AppleHealthSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  emit();
}

function readFlag(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode can block storage. The choice still applies for this visit.
  }
}

async function loadBridge(): Promise<AppleHealthBridge> {
  if (!bridgePromise) {
    bridgePromise = import("@capacitor/core")
      .then(({ Capacitor, registerPlugin }) => {
        if (!Capacitor.isPluginAvailable("AppleHealth")) {
          throw new Error("Apple Health isn’t in this install of SMOAC yet.");
        }
        return registerPlugin<AppleHealthBridge>("AppleHealth");
      })
      .catch((error: unknown) => {
        bridgePromise = null;
        throw error;
      });
  }
  return bridgePromise;
}

export function subscribeAppleHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAppleHealthSnapshot(): AppleHealthSnapshot {
  ensureClientPrefs();
  return snapshot;
}

export function getAppleHealthServerSnapshot(): AppleHealthSnapshot {
  return INITIAL;
}

/** Read the on-device choice once. Workout samples themselves are not stored here. */
function ensureClientPrefs(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  if (readFlag(PROMPT_EPOCH_KEY) !== PROMPT_EPOCH) {
    try {
      window.localStorage.removeItem(APPLE_HEALTH_CONNECTED_KEY);
      window.localStorage.removeItem(APPLE_HEALTH_DISMISS_KEY);
    } catch {
      // Private mode can block storage. The prompt still shows for this visit.
    }
    writeFlag(PROMPT_EPOCH_KEY, PROMPT_EPOCH);
    snapshot = { ...INITIAL };
    return;
  }
  const connected = readFlag(APPLE_HEALTH_CONNECTED_KEY) === "1";
  const until = Number(readFlag(APPLE_HEALTH_DISMISS_KEY));
  const dismissed = Number.isFinite(until) && until > Date.now();
  if (!connected && !dismissed) return;
  snapshot = { ...snapshot, connected, dismissed };
}

export function dismissAppleHealth(): void {
  writeFlag(APPLE_HEALTH_DISMISS_KEY, String(Date.now() + DISMISS_MS));
  patch({ dismissed: true });
}

function connectError(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (message && message.length < 160) return message;
  return "Couldn’t open Apple Health.";
}

export async function connectAppleHealth(): Promise<void> {
  patch({ status: "loading", error: null });
  try {
    const bridge = await loadBridge();
    const available = await bridge.isAvailable();
    if (!available?.available) {
      patch({
        status: "error",
        connected: false,
        error: "Apple Health isn’t available on this iPhone.",
      });
      return;
    }
    const access = await bridge.requestAccess();
    if (!access?.ok) {
      patch({ status: "error", connected: false, error: "Couldn’t open Apple Health." });
      return;
    }
    writeFlag(APPLE_HEALTH_CONNECTED_KEY, "1");
    try {
      window.localStorage.removeItem(APPLE_HEALTH_DISMISS_KEY);
    } catch {
      // The connected flag is enough for the next visit.
    }
    patch({ connected: true, dismissed: false, status: "loading", error: null });
  } catch (error) {
    patch({ status: "error", connected: false, error: connectError(error) });
  }
}

/** Replace the in-memory list for this range. A newer request wins. */
export async function refreshAppleHealth(startMs: number, endMs: number): Promise<void> {
  if (!snapshot.connected) return;
  const seq = ++requestSeq;
  if (snapshot.workouts.length === 0) patch({ status: "loading", error: null });
  try {
    const bridge = await loadBridge();
    const result = await bridge.queryWorkouts({ start: startMs, end: endMs });
    if (seq !== requestSeq) return;
    const workouts = dedupeAppleHealthWorkouts(
      (result.workouts ?? [])
        .map((item) => sanitizeAppleHealthWorkout(item))
        .filter((item): item is AppleHealthWorkout => item !== null)
    );
    patch({ status: "ready", workouts, error: null });
  } catch {
    if (seq !== requestSeq) return;
    patch({
      status: snapshot.workouts.length > 0 ? "ready" : "error",
      error: snapshot.workouts.length > 0 ? null : "Couldn’t read Apple Health.",
    });
  }
}
