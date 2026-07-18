import {
  buildAuthSessionFromSupabaseUser,
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { ensureClientProfileForAuthUser } from "@/lib/auth/ensure-client-profile";
import type { AuthSession } from "@/types/auth";

/**
 * Hydrate marketplace session after magic-link when profile/role rows were missing.
 */
export async function bootstrapClientSessionFromSupabase(): Promise<AuthSession | null> {
  if (!isMarketplaceSupabaseActive()) return null;

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  await ensureClientProfileForAuthUser(supabase, user);
  const session = await buildAuthSessionFromSupabaseUser(supabase, user);
  if (!session || session.role !== "client") return null;

  return session;
}
