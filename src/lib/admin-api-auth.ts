import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminAppRole } from "@/types/auth-roles";

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
