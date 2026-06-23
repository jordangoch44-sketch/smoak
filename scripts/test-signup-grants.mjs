/**
 * End-to-end signup grant test (auth.signUp + user_roles + profiles inserts).
 * Usage: npm run test:supabase:signup
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const testEmail = `grant-test-${Date.now()}@smoac-test.local`;
const testPassword = "TestPass123!";

async function main() {
  console.log("SMOAC signup + grants test\n");
  console.log(`  Test email: ${testEmail}\n`);

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signUpData, error: signUpError } = await client.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpError) {
    throw new Error(`auth.signUp: ${signUpError.message}`);
  }

  const user = signUpData.user;
  const session = signUpData.session;
  if (!user) {
    throw new Error("auth.signUp returned no user");
  }

  if (!session) {
    console.warn(
      "  ⚠ No session after signUp — enable “Confirm email” off in Supabase Auth settings for this test."
    );
    process.exit(0);
  }

  console.log("  ✓ auth.signUp created user + session");

  const { error: roleError } = await client.from("user_roles").insert({
    user_id: user.id,
    role: "client",
    is_premium: false,
  });

  if (roleError) {
    throw new Error(`user_roles INSERT (authenticated): ${roleError.message}`);
  }
  console.log("  ✓ user_roles INSERT");

  const { error: profileError } = await client.from("profiles").insert({
    user_id: user.id,
    email: testEmail,
    first_name: "Grant",
    last_name: "Test",
    client_zip_code: "10001",
  });

  if (profileError) {
    throw new Error(`profiles INSERT (authenticated): ${profileError.message}`);
  }
  console.log("  ✓ profiles INSERT");

  const { data: roleRow, error: roleSelectError } = await client
    .from("user_roles")
    .select("user_id, role")
    .eq("user_id", user.id)
    .single();

  if (roleSelectError) {
    throw new Error(`user_roles SELECT own: ${roleSelectError.message}`);
  }
  console.log(`  ✓ user_roles SELECT own (role=${roleRow.role})`);

  const { data: profileRow, error: profileSelectError } = await client
    .from("profiles")
    .select("first_name, client_zip_code")
    .eq("user_id", user.id)
    .single();

  if (profileSelectError) {
    throw new Error(`profiles SELECT own: ${profileSelectError.message}`);
  }
  console.log(
    `  ✓ profiles SELECT own (first_name=${profileRow.first_name}, client_zip_code=${profileRow.client_zip_code})`
  );

  await client.auth.signOut();

  const { error: signInError } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    throw new Error(`signInWithPassword: ${signInError.message}`);
  }
  console.log("  ✓ signInWithPassword after signup");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: adminRoleError } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminRoleError) {
    console.warn(
      `  ⚠ service_role cannot read user_roles (${adminRoleError.message}) — app signup unaffected`
    );
  } else {
    console.log("  ✓ user_roles readable by service_role");
  }

  await admin.auth.admin.deleteUser(user.id);
  console.log("\n✓ Signup flow checks passed (test user deleted).");
}

main().catch((err) => {
  console.error("\n✗", err instanceof Error ? err.message : err);
  console.error(
    "\nIf you see permission denied, run:\n" +
      "  npm run apply:migration -- supabase/migrations/20260605000000_user_roles_profiles_grants_rls.sql"
  );
  process.exit(1);
});
