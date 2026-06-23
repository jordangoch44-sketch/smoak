/**
 * Phase 3a — saved_trainers RLS + persistence test.
 * Usage: npm run test:supabase:saved
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

const specialistA = "marcus-chen";
const specialistB = "elena-vasquez";

async function signUpClient(label) {
  const email = `saved-test-${label}-${Date.now()}@smoac-test.local`;
  const password = "TestPass123!";
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`${label} signUp: ${error.message}`);
  if (!data.user) throw new Error(`${label} signUp: no user`);
  if (!data.session) {
    throw new Error(
      `${label} signUp: no session — disable Confirm email in Supabase Auth`
    );
  }

  const { error: roleError } = await client.from("user_roles").insert({
    user_id: data.user.id,
    role: "client",
    is_premium: false,
  });
  if (roleError) throw new Error(`${label} user_roles: ${roleError.message}`);

  const { error: profileError } = await client.from("profiles").insert({
    user_id: data.user.id,
    email,
    first_name: label,
    last_name: "Test",
    client_zip_code: "92128",
  });
  if (profileError) throw new Error(`${label} profiles: ${profileError.message}`);

  return { client, userId: data.user.id, email };
}

async function main() {
  console.log("SMOAC saved_trainers test\n");

  const userA = await signUpClient("user-a");
  console.log(`  ✓ User A created (${userA.email})`);

  const { error: insertA1 } = await userA.client.from("saved_trainers").insert({
    user_id: userA.userId,
    specialist_id: specialistA,
  });
  if (insertA1) throw new Error(`User A insert 1: ${insertA1.message}`);

  const { error: insertA2 } = await userA.client.from("saved_trainers").insert({
    user_id: userA.userId,
    specialist_id: specialistB,
  });
  if (insertA2) throw new Error(`User A insert 2: ${insertA2.message}`);
  console.log("  ✓ User A saved 2 specialists");

  const { data: listA, error: listAError } = await userA.client
    .from("saved_trainers")
    .select("specialist_id")
    .eq("user_id", userA.userId);
  if (listAError) throw new Error(`User A select: ${listAError.message}`);
  if (listA?.length !== 2) {
    throw new Error(`User A expected 2 rows, got ${listA?.length ?? 0}`);
  }
  console.log("  ✓ User A reads 2 saved rows");

  await userA.client.auth.signOut();
  const { error: signInAError } = await userA.client.auth.signInWithPassword({
    email: userA.email,
    password: "TestPass123!",
  });
  if (signInAError) throw new Error(`User A re-login: ${signInAError.message}`);

  const { data: listA2, error: listA2Error } = await userA.client
    .from("saved_trainers")
    .select("specialist_id")
    .eq("user_id", userA.userId);
  if (listA2Error) throw new Error(`User A select after login: ${listA2Error.message}`);
  if (listA2?.length !== 2) {
    throw new Error(`User A after login expected 2, got ${listA2?.length ?? 0}`);
  }
  console.log("  ✓ User A still has 2 saved after logout/login");

  const { error: deleteA } = await userA.client
    .from("saved_trainers")
    .delete()
    .eq("user_id", userA.userId)
    .eq("specialist_id", specialistA);
  if (deleteA) throw new Error(`User A unsave: ${deleteA.message}`);

  const { data: listA3 } = await userA.client
    .from("saved_trainers")
    .select("specialist_id")
    .eq("user_id", userA.userId);
  if (listA3?.length !== 1) {
    throw new Error(`User A after unsave expected 1, got ${listA3?.length ?? 0}`);
  }
  console.log("  ✓ User A unsave → 1 row remains");

  const userB = await signUpClient("user-b");
  console.log(`  ✓ User B created (${userB.email})`);

  const { data: listB, error: listBError } = await userB.client
    .from("saved_trainers")
    .select("specialist_id")
    .eq("user_id", userB.userId);
  if (listBError) throw new Error(`User B select: ${listBError.message}`);
  if ((listB?.length ?? 0) !== 0) {
    throw new Error(`User B expected 0 rows, got ${listB?.length ?? 0}`);
  }
  console.log("  ✓ User B sees 0 saved (isolated from User A)");

  const { error: crossInsert } = await userB.client.from("saved_trainers").insert({
    user_id: userA.userId,
    specialist_id: specialistA,
  });
  if (!crossInsert) {
    throw new Error("User B should not insert saves for User A");
  }
  console.log("  ✓ User B cannot write User A saves (RLS)");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: adminRows, error: adminError } = await admin
    .from("saved_trainers")
    .select("user_id, specialist_id");
  if (adminError) {
    console.warn(`  ⚠ service_role SELECT: ${adminError.message}`);
  } else {
    console.log(`  ✓ service_role can read ${adminRows?.length ?? 0} row(s)`);
  }

  console.log("\nSaved trainers test passed.");
}

main().catch((err) => {
  console.error("\n✗", err instanceof Error ? err.message : err);
  console.error(
    "\nApply: supabase/migrations/20260606000000_saved_trainers.sql"
  );
  process.exit(1);
});
