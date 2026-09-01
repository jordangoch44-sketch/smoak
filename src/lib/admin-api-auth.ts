import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminAppRole } from "@/types/auth-roles";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Cookie session + user_roles check for admin API routes. */
export async function requireAdminApiAccess(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(roleRow && isAdminAppRole(String(roleRow.role)));
}

/**
 * Authenticated admin + service-role (or user) client for live Control reads.
 * Prefer service role so site_visits / billing are not blocked by RLS.
 */
export async function getAdminDataClient(): Promise<SupabaseClient | null> {
  if (!(await requireAdminApiAccess())) return null;
  return createSupabaseServiceClient() ?? (await createSupabaseServerClient());
}
