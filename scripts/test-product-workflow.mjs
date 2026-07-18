/**
 * Product workflow smoke — reusable accounts only (no throwaway spam).
 *
 * Accounts:
 *   product-client@smoac-test.local / ProductTest123!
 *   product-specialist@smoac-test.local / ProductTest123!
 *
 * Usage: node scripts/test-product-workflow.mjs
 *
 * Requires Confirm email disabled for Auth signups (or service-role create).
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

const CLIENT = {
  email: "product-client@smoac-test.local",
  password: "ProductTest123!",
  firstName: "Product",
  lastName: "Client",
};
const SPECIALIST = {
  email: "product-specialist@smoac-test.local",
  password: "ProductTest123!",
  firstName: "Product",
  lastName: "Specialist",
  profileId: "product-specialist-reusable",
};

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function anon() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureUser(account, role) {
  const list = await admin.auth.admin.listUsers({ perPage: 200 });
  if (list.error) throw new Error(`listUsers: ${list.error.message}`);
  let user = list.data.users.find(
    (u) => (u.email ?? "").toLowerCase() === account.email.toLowerCase()
  );

  if (!user) {
    const created = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { role, first_name: account.firstName },
    });
    if (created.error) throw new Error(`createUser ${account.email}: ${created.error.message}`);
    user = created.data.user;
    console.log(`  ✓ Created auth user ${account.email}`);
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: account.password,
      email_confirm: true,
    });
    console.log(`  ✓ Reused auth user ${account.email}`);
  }

  /* Table writes via authenticated session (service-role PostgREST grants may be missing) */
  const sessionClient = anon();
  const { data: signedIn, error: signInError } =
    await sessionClient.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
  if (signInError || !signedIn.session) {
    throw new Error(
      `signIn after create ${account.email}: ${signInError?.message ?? "no session"}`
    );
  }

  const { error: roleError } = await sessionClient.from("user_roles").upsert({
    user_id: user.id,
    role,
    is_premium: false,
  });
  if (roleError) throw new Error(`user_roles ${account.email}: ${roleError.message}`);

  const { error: profileError } = await sessionClient.from("profiles").upsert({
    user_id: user.id,
    email: account.email,
    first_name: account.firstName,
    last_name: account.lastName,
  });
  if (profileError) throw new Error(`profiles ${account.email}: ${profileError.message}`);

  return user;
}

async function signIn(account) {
  const client = anon();
  const { data, error } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (error || !data.session) {
    throw new Error(`signIn ${account.email}: ${error?.message ?? "no session"}`);
  }
  return { client, userId: data.user.id, session: data.session };
}

