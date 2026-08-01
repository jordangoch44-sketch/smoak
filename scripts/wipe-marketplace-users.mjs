/**
 * Soft-launch reset: wipe marketplace clients + specialists.
 * Keeps known admin Auth emails (default: admin@smoac.com).
 *
 * Usage:
 *   node scripts/wipe-marketplace-users.mjs
 *   WIPE_KEEP_EMAILS=admin@smoac.com,other@smoac.com node scripts/wipe-marketplace-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

const keepEmails = new Set(
  (process.env.WIPE_KEEP_EMAILS || "admin@smoac.com")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

async function clearTable(label, run) {
  const { error, count } = await run();
  if (error) {
    console.warn(`  ! ${label}: ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${label}${typeof count === "number" ? ` (${count})` : ""}`);
  return true;
}

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }
  return users;
}

async function main() {
  console.log("SMOAC marketplace wipe (keep admins)\n");
  console.log(`Keep emails: ${[...keepEmails].join(", ")}`);

  const authUsers = await listAllAuthUsers();
  console.log(`Auth users found: ${authUsers.length}`);

  console.log("\nClearing marketplace tables…");
  await clearTable("inquiry_messages", () =>
    admin.from("inquiry_messages").delete().neq("id", NIL_UUID).select("id")
  );
  await clearTable("inquiry_conversations", () =>
    admin.from("inquiry_conversations").delete().neq("id", NIL_UUID).select("id")
  );
  await clearTable("saved_trainers", () =>
    admin.from("saved_trainers").delete().neq("specialist_id", "").select("specialist_id")
  );
  await clearTable("specialist_reviews", () =>
    admin.from("specialist_reviews").delete().neq("id", NIL_UUID).select("id")
  );
  await clearTable("specialist_engagement_events", () =>
    admin
      .from("specialist_engagement_events")
      .delete()
      .neq("id", NIL_UUID)
      .select("id")
  );
  await clearTable("specialist_billing", () =>
    admin.from("specialist_billing").delete().neq("user_id", NIL_UUID).select("user_id")
  );
  await clearTable("specialist_profiles", () =>
    admin.from("specialist_profiles").delete().neq("id", "").select("id")
  );
  await clearTable("specialist_applications", () =>
    admin.from("specialist_applications").delete().neq("id", "").select("id")
  );
  await clearTable("client_applications", () =>
    admin.from("client_applications").delete().neq("id", "").select("id")
  );

  console.log("\nDeleting non-admin Auth users…");
  let deleted = 0;
  let kept = 0;
  const failures = [];

  for (const user of authUsers) {
    const email = (user.email || "").trim().toLowerCase();
    if (email && keepEmails.has(email)) {
      kept += 1;
      console.log(`  keep ${email}`);
      continue;
    }
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      failures.push(`${email || user.id}: ${error.message}`);
      console.warn(`  ! fail ${email || user.id}: ${error.message}`);
    } else {
      deleted += 1;
      console.log(`  deleted ${email || user.id}`);
    }
  }

  /* Leftover profiles for deleted users (cascade usually handles this) */
  const { data: leftoverProfiles } = await admin
    .from("profiles")
    .select("user_id, email");
  for (const row of leftoverProfiles ?? []) {
    const email = String(row.email || "").trim().toLowerCase();
    if (keepEmails.has(email)) continue;
    await admin.from("profiles").delete().eq("user_id", row.user_id);
  }

  console.log("\nDone.");
  console.log(`  Auth deleted: ${deleted}`);
  console.log(`  Admins kept:  ${kept}`);
  if (failures.length) {
    console.log(`  Failures: ${failures.length}`);
    for (const f of failures) console.log(`    - ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
