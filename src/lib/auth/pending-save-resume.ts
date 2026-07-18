/**
 * Deferred pending-save resume after mandatory password setup.
 * Survives magic-link redirect; never stores passwords.
 */
const DEFER_PENDING_SAVE_KEY = "smoac_defer_pending_save";
const PASSWORD_SETUP_DONE_KEY = "smoac_password_setup_done";

export type PendingSaveResumeMode = "immediate" | "after_profile" | "locked";

export interface PendingSaveResumeState {
  mode: PendingSaveResumeMode;
  updatedAt: string;
}

function readState(): PendingSaveResumeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DEFER_PENDING_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSaveResumeState;
    if (
      parsed.mode === "immediate" ||
      parsed.mode === "after_profile" ||
      parsed.mode === "locked"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeState(state: PendingSaveResumeState | null): void {
  if (typeof window === "undefined") return;
  if (!state) {
    window.sessionStorage.removeItem(DEFER_PENDING_SAVE_KEY);
    return;
  }
  window.sessionStorage.setItem(DEFER_PENDING_SAVE_KEY, JSON.stringify(state));
}

/** While password setup card is open — do not auto-apply pending save. */
export function lockPendingSaveUntilPasswordDone(): void {
  writeState({ mode: "locked", updatedAt: new Date().toISOString() });
}

export function markPasswordSetupDoneLocally(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PASSWORD_SETUP_DONE_KEY, "1");
}

export function peekPasswordSetupDoneLocally(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(PASSWORD_SETUP_DONE_KEY) === "1";
}

export function clearPasswordSetupDoneLocally(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PASSWORD_SETUP_DONE_KEY);
}

export function schedulePendingSaveResume(mode: "immediate" | "after_profile"): void {
  writeState({ mode, updatedAt: new Date().toISOString() });
}

export function peekPendingSaveResume(): PendingSaveResumeState | null {
  return readState();
}

export function clearPendingSaveResume(): void {
  writeState(null);
}

export function isPendingSaveLocked(): boolean {
  return readState()?.mode === "locked";
}
