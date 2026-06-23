/**
 * Verifies profiles + user_roles tables exist (run after applying migration SQL).
 * Usage: npm run test:supabase:tables
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** PostgREST errors that mean the table exists but privileges are missing */
function isTableExistsPrivilegeError(message) {
  const msg = message ?? "";
  return (
    /permission denied for table/i.test(msg) ||
    /42501/.test(msg) ||
    /Grant the required privileges/i.test(msg)
  );
}

/** PostgREST errors that mean the table is missing */
function isTableMissingError(message) {
  const msg = message ?? "";
  return (
    /could not find the table/i.test(msg) ||
    /PGRST205/i.test(msg) ||
    /schema cache/i.test(msg)
  );
}

async function probeTable(name) {
  const { error } = await admin.from(name).select("user_id").limit(1);

  if (!error) {
    console.log(`  ✓ public.${name} exists (readable)`);
    return { exists: true, readable: true };
  }

  if (isTableMissingError(error.message)) {
    throw new Error(`${name}: table not found — apply migration SQL`);
  }

  if (isTableExistsPrivilegeError(error.message)) {
    console.log(
      `  ✓ public.${name} exists (privilege error — table present in schema)`
    );
    return { exists: true, readable: false };
  }

  throw new Error(`${name}: ${error.message}`);
}

async function main() {
  console.log("SMOAC Supabase tables check\n");

  const roles = await probeTable("user_roles");
  const profiles = await probeTable("profiles");
  const saved = await probeTable("saved_trainers");

  console.log("");
  if (!roles.readable || !profiles.readable || !saved.readable) {
    console.warn(
      "  ⚠ Tables exist but service_role cannot SELECT yet.\n" +
        "    Signup from the app uses the authenticated role and should still work.\n" +
        "    For full service_role access, run in SQL Editor:\n\n" +
        "    grant usage on schema public to service_role;\n" +
        "    grant select, insert, update, delete on table public.user_roles to service_role;\n" +
        "    grant select, insert, update, delete on table public.profiles to service_role;\n" +
        "    grant select, insert, delete on table public.saved_trainers to service_role;\n"
    );
  }

  console.log("Tables verified: profiles + user_roles + saved_trainers are in the database.");
}

main().catch((err) => {
  console.error("\n✗", err instanceof Error ? err.message : err);
  console.error(
    "\nApply: supabase/migrations/20260603000000_profiles_and_user_roles.sql"
  );
  process.exit(1);
});
