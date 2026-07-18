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

export function openSaveSignupModal(next: {
  specialistId: string;
  specialistName?: string;
  profilePath: string;
}): void {
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
  console.info("[close-timing] save-modal state→closed", performance.now());
  state = {
    ...state,
    open: false,
  };
  emit();
}