async function main() {
  console.log("SMOAC product workflow smoke (reusable accounts)\n");

  const clientUser = await ensureUser(CLIENT, "client");
  const specialistUser = await ensureUser(SPECIALIST, "specialist");

  /* Application row via specialist session */
  const specialistSession = await signIn(SPECIALIST);
  const applicationPayload = {
    id: SPECIALIST.profileId,
    profileStatus: "PENDING_APPROVAL",
    email: SPECIALIST.email,
    userId: specialistUser.id,
    displayName: "Product Specialist",
    fullName: "Product Specialist",
    headline: "Strength & mobility",
    professionalType: "Personal Trainer",
    specialties: ["Strength Training", "Mobility"],
    city: "San Diego",
    neighborhood: "La Jolla",
    zipCode: "92037",
    serviceType: "both",
    travelRadius: "15",
    bio: "Reusable product-test specialist for end-to-end marketplace QA.",
    pricing: { oneOnOnePrice: "125" },
    media: { profilePhotoUrl: "" },
    certifications: [],
    social: {},
    availability: {},
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { error: appError } = await specialistSession.client
    .from("specialist_applications")
    .upsert({
      id: SPECIALIST.profileId,
      user_id: specialistUser.id,
      email: SPECIALIST.email,
      profile_status: "PENDING_APPROVAL",
      application_data: applicationPayload,
      submitted_at: applicationPayload.submittedAt,
      updated_at: applicationPayload.updatedAt,
    });
  if (appError) throw new Error(`specialist_applications: ${appError.message}`);
  console.log("  ✓ Specialist application upserted (pending)");

  /* Approve → public profile (owner writes as specialist — matches RLS for own rows) */
  const profileData = {
    id: SPECIALIST.profileId,
    name: "Product Specialist",
    title: "Strength & mobility",
    profession: "Personal Trainer",
    specialty: ["Strength Training", "Mobility"],
    city: "San Diego",
    state: "CA",
    neighborhood: "La Jolla",
    zipCode: "92037",
    serviceType: "both",
    serviceRadiusMiles: 15,
    pricePerSession: 125,
    bio: "Reusable product-test specialist for end-to-end marketplace QA.",
    rating: 4.9,
    reviewCount: 12,
    image: "",
    heroImage: "",
    gallery: [],
    galleryImages: [],
    certifications: [],
    featured: false,
    sponsored: false,
    verified: true,
    gender: "non-binary",
    location: "La Jolla, San Diego",
    serviceArea: ["La Jolla", "Pacific Beach"],
    sessionExperience: ["In-person", "Virtual"],
    bestFor: ["Busy professionals"],
    coachingStyle: ["Results-driven"],
    whyClientsChoose: ["Clear programming"],
    clientTransformations: [],
    social: {},
    reviews: [],
  };

  const { error: profileUpsertError } = await specialistSession.client
    .from("specialist_profiles")
    .upsert({
      id: SPECIALIST.profileId,
      user_id: specialistUser.id,
      application_id: SPECIALIST.profileId,
      status: "approved",
      display_name: profileData.name,
      profession: profileData.profession,
      city: profileData.city,
      state: profileData.state,
      neighborhood: profileData.neighborhood,
      zip_code: profileData.zipCode,
      specialty: profileData.specialty,
      price_per_session: profileData.pricePerSession,
      service_type: profileData.serviceType,
      featured: false,
      sponsored: false,
      verified: true,
      rating: profileData.rating,
      review_count: profileData.reviewCount,
      profile_data: profileData,
      overrides: {},
    });
  if (profileUpsertError) {
    throw new Error(`specialist_profiles: ${profileUpsertError.message}`);
  }

  const { error: approveAppError } = await specialistSession.client
    .from("specialist_applications")
    .update({
      profile_status: "APPROVED",
      application_data: {
        ...applicationPayload,
        profileStatus: "APPROVED",
      },
    })
    .eq("id", SPECIALIST.profileId);
  if (approveAppError) {
    throw new Error(`approve application: ${approveAppError.message}`);
  }
  console.log("  ✓ Specialist published (approved listing)");

  /* Public read (anon) */
  const publicClient = anon();
  const { data: publicRows, error: publicError } = await publicClient
    .from("specialist_profiles")
    .select("id, display_name, status, city, neighborhood")
    .eq("id", SPECIALIST.profileId)
    .eq("status", "approved")
    .maybeSingle();
  if (publicError) throw new Error(`anon select: ${publicError.message}`);
  if (!publicRows) throw new Error("Published specialist not visible to anon");
  console.log(
    `  ✓ Public listing visible (${publicRows.display_name}, ${publicRows.neighborhood})`
  );

  /* Client login + save */
  const clientSession = await signIn(CLIENT);
  const { error: saveError } = await clientSession.client.from("saved_trainers").insert({
    user_id: clientUser.id,
    specialist_id: SPECIALIST.profileId,
  });
  if (saveError && !/duplicate|unique/i.test(saveError.message)) {
    throw new Error(`saved_trainers: ${saveError.message}`);
  }
  console.log("  ✓ Client saved specialist");

  /* Inquiry tables may not be migrated yet — report clearly */
  const { error: inquiryProbe } = await clientSession.client
    .from("inquiry_conversations")
    .select("id")
    .limit(1);
  if (inquiryProbe && /Could not find the table|schema cache/i.test(inquiryProbe.message)) {
    console.log(
      "  ⚠ inquiry_conversations missing — apply supabase/migrations/20260714000000_specialist_inquiries.sql"
    );
    console.log("  ✓ Skipping inquiry checks until migration is applied");
  } else {
    const { data: existingConvo } = await clientSession.client
      .from("inquiry_conversations")
      .select("id")
      .eq("client_user_id", clientUser.id)
      .eq("specialist_id", SPECIALIST.profileId)
      .maybeSingle();

    let conversationId = existingConvo?.id;
    if (!conversationId) {
      const { data: convo, error: convoError } = await clientSession.client
        .from("inquiry_conversations")
        .insert({
          specialist_id: SPECIALIST.profileId,
          specialist_user_id: specialistUser.id,
          specialist_name: "Product Specialist",
          client_user_id: clientUser.id,
          client_first_name: CLIENT.firstName,
          client_email: CLIENT.email,
          inquiry_action: "ask_question",
          inquiry_topics: ["pricing"],
          source: "specialist_profile",
        })
        .select("id")
        .single();
      if (convoError) throw new Error(`inquiry_conversations: ${convoError.message}`);
      conversationId = convo.id;
    }

    const { error: msgError } = await clientSession.client.from("inquiry_messages").insert({
      conversation_id: conversationId,
      sender_user_id: clientUser.id,
      sender_role: "client",
      body: "Product workflow test inquiry — please ignore.",
      inquiry_action: "ask_question",
      inquiry_topics: ["pricing"],
    });
    if (msgError) throw new Error(`inquiry_messages: ${msgError.message}`);
    console.log("  ✓ Client inquiry persisted");

    const specialistRead = await signIn(SPECIALIST);
    const { data: leads, error: leadError } = await specialistRead.client
      .from("inquiry_conversations")
      .select("id, client_first_name")
      .eq("specialist_id", SPECIALIST.profileId);
    if (leadError) throw new Error(`specialist read inquiries: ${leadError.message}`);
    if (!leads?.some((row) => row.id === conversationId)) {
      throw new Error("Specialist could not see client inquiry");
    }
    console.log("  ✓ Specialist can view inquiry");

    /* Edit listing */
    const { error: editError } = await specialistRead.client
      .from("specialist_profiles")
      .update({
        display_name: "Product Specialist Updated",
        profile_data: {
          ...profileData,
          name: "Product Specialist Updated",
          bio: "Updated bio after edit — product workflow.",
        },
      })
      .eq("id", SPECIALIST.profileId)
      .eq("user_id", specialistUser.id);
    if (editError) throw new Error(`specialist edit: ${editError.message}`);

    const { data: edited } = await publicClient
      .from("specialist_profiles")
      .select("display_name")
      .eq("id", SPECIALIST.profileId)
      .maybeSingle();
    if (edited?.display_name !== "Product Specialist Updated") {
      throw new Error("Public listing did not reflect specialist edit");
    }
    console.log("  ✓ Public listing updated after specialist edit");

    await specialistRead.client
      .from("specialist_profiles")
      .update({
        display_name: "Product Specialist",
        profile_data: profileData,
      })
      .eq("id", SPECIALIST.profileId);
  }

  if (!inquiryProbe || !/Could not find the table|schema cache/i.test(inquiryProbe.message)) {
    /* edit path already covered above when inquiries exist */
  } else {
    const specialistRead = await signIn(SPECIALIST);
    const { error: editError } = await specialistRead.client
      .from("specialist_profiles")
      .update({
        display_name: "Product Specialist Updated",
        profile_data: {
          ...profileData,
          name: "Product Specialist Updated",
          bio: "Updated bio after edit — product workflow.",
        },
      })
      .eq("id", SPECIALIST.profileId)
      .eq("user_id", specialistUser.id);
    if (editError) throw new Error(`specialist edit: ${editError.message}`);

    const { data: edited } = await publicClient
      .from("specialist_profiles")
      .select("display_name")
      .eq("id", SPECIALIST.profileId)
      .maybeSingle();
    if (edited?.display_name !== "Product Specialist Updated") {
      throw new Error("Public listing did not reflect specialist edit");
    }
    console.log("  ✓ Public listing updated after specialist edit");

    await specialistRead.client
      .from("specialist_profiles")
      .update({
        display_name: "Product Specialist",
        profile_data: profileData,
      })
      .eq("id", SPECIALIST.profileId);
  }

  console.log("\nProduct-workflow checks finished.");
  console.log("\nReusable credentials:");
  console.log(`  Client     ${CLIENT.email} / ${CLIENT.password}`);
  console.log(`  Specialist ${SPECIALIST.email} / ${SPECIALIST.password}`);
  console.log(`  Public URL /trainers/${SPECIALIST.profileId}`);
}

main().catch((error) => {
  console.error("\nFAILED:", error.message ?? error);
  process.exit(1);
});
