import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientWorkoutLogRow } from "@/types/database";
import type { ClientWorkoutLog } from "@/types/client-workout";
import { sanitizeClientWorkoutLog } from "@/lib/workouts/client-workout";

export type ClientWorkoutFetchResult =
  | { ok: true; log: ClientWorkoutLog | null }
  | { ok: false; message: string };

export type ClientWorkoutMutationResult =
  | { ok: true }
  | { ok: false; message: string };

async function authUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id?.trim() || userId.trim() || null;
}

/** Load the signed-in client's workout log. RLS scopes the row to auth.uid(). */
export async function fetchClientWorkoutLog(
  supabase: SupabaseClient,
  userId: string
): Promise<ClientWorkoutFetchResult> {
  const id = await authUserId(supabase, userId);
  if (!id) {
    return { ok: false, message: "Sign in to load workouts." };
  }

  const { data, error } = await supabase
    .from("client_workout_logs")
    .select("log")
    .eq("user_id", id)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  const row = data as Pick<ClientWorkoutLogRow, "log"> | null;
  if (!row) return { ok: true, log: null };
  return { ok: true, log: sanitizeClientWorkoutLog(row.log) };
}

/** Replace the client's workout log. A missing row is created. */
export async function upsertClientWorkoutLog(
  supabase: SupabaseClient,
  userId: string,
  log: ClientWorkoutLog
): Promise<ClientWorkoutMutationResult> {
  const id = await authUserId(supabase, userId);
  if (!id) {
    return { ok: false, message: "Sign in to save workouts." };
  }

  const { error } = await supabase.from("client_workout_logs").upsert(
    {
      user_id: id,
      log: sanitizeClientWorkoutLog(log),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
