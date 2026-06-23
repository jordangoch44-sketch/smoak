/**
 * Applies signup fix migration (grants + RLS + profiles columns).
 * Usage: npm run apply:signup-fix
 */
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const migration = resolve(
  process.cwd(),
  "supabase/migrations/20260605000000_user_roles_profiles_grants_rls.sql"
);

const dbUrl =
  process.env.SUPABASE_DB_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "";

if (!dbUrl) {
  console.error(
    "Cannot apply migration automatically — no database connection string.\n\n" +
      "Add to .env.local (Supabase → Project Settings → Database → Connection string → URI):\n" +
      "  SUPABASE_DB_URL=postgresql://postgres.[ref]:[YOUR-PASSWORD]@...\n\n" +
      "Or paste the SQL file into Supabase SQL Editor:\n" +
      "  supabase/migrations/20260605000000_user_roles_profiles_grants_rls.sql\n"
  );
  process.exit(1);
}

const { readFileSync } = await import("node:fs");
const sql = readFileSync(migration, "utf8");
const { default: pg } = await import("pg");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

console.log("Applying signup fix migration…\n");
await client.connect();
try {
  await client.query(sql);
  console.log("✓ Migration applied.\nRun: npm run test:supabase:signup");
} finally {
  await client.end();
}
