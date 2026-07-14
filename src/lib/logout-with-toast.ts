const NAV_DELAY_MS = 80;

/** Defer navigation so the toast can paint above the app chrome */
export function afterLogoutNavigation(navigate: () => void): void {
  if (typeof window === "undefined") {
    navigate();
    return;
  }
  window.setTimeout(navigate, NAV_DELAY_MS);
}
