import type { SupabaseClient } from "@supabase/supabase-js";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import { isNativeShell } from "@/lib/native-billing";
import {
  isSharedWorkoutToken,
  sanitizeSharedExercises,
  sharedWorkoutPlan,
  sharedWorkoutText,
  sharedWorkoutUrl,
  type SharedWorkoutPlan,
  type SharedWorkoutPreview,
} from "@/lib/workouts/shared-workout";
import { sanitizeWorkoutTitle } from "@/lib/workouts/client-workout";
import type { ClientWorkoutDay } from "@/types/client-workout";

export type SharedWorkoutTextResult =
  | { ok: true; copied: boolean }
  | { ok: false; message: string };

const readyUrls = new Map<string, string>();
const pendingUrls = new Map<string, Promise<SharedWorkoutTextResult & { url?: string }>>();

function planKey(plan: SharedWorkoutPlan): string {
  return JSON.stringify(plan);
}

function failureMessage(message: string | undefined, fallback: string): string {
  if (!message || /not_allowed|jwt|unauthorized/i.test(message)) {
    return "Sign in to share a workout.";
  }
  if (/invalid_workout/i.test(message)) {
    return "Add an exercise before sharing.";
  }
  return fallback;
}

export async function createSharedWorkout(
  supabase: SupabaseClient,
  plan: SharedWorkoutPlan
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("create_shared_workout", {
    p_title: plan.title,
    p_exercises: plan.exercises,
  });
  const token = typeof data === "string" ? data.trim().toLowerCase() : "";
  if (error || !isSharedWorkoutToken(token)) {
    return {
      ok: false,
      message: failureMessage(error?.message, "Could not share this workout."),
    };
  }
  return { ok: true, token };
}

export async function fetchSharedWorkout(
  supabase: SupabaseClient,
  token: string
): Promise<{ ok: true; preview: SharedWorkoutPreview } | { ok: false; reason: "missing" | "error" }> {
  if (!isSharedWorkoutToken(token)) return { ok: false, reason: "missing" };
  const { data, error } = await supabase.rpc("get_shared_workout", {
    p_token: token.trim().toLowerCase(),
  });
  if (error) return { ok: false, reason: "error" };
  const row = (Array.isArray(data) ? data[0] : data) as
    | { sender_name?: string; title?: string; exercises?: unknown }
    | null
    | undefined;
  if (!row) return { ok: false, reason: "missing" };
  const exercises = sanitizeSharedExercises(row.exercises);
  if (exercises.length === 0) return { ok: false, reason: "missing" };
  const senderName = typeof row.sender_name === "string" ? row.sender_name.trim() : "";
  return {
    ok: true,
    preview: {
      senderName: senderName || "Someone",
      title: sanitizeWorkoutTitle(row.title),
      exercises,
    },
  };
}

/** Start the link while the workout menu is open, so Share can open Messages immediately. */
export function prefetchSharedWorkoutText(day: Pick<ClientWorkoutDay, "title" | "exercises">): void {
  const plan = sharedWorkoutPlan(day);
  if (plan.exercises.length === 0) return;
  const key = planKey(plan);
  if (readyUrls.has(key) || pendingUrls.has(key)) return;
  pendingUrls.set(key, prepareUrl(plan, key));
}

/** Open Messages when the link is already ready. Returns false when the tap still has to wait. */
export function openPreparedWorkoutText(
  day: Pick<ClientWorkoutDay, "title" | "exercises">
): boolean {
  const plan = sharedWorkoutPlan(day);
  const url = readyUrls.get(planKey(plan));
  if (!url) return false;
  deliverText(plan, url);
  return true;
}

export async function textSharedWorkout(
  day: Pick<ClientWorkoutDay, "title" | "exercises">
): Promise<SharedWorkoutTextResult> {
  const plan = sharedWorkoutPlan(day);
  if (plan.exercises.length === 0) {
    return { ok: false, message: "Add an exercise before sharing." };
  }
  const key = planKey(plan);
  const ready = readyUrls.get(key);
  if (ready) {
    return deliverText(plan, ready);
  }
  const pending = pendingUrls.get(key) ?? prepareUrl(plan, key);
  pendingUrls.set(key, pending);
  const result = await pending;
  if (!result.ok || !result.url) return result;
  return deliverText(plan, result.url);
}

async function prepareUrl(
  plan: SharedWorkoutPlan,
  key: string
): Promise<SharedWorkoutTextResult & { url?: string }> {
  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    pendingUrls.delete(key);
    return { ok: false, message: "Sign in to share a workout." };
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    pendingUrls.delete(key);
    return { ok: false, message: "Sign in to share a workout." };
  }
  const created = await createSharedWorkout(supabase, plan);
  pendingUrls.delete(key);
  if (!created.ok) return created;
  const url = sharedWorkoutUrl(created.token);
  readyUrls.set(key, url);
  return { ok: true, copied: false, url };
}

function deliverText(plan: SharedWorkoutPlan, url: string): SharedWorkoutTextResult {
  const body = sharedWorkoutText(plan.title, url);
  if (!canOpenMessages()) {
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (clipboard?.writeText) {
      void clipboard.writeText(body).catch(() => undefined);
      return { ok: true, copied: true };
    }
    return { ok: false, message: "Could not open Messages." };
  }
  window.location.assign(messagesHref(body));
  return { ok: true, copied: false };
}

function canOpenMessages(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isNativeShell()) return true;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function messagesHref(body: string): string {
  const encoded = encodeURIComponent(body);
  const ios =
    isNativeShell() ||
    (typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent));
  return ios ? `sms:&body=${encoded}` : `sms:?body=${encoded}`;
}
