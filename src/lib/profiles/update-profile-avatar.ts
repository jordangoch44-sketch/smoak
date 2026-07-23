import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAuthSessionSnapshot,
  setAuthSession,
} from "@/lib/auth-session-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Update in-memory auth session so chrome (bottom nav) reflects a new photo immediately. */
export function patchAuthSessionAvatarUrl(avatarUrl: string | undefined): void {
  const session = getAuthSessionSnapshot();
  if (!session) return;

  const next = avatarUrl?.trim() || undefined;
  setAuthSession({
    ...session,
    avatarUrl: next,
  });
}

/** Persist avatar_url on the signed-in user's profiles row (best-effort). */
export async function updateOwnProfileAvatarUrl(
  avatarUrl: string
): Promise<void> {
  const trimmed = avatarUrl.trim();
  if (!trimmed) return;
  /* Never write data URLs into profiles — they cause statement timeouts on fetch */
  if (trimmed.toLowerCase().startsWith("data:")) {
    patchAuthSessionAvatarUrl(trimmed);
    return;
  }

  patchAuthSessionAvatarUrl(trimmed);

  const session = getAuthSessionSnapshot();
  const supabase = createSupabaseBrowserClient();
  if (!session?.userId || !supabase) return;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: trimmed })
    .eq("user_id", session.userId);

  if (error) {
    console.warn("[profiles] updateOwnProfileAvatarUrl", error.message);
  }
}

/** Upsert avatar during signup / profile writes when a client is available. */
export async function writeProfileAvatarUrl(
  supabase: SupabaseClient,
  userId: string,
  avatarUrl: string
): Promise<void> {
  const trimmed = avatarUrl.trim();
  if (!trimmed || !userId) return;
  if (trimmed.toLowerCase().startsWith("data:")) return;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: trimmed })
    .eq("user_id", userId);

  if (error) {
    console.warn("[profiles] writeProfileAvatarUrl", error.message);
  }
}
