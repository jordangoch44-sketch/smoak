import { isNativeAppDocument } from "@/lib/native-status-inset";
import {
  BILLING_APP_HANDOFF_PATH,
  type BillingHandoffIntent,
} from "@/lib/billing-app-handoff";

/** Specialist billing on the public site. Safari does not share the app session. */
export const NATIVE_BILLING_URL = "https://smoac.com/specialist-dashboard";

export const NATIVE_BILLING_NOTE =
  "Pro, Pro Plus, and Boosts are purchased on smoac.com. Sign in with the same email if Safari asks.";

export const NATIVE_BILLING_SIGNED_IN_NOTE =
  "Checkout is open in the browser, and you're signed in. Close it when you're done to come back.";

type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeAppDocument()) return true;
  const capacitor = (window as CapacitorWindow).Capacitor;
  return Boolean(capacitor?.isNativePlatform?.());
}

let pendingOpen: Promise<boolean> | null = null;
let lastFinishedAt = 0;

function absoluteHandoffUrl(path: string): string | null {
  if (!path.startsWith(`${BILLING_APP_HANDOFF_PATH}?code=`)) return null;
  if (path.includes("#") || path.includes("\\")) return null;
  try {
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname !== BILLING_APP_HANDOFF_PATH) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function requestHandoffUrl(
  intent: BillingHandoffIntent
): Promise<string | null> {
  try {
    const res = await fetch("/api/billing/app-handoff", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(intent),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { path?: string };
    if (!data.path) return null;
    return absoluteHandoffUrl(data.path);
  } catch {
    return null;
  }
}

async function openBillingBrowser(
  intent?: BillingHandoffIntent
): Promise<boolean> {
  const handoffUrl = intent ? await requestHandoffUrl(intent) : null;
  const url = handoffUrl ?? NATIVE_BILLING_URL;

  let handle: { remove: () => Promise<void> } | null = null;
  try {
    const { Browser } = await import("@capacitor/browser");
    handle = await Browser.addListener("browserFinished", () => {
      void handle?.remove();
      window.location.reload();
    });
    await Browser.open({ url, presentationStyle: "fullscreen" });
  } catch {
    await handle?.remove();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return Boolean(handoffUrl);
}

/**
 * Leave the app WebView already signed in, on the checkout they started.
 * Returns false when Safari will ask them to sign in.
 */
export function openBillingOnWebsite(
  intent?: BillingHandoffIntent
): Promise<boolean> {
  if (!isNativeShell()) return Promise.resolve(false);
  if (pendingOpen) return pendingOpen;
  if (Date.now() - lastFinishedAt < 1500) return Promise.resolve(true);

  pendingOpen = openBillingBrowser(intent).finally(() => {
    pendingOpen = null;
    lastFinishedAt = Date.now();
  });
  return pendingOpen;
}

export function nativeBillingHandoff(): { ok: false; handoff: true; error: string } | null {
  if (!isNativeShell()) return null;
  return { ok: false, handoff: true, error: NATIVE_BILLING_NOTE };
}
