import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * Server-side anon client for public insert-only analytics.
 * Browser talks to `/api/analytics/*` (first-party); this client writes to Supabase.
 */
export function createSupabaseAnonServerClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
