/**
 * Phase 3c — specialist_profiles public catalog smoke test.
 * Usage: npm run test:supabase:profiles
 *
 * Requires migration 20260716000000_specialist_profiles.sql applied
 * and Auth “Confirm email” disabled for test signups (same as other scripts).
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

async function signUpSpecialist(label) {
  const email = `profiles-test-${label}-${Date.now()}@smoac-test.local`;
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
    role: "specialist",
    is_premium: false,
  });
  if (roleError) throw new Error(`${label} user_roles: ${roleError.message}`);

  const { error: profileError } = await client.from("profiles").insert({
    user_id: data.user.id,
    email,
    first_name: label,
    last_name: "Test",
  });
  if (profileError) throw new Error(`${label} profiles: ${profileError.message}`);

  return { client, userId: data.user.id, email };
}

async function main() {
  console.log("SMOAC specialist_profiles (Phase 3c) test\n");

  const specialist = await signUpSpecialist("spec-a");
  console.log(`  ✓ Specialist created (${specialist.email})`);

  const profileId = `profile-test-${Date.now().toString(36)}`;
  const { error: insertError } = await specialist.client
    .from("specialist_profiles")
    .insert({
      id: profileId,
      user_id: specialist.userId,
      application_id: null,
      status: "approved",
      display_name: "Test Specialist",
      profession: "Personal Trainer",
      city: "San Diego",
      state: "CA",
      zip_code: "92128",
      specialty: ["Strength"],
      price_per_session: 120,
      profile_data: {
        id: profileId,
        name: "Test Specialist",
        profession: "Personal Trainer",
        city: "San Diego",
        state: "CA",
        specialty: ["Strength"],
        pricePerSession: 120,
      },
      overrides: { bio: "Phase 3c smoke bio" },
    });
  if (insertError) throw new Error(`insert: ${insertError.message}`);
  console.log("  ✓ Specialist inserted specialist_profiles row");

  const guest = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: publicRows, error: publicError } = await guest
    .from("specialist_profiles")
    .select("id, display_name, status")
    .eq("id", profileId)
    .eq("status", "approved");
  if (publicError) throw new Error(`anon select: ${publicError.message}`);
  if ((publicRows?.length ?? 0) < 1) {
    throw new Error("anon select: approved profile not visible to guests");
  }
  console.log("  ✓ Anon can read approved specialist_profiles");

  const { error: archiveError } = await specialist.client
    .from("specialist_profiles")
    .update({ status: "archived" })
    .eq("id", profileId);
  if (archiveError) throw new Error(`archive: ${archiveError.message}`);

  const { data: hiddenRows, error: hiddenError } = await guest
    .from("specialist_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("status", "approved");
  if (hiddenError) throw new Error(`anon after archive: ${hiddenError.message}`);
  if ((hiddenRows?.length ?? 0) !== 0) {
    throw new Error("archived profile still visible to anon as approved");
  }
  console.log("  ✓ Archived profile hidden from anon approved select");

  console.log("\nPhase 3c specialist_profiles test passed.");
}

main().catch((error) => {
  console.error("\nFAILED:", error.message ?? error);
  process.exit(1);
});
