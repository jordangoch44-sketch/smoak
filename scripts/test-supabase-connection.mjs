/**
 * Supabase connectivity probe — run before Phase 1 auth work.
 * Usage: npm run test:supabase
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

const REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];
const REQUIRED_SERVICE = ["SUPABASE_SERVICE_ROLE_KEY"];

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

function mask(value) {
  if (!value || value.length < 12) return "(empty or too short)";
  return `${value.slice(0, 8)}…${value.slice(-4)} (${value.length} chars)`;
}

/** New platform keys (sb_publishable_*) must not be sent as Bearer JWTs — apikey header only */
function isNewPublishableKey(key) {
  return key.startsWith("sb_publishable_");
}

function isNewSecretKey(key) {
  return key.startsWith("sb_secret_");
}

function assertEnv(names) {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing or empty in .env.local: ${missing.join(", ")}\n` +
        "Paste values from Supabase → Project Settings → API."
    );
  }
}

function assertUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`);
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use http or https");
  }
  if (!parsed.hostname.includes("supabase")) {
    console.warn(
      "  ⚠ URL hostname does not contain 'supabase' — double-check the project URL."
    );
  }
}

async function probeAuthApi(url, anonKey) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.getSession();
  if (error) {
    throw new Error(`Auth API: ${error.message}`);
  }
  return "Auth API reachable (getSession)";
}

async function probeRestWithPublishableKey(url, publishableKey) {
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client
    .from("__smoac_connection_probe__")
    .select("id")
    .limit(1);

  if (!error) {
    return "PostgREST reachable with publishable key (probe table exists)";
  }

  const code = error.code ?? "";
  const msg = error.message ?? "";

  if (
    code === "PGRST205" ||
    code === "42P01" ||
    /could not find the table/i.test(msg) ||
    /schema cache/i.test(msg)
  ) {
    return "PostgREST reachable with publishable key (no app tables yet — expected)";
  }

  if (code === "PGRST301" || /invalid api key/i.test(msg)) {
    throw new Error(`PostgREST publishable probe failed — check publishable key: ${msg}`);
  }

  throw new Error(`PostgREST publishable probe failed: ${code || "unknown"} — ${msg}`);
}

async function probeDatabase(url, serviceRoleKey) {
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin
    .from("__smoac_connection_probe__")
    .select("id")
    .limit(1);

  if (!error) {
    return "Unexpected probe table exists (connection OK)";
  }

  const code = error.code ?? "";
  const msg = error.message ?? "";

  if (
    code === "PGRST205" ||
    code === "42P01" ||
    /could not find the table/i.test(msg) ||
    /schema cache/i.test(msg)
  ) {
    return "Postgres + PostgREST responding (no app tables yet — expected)";
  }

  if (code === "PGRST301" || /invalid api key/i.test(msg)) {
    throw new Error(`Database probe failed — check keys: ${msg}`);
  }

  throw new Error(`Database probe failed: ${code || "unknown"} — ${msg}`);
}

async function probeStorage(url, serviceRoleKey) {
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.storage.listBuckets();
  if (error) {
    throw new Error(`Storage API: ${error.message}`);
  }
  const names = (data ?? []).map((b) => b.name).join(", ") || "(none)";
  return `Storage API reachable — buckets: ${names}`;
}

async function main() {
  console.log("SMOAC Supabase connection test\n");

  loadEnvLocal();
  assertEnv(REQUIRED_PUBLIC);
  assertEnv(REQUIRED_SERVICE);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();

  assertUrl(url);

  const mockMode = !isSupabaseConfigured();
  console.log(`  Configured (mock mode off): ${mockMode ? "NO" : "YES"}`);
  console.log(`  URL: ${url}`);
  console.log(`  Publishable/anon key: ${mask(anonKey)}`);
  console.log(`  Service role key: ${mask(serviceRoleKey)}`);
  if (isNewPublishableKey(anonKey) || isNewSecretKey(serviceRoleKey)) {
    console.log("  Key format: new sb_publishable / sb_secret (supported)");
  }
  console.log("");

  const results = [];

  results.push(await probeAuthApi(url, anonKey));
  results.push(await probeRestWithPublishableKey(url, anonKey));
  results.push(await probeDatabase(url, serviceRoleKey));
  results.push(await probeStorage(url, serviceRoleKey));

  console.log("Results:");
  for (const line of results) {
    console.log(`  ✓ ${line}`);
  }

  console.log("\nAll checks passed. Safe to begin Phase 1 auth implementation.");
}

main().catch((err) => {
  console.error("\n✗ Supabase connection test failed\n");
  console.error(err instanceof Error ? err.message : err);
  console.error(
    "\nFix .env.local (see docs/SUPABASE_SETUP.md), then run: npm run test:supabase"
  );
  process.exit(1);
});
