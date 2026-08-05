import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedTrainerRow } from "@/types/database";

export type SavedTrainersFetchResult =
  | { ok: true; specialistIds: string[] }
  | { ok: false; message: string };

export type SavedTrainerMutationResult =
  | { ok: true }
  | { ok: false; message: string };

export type SavedTrainerCountsResult =
  | { ok: true; countsByUserId: Record<string, number> }
  | { ok: false; message: string };

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

/** Load saved specialist ids for the signed-in user (RLS scopes to auth.uid()). */
export async function fetchSavedTrainerIds(
  supabase: SupabaseClient,
  userId: string
): Promise<SavedTrainersFetchResult> {
  const { data, error } = await supabase
    .from("saved_trainers")
    .select("specialist_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, message: error.message };
  }

  const rows = (data ?? []) as Pick<SavedTrainerRow, "specialist_id" | "created_at">[];
  return { ok: true, specialistIds: uniqueIds(rows.map((row) => row.specialist_id)) };
}

export async function insertSavedTrainer(
  supabase: SupabaseClient,
  userId: string,
  specialistId: string
): Promise<SavedTrainerMutationResult> {
  const id = specialistId.trim();
  if (!id) return { ok: false, message: "Invalid specialist id" };

  const { error } = await supabase.from("saved_trainers").insert({
    user_id: userId,
    specialist_id: id,
  });

  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) {
      return { ok: true };
    }
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function deleteSavedTrainer(
  supabase: SupabaseClient,
  userId: string,
  specialistId: string
): Promise<SavedTrainerMutationResult> {
  const id = specialistId.trim();
  if (!id) return { ok: false, message: "Invalid specialist id" };

  const { error } = await supabase
    .from("saved_trainers")
    .delete()
    .eq("user_id", userId)
    .eq("specialist_id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

/** Admin utility: count saved specialists for a set of client user ids. */
export async function fetchSavedTrainerCountsForUsers(
  supabase: SupabaseClient,
  userIds: readonly string[]
): Promise<SavedTrainerCountsResult> {
  const ids = uniqueIds(userIds);
  if (ids.length === 0) {
    return { ok: true, countsByUserId: {} };
  }

  const { data, error } = await supabase
    .from("saved_trainers")
    .select("user_id")
    .in("user_id", ids);

  if (error) {
    return { ok: false, message: error.message };
  }

  const countsByUserId: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ user_id: string }>) {
    countsByUserId[row.user_id] = (countsByUserId[row.user_id] ?? 0) + 1;
  }
  return { ok: true, countsByUserId };
}
