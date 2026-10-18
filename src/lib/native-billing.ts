import { isNativeAppDocument } from "@/lib/native-status-inset";

/** Specialist billing on the public site. Safari does not share the app session. */
export const NATIVE_BILLING_URL = "https://smoac.com/specialist-dashboard";

export const NATIVE_BILLING_NOTE =
  "Pro, Pro Plus, and Boosts are purchased on smoac.com. Sign in with the same email if Safari asks.";

type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeAppDocument()) return true;
  const capacitor = (window as CapacitorWindow).Capacitor;
  return Boolean(capacitor?.isNativePlatform?.());
}

let lastOpenAt = 0;

/** Leave the app WebView. Card checkout stays on the website. */
export async function openBillingOnWebsite(): Promise<void> {
  const now = Date.now();
  if (now - lastOpenAt < 1200) return;
  lastOpenAt = now;

  if (!isNativeShell()) {
    window.location.assign(NATIVE_BILLING_URL);
    return;
  }

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: NATIVE_BILLING_URL });
  } catch {
    window.open(NATIVE_BILLING_URL, "_blank", "noopener,noreferrer");
  }
}

export function nativeBillingHandoff(): { ok: false; handoff: true; error: string } | null {
  if (!isNativeShell()) return null;
  return { ok: false, handoff: true, error: NATIVE_BILLING_NOTE };
}
