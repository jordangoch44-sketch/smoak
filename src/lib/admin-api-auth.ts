import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminAppRole } from "@/types/auth-roles";

/** Cookie session + user_roles check for admin API routes. */
export async function requireAdminApiAccess(): Promise<boolean> {
  return Boolean(await requireAdminApiUser());
}

export async function requireAdminApiUser(): Promise<{ userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!roleRow || !isAdminAppRole(String(roleRow.role))) return null;
  return { userId: user.id };
}
