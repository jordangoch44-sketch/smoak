/** Shown once after a workout is finished. A new workout gets a different line. */
const FINISH_PHRASES = [
  "Great job!",
  "Way to go!",
  "Superstar",
  "Excellent!",
  "Superb",
] as const;

const STORAGE_KEY = "smoac.workout-finish-phrase";
let memoryLast = -1;

function lastPhraseIndex(): number {
  if (typeof window !== "undefined") {
    try {
      const parsed = Number(window.localStorage.getItem(STORAGE_KEY));
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < FINISH_PHRASES.length) return parsed;
    } catch {
      return memoryLast;
    }
  }
  return memoryLast;
}

function rememberPhrase(index: number) {
  memoryLast = index;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(index));
  } catch {
    // Private mode can refuse storage. The line still shows.
  }
}

/** One line for this finish. Skips whatever the last workout used. */
export function nextWorkoutFinishPhrase(): string {
  const count = FINISH_PHRASES.length;
  const last = lastPhraseIndex();
  let index = Math.floor(Math.random() * count);
  if (count > 1 && index === last) index = (index + 1) % count;
  rememberPhrase(index);
  return FINISH_PHRASES[index] ?? "Great job!";
}
