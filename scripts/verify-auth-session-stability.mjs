/**
 * Smoke checks for auth/session stabilization helpers.
 * Usage: node --env-file=.env.local scripts/verify-auth-session-stability.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

if (!url || !anon || !siteUrl) {
  console.error("Missing Supabase or SITE_URL env");
  process.exit(1);
}

if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(siteUrl)) {
  console.error("FAIL: SITE_URL must not be localhost/0.0.0.0:", siteUrl);
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase.auth.getSession();
if (error) {
  console.error("FAIL: getSession error", error.message);
  process.exit(1);
}

console.log("SITE_URL:", siteUrl);
console.log("getSession ok, session:", data.session ? "present" : "null");
console.log("PASS: auth client reachable; logout should clear local session via signOut");
