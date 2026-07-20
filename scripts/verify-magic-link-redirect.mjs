/**
 * Verify magic-link redirect_to uses NEXT_PUBLIC_SITE_URL only
 * (never localhost / 0.0.0.0).
 * Usage: npm run verify:auth
 *        node --env-file=.env.local scripts/verify-magic-link-redirect.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { isBadAuthHost } from "./lan-utils.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

if (!url || !anon || !service || !siteUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, ANON key, SERVICE_ROLE, or SITE_URL");
  process.exit(1);
}

const expectedCallback = `${siteUrl}/auth/callback`;
const emailRedirectTo = `${expectedCallback}?next=${encodeURIComponent("/?inquiry=1")}`;
const testEmail = `magiclink-verify-${Date.now()}@example.com`;

console.log("SITE_URL:", siteUrl);
console.log("emailRedirectTo:", emailRedirectTo);

if (isBadAuthHost(emailRedirectTo) || isBadAuthHost(siteUrl)) {
  console.error("FAIL: SITE_URL / emailRedirectTo contains localhost or 0.0.0.0");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: testEmail,
  options: { redirectTo: emailRedirectTo },
});

if (error) {
  console.error("generateLink failed:", error.message);
  process.exit(1);
}

const actionLink = data?.properties?.action_link ?? "";
const redirectParam = new URL(actionLink).searchParams.get("redirect_to") ?? "";
console.log("action_link:", actionLink);
console.log("redirect_to param:", redirectParam);

if (isBadAuthHost(actionLink) || isBadAuthHost(redirectParam)) {
  console.error("FAIL: generated auth URL contains localhost or 0.0.0.0");
  process.exit(1);
}

if (!redirectParam.startsWith(expectedCallback)) {
  console.error("FAIL: redirect_to missing expected callback", expectedCallback);
  process.exit(1);
}

console.log("PASS: redirectTo =", redirectParam);
