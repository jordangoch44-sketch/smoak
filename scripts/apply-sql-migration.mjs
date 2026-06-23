/**
 * Apply a SQL migration file to the linked Supabase Postgres database.
 *
 * Requires in .env.local (Database → Connection string → URI):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@...
 *
 * Usage:
 *   npm run apply:migration -- supabase/migrations/20260605000000_user_roles_profiles_grants_rls.sql
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: node scripts/apply-sql-migration.mjs <path-to.sql>");
  process.exit(1);
}

const dbUrl =
  process.env.SUPABASE_DB_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "";

if (!dbUrl) {
  console.error(
    "Missing SUPABASE_DB_URL (or DATABASE_URL) in .env.local.\n\n" +
      "Add your Postgres connection string from Supabase Dashboard:\n" +
      "  Project Settings → Database → Connection string → URI\n\n" +
      "Then run this script again."
  );
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), fileArg);
const sql = readFileSync(sqlPath, "utf8");

async function main() {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  console.log(`Applying migration: ${fileArg}\n`);
  await client.connect();
  try {
    await client.query(sql);
    console.log("✓ Migration applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\n✗ Migration failed\n");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
