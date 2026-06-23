import { clearSavedTrainersActiveSession } from "@/lib/saved-trainers-store";
import { setAuthSession } from "@/lib/auth-session-store";
import { signOutMarketplace } from "@/lib/auth/marketplace-auth";
import { showToast } from "@/lib/toast-store";

/** Clear Supabase + in-memory session and show logout toast */
export async function logoutWithToast(): Promise<void> {
  if (typeof window === "undefined") {
    await signOutMarketplace();
    setAuthSession(null);
    return;
  }
  showToast({ type: "info", message: "Logged out" });
  clearSavedTrainersActiveSession();
  await signOutMarketplace();
  setAuthSession(null);
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
