import type { SupabaseClient } from "@supabase/supabase-js";

/** Workout emails are on unless the client turned them off. Null when the row can't be read. */
export async function fetchWorkoutEmailsEnabled(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("client_email_preferences")
    .select("workout_emails")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return data ? Boolean(data.workout_emails) : true;
}

export async function saveWorkoutEmailsEnabled(
  supabase: SupabaseClient,
  userId: string,
  enabled: boolean
): Promise<boolean> {
  const { error } = await supabase.from("client_email_preferences").upsert(
    {
      user_id: userId,
      workout_emails: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.warn("[client-email-preferences] save failed", error.message);
    return false;
  }
  return true;
}
