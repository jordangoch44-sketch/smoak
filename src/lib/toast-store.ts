export type ToastType = "success" | "info";

export interface ShowToastOptions {
  type: ToastType;
  message: string;
}

export interface ToastPayload extends ShowToastOptions {
  id: number;
}

export interface ToastSnapshot {
  visible: boolean;
  exiting: boolean;
  toast: ToastPayload | null;
}

const DISMISS_MS = 2500;
const EXIT_MS = 250;

const listeners = new Set<() => void>();

const TOAST_SERVER_SNAPSHOT: ToastSnapshot = {
  visible: false,
  exiting: false,
  toast: null,
};

let snapshot: ToastSnapshot = TOAST_SERVER_SNAPSHOT;

let toastId = 0;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let exitTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  if (exitTimer) {
    clearTimeout(exitTimer);
    exitTimer = null;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function dismiss() {
  if (!snapshot.visible) return;
  snapshot = { ...snapshot, exiting: true };
  emit();
  exitTimer = setTimeout(() => {
    snapshot = TOAST_SERVER_SNAPSHOT;
    emit();
  }, EXIT_MS);
}

export function getToastSnapshot(): ToastSnapshot {
  return snapshot;
}

export function getToastServerSnapshot(): ToastSnapshot {
  return TOAST_SERVER_SNAPSHOT;
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Show a single toast — replaces any visible toast; skips duplicate message */
export function showToast(options: ShowToastOptions): void {
  if (
    snapshot.visible &&
    !snapshot.exiting &&
    snapshot.toast?.message === options.message &&
    snapshot.toast?.type === options.type
  ) {
    return;
  }

  clearTimers();
  toastId += 1;
  snapshot = {
    visible: true,
    exiting: false,
    toast: { ...options, id: toastId },
  };
  emit();

  dismissTimer = setTimeout(dismiss, DISMISS_MS);
}

export const TOAST_DISMISS_MS = DISMISS_MS;
export const TOAST_EXIT_MS = EXIT_MS;
