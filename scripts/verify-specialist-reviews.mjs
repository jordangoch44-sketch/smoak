/**
 * Verify SMOAC client reviews table + RPC exist.
 * Usage: npm run verify:reviews
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !anon || !service) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const table = await admin.from("specialist_reviews").select("id").limit(1);
const aggregates = await admin
  .from("specialist_review_aggregates")
  .select("specialist_id")
  .limit(1);

// RPC is granted to `authenticated` only — service_role gets 42501 by design.
// Existence check: missing function = PGRST202; permission denied = function exists.
const rpc = await admin.rpc("submit_specialist_review", {
  p_specialist_id: "__verify__",
  p_rating: 5,
  p_review_text: "verification probe text",
});

const tableOk = !table.error;
const viewOk = !aggregates.error;
const rpcMissing =
  rpc.error?.code === "PGRST202" ||
  /could not find the function/i.test(rpc.error?.message ?? "");
const rpcOk = !rpcMissing;

console.log("");
console.log("SMOAC reviews verify");
console.log("────────────────────");
console.log(
  "specialist_reviews:",
  tableOk ? "OK" : `FAIL (${table.error?.code} ${table.error?.message})`
);
console.log(
  "specialist_review_aggregates:",
  viewOk ? "OK" : `FAIL (${aggregates.error?.code} ${aggregates.error?.message})`
);
console.log(
  "submit_specialist_review RPC:",
  rpcOk
    ? `OK (exists; ${rpc.error ? rpc.error.message : "callable"})`
    : `FAIL (${rpc.error?.code} ${rpc.error?.message})`
);

if (!tableOk || !viewOk || !rpcOk) {
  console.log("");
  console.log("Migration not applied. Run:");
  console.log(
    "  npm run apply:migration -- supabase/migrations/20260719120000_specialist_client_reviews.sql"
  );
  console.log("Or paste that SQL file into Supabase → SQL Editor → Run.");
  console.log("");
  process.exit(1);
}

console.log("");
console.log("PASS: reviews backend is ready for signed-in clients.");
console.log("");
