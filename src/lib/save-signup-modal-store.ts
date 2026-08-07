/**
 * UI-only store for the save quick-signup modal.
 * Kept outside SavedTrainersProvider so closing the modal does not re-render
 * the whole site shell (homepage / explore) before the overlay unmounts.
 */

export interface SaveSignupModalState {
  open: boolean;
  specialistId: string;
  specialistName?: string;
  profilePath: string;
}

const LISTENERS = new Set<() => void>();

const CLOSED: SaveSignupModalState = Object.freeze({
  open: false,
  specialistId: "",
  profilePath: "",
});

/** Blocks heart / card ghost-clicks from reopening the gate after X dismiss. */
const REOPEN_GUARD_MS = 650;
let reopenBlockedUntil = 0;

let state: SaveSignupModalState = CLOSED;

function emit(): void {
  LISTENERS.forEach((listener) => listener());
}

export function subscribeSaveSignupModal(onStoreChange: () => void): () => void {
  LISTENERS.add(onStoreChange);
  return () => {
    LISTENERS.delete(onStoreChange);
  };
}

export function getSaveSignupModalSnapshot(): SaveSignupModalState {
  return state;
}

export function getSaveSignupModalServerSnapshot(): SaveSignupModalState {
  return CLOSED;
}

/** Call on X /backdrop press before hide — covers the rest of the gesture. */
export function blockSaveSignupReopen(ms: number = REOPEN_GUARD_MS): void {
  reopenBlockedUntil = Math.max(reopenBlockedUntil, Date.now() + ms);
}

export function openSaveSignupModal(next: {
  specialistId: string;
  specialistName?: string;
  profilePath: string;
}): void {
  if (Date.now() < reopenBlockedUntil) return;
  state = {
    open: true,
    specialistId: next.specialistId,
    specialistName: next.specialistName,
    profilePath: next.profilePath,
  };
  emit();
}

export function closeSaveSignupModal(): void {
  if (!state.open) return;
  blockSaveSignupReopen();
  state = {
    ...state,
    open: false,
  };
  emit();
}
