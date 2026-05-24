import { logoutUser } from "@/lib/specialist-saves";
import { showToast } from "@/lib/toast-store";

/** Clear session and show logout toast — pair with afterLogoutNavigation for route changes */
export function logoutWithToast(): void {
  if (typeof window === "undefined") {
    logoutUser();
    return;
  }
  showToast({ type: "info", message: "Logged out" });
  logoutUser();
}

const NAV_DELAY_MS = 80;

/** Defer navigation so the toast can paint above the app chrome */
export function afterLogoutNavigation(navigate: () => void): void {
  if (typeof window === "undefined") {
    navigate();
    return;
  }
  window.setTimeout(navigate, NAV_DELAY_MS);
}
