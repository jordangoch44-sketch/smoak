import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/** Server-only admin client — bypasses RLS. Never import from client components. */
export function createSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  const config = getSupabasePublicConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!config || !serviceKey) return null;

  return createClient(config.url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
