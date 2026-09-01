/**
 * The mobile profile sheet dismisses on `popstate` (browser Back).
 * Nested overlays (inquiry, etc.) also push/pop history so Back closes
 * the overlay first. Those pops must not also dismiss the profile.
 */

let skipProfileSheetPopCount = 0;

export function skipNextProfileSheetPopstate(): void {
  skipProfileSheetPopCount += 1;
}

export function shouldSkipProfileSheetPopstate(): boolean {
  if (skipProfileSheetPopCount > 0) {
    skipProfileSheetPopCount -= 1;
    return true;
  }
  if (typeof document === "undefined") return false;
  return document.body.classList.contains("inquiry-sheet-open");
}
