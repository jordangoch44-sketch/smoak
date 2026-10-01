"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

/** Browser Supabase client — returns null when env vars are unset (local mock mode). */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  const config = getSupabasePublicConfig();
  if (!config) return null;

  if (!browserClient) {
    browserClient = createBrowserClient(config.url, config.anonKey, {
      auth: {
        /* Safari (especially links opened from Mail) can orphan a Web Lock.
         * getUser() then never settles, and /profile stays on
         * "Loading your profile". Run auth without that lock. */
        lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) =>
          fn(),
      },
    });
  }

  return browserClient;
}
