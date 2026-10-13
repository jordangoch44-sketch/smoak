import type { SupabaseClient } from "@supabase/supabase-js";

const EXERCISE_ID = /^[A-Za-z0-9_-]{1,80}$/;

export type ExerciseFavoritesResult =
  | { ok: true; exerciseIds: string[] }
  | { ok: false; message: string };

export type ExerciseFavoriteMutationResult = { ok: true } | { ok: false; message: string };

function favoriteId(value: string): string | null {
  const id = value.trim();
  return EXERCISE_ID.test(id) ? id : null;
}

/** Exercise ids this account has starred. RLS limits the read to auth.uid(). */
export async function fetchExerciseFavoriteIds(
  supabase: SupabaseClient,
  userId: string
): Promise<ExerciseFavoritesResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authUserId = user?.id?.trim() || userId.trim();
  if (!authUserId) return { ok: false, message: "Sign in to load favorites." };

  const { data, error } = await supabase
    .from("exercise_favorites")
    .select("exercise_id")
    .eq("user_id", authUserId);

  if (error) return { ok: false, message: error.message };

  const exerciseIds = [
    ...new Set(
      (data ?? []).flatMap((row) => {
        const id = favoriteId(String((row as { exercise_id?: string }).exercise_id ?? ""));
        return id ? [id] : [];
      })
    ),
  ];
  return { ok: true, exerciseIds };
}

/** Add or remove one favorite for the signed-in account. */
export async function setExerciseFavorite(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  favorite: boolean
): Promise<ExerciseFavoriteMutationResult> {
  const id = favoriteId(exerciseId);
  if (!id) return { ok: false, message: "Invalid exercise id" };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, message: userError?.message || "Sign in to save favorites." };
  }

  const authUserId = user.id;
  if (userId && userId !== authUserId) {
    console.warn("[exercise-favorites] session userId mismatch; using auth.uid()", {
      sessionUserId: userId,
      authUserId,
    });
  }

  if (!favorite) {
    const { error } = await supabase
      .from("exercise_favorites")
      .delete()
      .eq("user_id", authUserId)
      .eq("exercise_id", id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from("exercise_favorites").insert({
    user_id: authUserId,
    exercise_id: id,
  });
  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) return { ok: true };
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
