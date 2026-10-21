import { isNativeShell } from "@/lib/native-billing";

type ApnsEnvironment = "sandbox" | "production";

let listenPromise: Promise<void> | null = null;
let registered = false;
let activeToken: string | null = null;
let navigateTo: (path: string) => void = () => {};

export function setPushNavigate(navigate: (path: string) => void): void {
  navigateTo = navigate;
}

function readApnsEnvironment(): ApnsEnvironment | null {
  const value = document.documentElement.dataset.apnsEnvironment;
  if (value === "sandbox" || value === "production") return value;
  return null;
}

async function apnsEnvironment(): Promise<ApnsEnvironment | null> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = readApnsEnvironment();
    if (value) return value;
    await new Promise((resolve) => {
      window.setTimeout(resolve, 150);
    });
  }
  return null;
}

function pathFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const direct = record.path;
  if (typeof direct === "string") return safePath(direct);
  return null;
}

function safePath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

async function saveDevicePushToken(
  token: string,
  environment: ApnsEnvironment
): Promise<void> {
  activeToken = token;
  registered = true;
  try {
    await fetch("/api/push/register", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, environment }),
    });
  } catch (error) {
    console.warn("[SMOAC PUSH] could not save device token", error);
  }
}

export function ensurePushListeners(): Promise<void> {
  if (!isNativeShell()) return Promise.resolve();
  if (!listenPromise) {
    listenPromise = attachPushListeners().catch((error) => {
      listenPromise = null;
      throw error;
    });
  }
  return listenPromise;
}

async function attachPushListeners(): Promise<void> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.addListener("registration", (token) => {
    const value = token.value?.trim();
    if (!value) return;
    void apnsEnvironment().then((environment) => {
      if (!environment) {
        console.warn("[SMOAC PUSH] missing APNs environment from the iOS shell");
        return;
      }
      void saveDevicePushToken(value, environment);
    });
  });
  await PushNotifications.addListener("registrationError", (error) => {
    console.warn("[SMOAC PUSH] registration failed", error.error);
  });
  await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    if (action.actionId !== "tap") return;
    const path = pathFromNotificationData(action.notification?.data);
    if (path) navigateTo(path);
  });
}

/** Register when iOS already allows notifications. Returns whether to show the prompt. */
export async function syncPushRegistration(): Promise<
  "prompt" | "granted" | "denied" | "unavailable"
> {
  if (!isNativeShell()) return "unavailable";
  try {
    await ensurePushListeners();
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const status = await PushNotifications.checkPermissions();
    if (status.receive === "granted") {
      await PushNotifications.register();
      registered = true;
      return "granted";
    }
    if (status.receive === "denied") return "denied";
    return "prompt";
  } catch (error) {
    console.warn("[SMOAC PUSH] unavailable", error);
    return "unavailable";
  }
}

export async function allowPushRegistration(): Promise<boolean> {
  try {
    await ensurePushListeners();
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const status = await PushNotifications.requestPermissions();
    if (status.receive !== "granted") return false;
    await PushNotifications.register();
    registered = true;
    return true;
  } catch (error) {
    console.warn("[SMOAC PUSH] permission request failed", error);
    return false;
  }
}

export async function stopPushForSignOut(): Promise<void> {
  if (!registered && !activeToken) return;
  const token = activeToken;
  activeToken = null;
  registered = false;
  if (token) {
    try {
      await fetch("/api/push/register", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch {
      // The next sign-in reassigns the token.
    }
  }
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.unregister();
  } catch {
    // The plugin is only present in the iOS shell.
  }
}
