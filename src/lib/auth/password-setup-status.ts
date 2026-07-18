import type { SupabaseClient } from "@supabase/supabase-js";
import type { PasswordSetupStatus } from "@/lib/auth/account-setup";

function isMissingPasswordSetupColumn(message: string): boolean {
  return /password_setup_status|42703|column.*does not exist|PGRST204/i.test(
    message
  );
}

/** Best-effort — ignores missing migration column. */
export async function updatePasswordSetupStatus(
  supabase: SupabaseClient,
  userId: string,
  status: PasswordSetupStatus
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ password_setup_status: status })
    .eq("user_id", userId);

  if (error && !isMissingPasswordSetupColumn(error.message)) {
    console.error("[auth] updatePasswordSetupStatus", error.message);
  }
}
