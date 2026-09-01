const NAV_DELAY_MS = 80;

/**
 * After logout, hard-navigate so AuthSessionProvider remounts cleanly.
 * Soft router.push left a stale SPA auth race (late signOut wiping re-login).
 */
export function afterLogoutNavigation(path = "/profile"): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.location.assign(path);
  }, NAV_DELAY_MS);
}
