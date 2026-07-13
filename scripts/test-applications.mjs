/**
 * Phase 3b — client_applications + specialist_applications RLS test.
 * Usage: npm run test:supabase:applications
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

async function signUpClient(label) {
  const email = `apps-test-${label}-${Date.now()}@smoac-test.local`;
  const password = "TestPass123!";
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`${label} signUp: ${error.message}`);
  if (!data.user || !data.session) {
    throw new Error(
      `${label} signUp: need session — disable Confirm email in Supabase Auth`
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
  console.log("SMOAC applications (Phase 3b) test\n");

  const userA = await signUpClient("user-a");
  console.log(`  ✓ User A created (${userA.email})`);

  const appId = `client-test-${Date.now().toString(36)}`;
  const { error: insertError } = await userA.client
    .from("client_applications")
    .insert({
      id: appId,
      user_id: userA.userId,
      status: "PENDING",
      email: userA.email,
      full_name: "User A",
      preferred_zip_code: "92128",
      fitness_goals: ["Strength"],
      preferred_specialist_categories: [],
      budget: "$100-150",
    });
  if (insertError) throw new Error(`insert: ${insertError.message}`);
  console.log("  ✓ User A inserted client_application");

  const { data: listA, error: listError } = await userA.client
    .from("client_applications")
    .select("id, status")
    .eq("user_id", userA.userId);
  if (listError) throw new Error(`select: ${listError.message}`);
  if ((listA?.length ?? 0) < 1) {
    throw new Error("User A expected at least 1 application");
  }
  console.log("  ✓ User A reads own client_application");

  const specialistId = `specialist-test-${Date.now().toString(36)}`;
  const { error: specError } = await userA.client
    .from("specialist_applications")
    .insert({
      id: specialistId,
      user_id: userA.userId,
      profile_status: "PENDING_APPROVAL",
      email: userA.email,
      application_data: { fullName: "User A Specialist", city: "San Diego" },
      submitted_at: new Date().toISOString(),
    });
  if (specError) throw new Error(`specialist insert: ${specError.message}`);
  console.log("  ✓ User A inserted specialist_application");

  const userB = await signUpClient("user-b");
  console.log(`  ✓ User B created (${userB.email})`);

  const { data: listB, error: listBError } = await userB.client
    .from("client_applications")
    .select("id")
    .eq("user_id", userA.userId);
  if (listBError) throw new Error(`User B cross-select: ${listBError.message}`);
  if ((listB?.length ?? 0) !== 0) {
    throw new Error("User B should not see User A client applications");
  }
  console.log("  ✓ User B cannot read User A client applications (RLS)");

  const { error: crossWrite } = await userB.client
    .from("client_applications")
    .insert({
      id: `client-cross-${Date.now().toString(36)}`,
      user_id: userA.userId,
      status: "PENDING",
      email: userA.email,
      full_name: "Hijack",
    });
  if (!crossWrite) {
    throw new Error("User B should not insert for User A");
  }
  console.log("  ✓ User B cannot write User A applications (RLS)");

  console.log("\nApplications test passed.");
}

main().catch((err) => {
  console.error("\n✗", err instanceof Error ? err.message : err);
  console.error(
    "\nApply: supabase/migrations/20260607000000_applications.sql"
  );
  process.exit(1);
});
