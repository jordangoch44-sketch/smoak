import type { SupabaseClient, User } from "@supabase/supabase-js";
import { saveInquiryClientProfile } from "@/lib/profiles/profile-service";

function readFirstName(user: User): string {
  const meta = user.user_metadata?.first_name;
  return typeof meta === "string" ? meta.trim() : "";
}

function readAccountSource(user: User): string | undefined {
  const meta = user.user_metadata?.account_source;
  return typeof meta === "string" && meta.trim() ? meta.trim() : undefined;
}

/**
 * Ensure quick-signup / magic-link users have client role + profile before
 * the app reads session state (callback route or client bootstrap).
 */
export async function ensureClientProfileForAuthUser(
  supabase: SupabaseClient,
  user: User
): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) {
    return { ok: false, message: "Missing email on auth user." };
  }

  const metaRole = String(user.user_metadata?.role ?? "").trim();
  if (metaRole && metaRole !== "client") {
    return { ok: true };
  }

  const result = await saveInquiryClientProfile(supabase, user.id, {
    email,
    firstName: readFirstName(user),
    accountSource: readAccountSource(user) ?? "specialist_inquiry",
  });

  return result.ok ? { ok: true } : result;
}
