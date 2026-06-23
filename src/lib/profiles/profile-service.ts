import type { SupabaseClient } from "@supabase/supabase-js";
import { logAuth } from "@/lib/auth/auth-logger";
import { lookupLocalZipPlace } from "@/lib/geo/zip-place-names";
import type { AppRole, PublicAuthRole } from "@/types/auth-roles";
import type { CreateAccountProfile } from "@/types/create-account";
import type { ProfileRow, UserRoleRow } from "@/types/database";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import { isAdminAppRole } from "@/types/auth-roles";

export type ProfileUpsertResult =
  | { ok: true }
  | { ok: false; message: string };

/** Columns that exist on public.profiles — role lives in user_roles only. */
type ProfileUpsertPayload = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  client_goals?: string[];
  client_city?: string;
  client_neighborhood?: string;
  client_zip_code?: string;
  client_budget?: string;
  client_training_style?: string;
  specialist_type?: string;
  specialist_city?: string;
  specialist_neighborhood?: string;
  specialist_format?: string;
  specialist_starting_price?: string;
  onboarding_data?: Record<string, unknown> | null;
};

function emptyProfileFields(): Omit<
  ProfileUpsertPayload,
  "user_id" | "email" | "first_name" | "last_name"
> {
  return {
    client_goals: [],
    client_city: "",
    client_neighborhood: "",
    client_zip_code: "",
    client_budget: "",
    client_training_style: "",
    specialist_type: "",
    specialist_city: "",
    specialist_neighborhood: "",
    specialist_format: "",
    specialist_starting_price: "",
    onboarding_data: null,
  };
}

function logProfilePayload(payload: ProfileUpsertPayload): void {
  if (process.env.NODE_ENV !== "production") {
    logAuth("profiles.upsert_payload", { ...payload });
  }
}

async function upsertProfileRow(
  supabase: SupabaseClient,
  payload: ProfileUpsertPayload
): Promise<ProfileUpsertResult> {
  logProfilePayload(payload);

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function fetchUserRoleRow(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRoleRow | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profiles] fetchUserRoleRow", error.message);
    return null;
  }

  return data as UserRoleRow | null;
}

export async function fetchProfileRow(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profiles] fetchProfileRow", error.message);
    return null;
  }

  return data as ProfileRow | null;
}

export async function upsertUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: AppRole,
  isPremium = false
): Promise<ProfileUpsertResult> {
  const { error } = await supabase.from("user_roles").upsert(
    {
      user_id: userId,
      role,
      is_premium: isPremium,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

/** First-time signup when wizard did not pass a full profile payload. */
export async function saveMinimalSignupProfile(
  supabase: SupabaseClient,
  userId: string,
  params: {
    email: string;
    firstName: string;
    lastName: string;
    role: "client" | "specialist";
    zipCode?: string;
  }
): Promise<ProfileUpsertResult> {
  const roleResult = await upsertUserRole(supabase, userId, params.role);
  if (!roleResult.ok) return roleResult;

  const zip = params.zipCode?.trim() ?? "";
  return upsertProfileRow(supabase, {
    user_id: userId,
    email: params.email.trim().toLowerCase(),
    first_name: params.firstName.trim(),
    last_name: params.lastName.trim(),
    ...emptyProfileFields(),
    client_zip_code: zip,
  });
}

export async function saveClientSignupProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: CreateAccountProfile
): Promise<ProfileUpsertResult> {
  const roleResult = await upsertUserRole(supabase, userId, "client");
  if (!roleResult.ok) return roleResult;

  const zip = profile.clientZipCode?.trim() ?? "";
  const localPlace = zip ? lookupLocalZipPlace(zip) : null;
  const neighborhood =
    profile.clientNeighborhood?.trim() || localPlace?.placeName || "";
  return upsertProfileRow(supabase, {
    user_id: userId,
    email: profile.email.trim().toLowerCase(),
    first_name: profile.firstName.trim(),
    last_name: profile.lastName.trim(),
    ...emptyProfileFields(),
    client_goals: profile.clientGoals ?? [],
    client_city: profile.clientCity?.trim() ?? "",
    client_neighborhood: neighborhood,
    client_zip_code: zip,
    client_budget: profile.clientBudget?.trim() ?? "",
    client_training_style: profile.clientTrainingStyle?.trim() ?? "",
  });
}

export async function saveSpecialistSignupProfile(
  supabase: SupabaseClient,
  userId: string,
  state: SpecialistOnboardingState
): Promise<ProfileUpsertResult> {
  const roleResult = await upsertUserRole(supabase, userId, "specialist");
  if (!roleResult.ok) return roleResult;

  const trimmedEmail = state.email.trim().toLowerCase();
  const nameParts = state.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");
  const zip = state.zipCode?.trim() ?? "";

  return upsertProfileRow(supabase, {
    user_id: userId,
    email: trimmedEmail,
    first_name: firstName,
    last_name: lastName,
    ...emptyProfileFields(),
    client_zip_code: zip,
    specialist_type: state.professionalType?.trim() ?? "",
    specialist_city: state.city?.trim() ?? "",
    specialist_neighborhood: state.neighborhood?.trim() ?? "",
    specialist_format: state.serviceType?.trim() ?? "",
    specialist_starting_price:
      state.pricing?.oneOnOnePrice?.trim() ||
      state.pricing?.onlineCoachingPrice?.trim() ||
      "",
    onboarding_data: state as unknown as Record<string, unknown>,
  });
}

/** Partial specialist questionnaire from create-account wizard (before full onboarding). */
export async function saveSpecialistQuestionnaireProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: CreateAccountProfile
): Promise<ProfileUpsertResult> {
  const roleResult = await upsertUserRole(supabase, userId, "specialist");
  if (!roleResult.ok) return roleResult;

  const zip = profile.clientZipCode?.trim() ?? "";
  return upsertProfileRow(supabase, {
    user_id: userId,
    email: profile.email.trim().toLowerCase(),
    first_name: profile.firstName.trim(),
    last_name: profile.lastName.trim(),
    ...emptyProfileFields(),
    client_zip_code: zip,
    specialist_type: profile.specialistType?.trim() ?? "",
    specialist_city: profile.specialistCity?.trim() ?? "",
    specialist_neighborhood: profile.specialistNeighborhood?.trim() ?? "",
    specialist_format: profile.specialistFormat?.trim() ?? "",
    specialist_starting_price: profile.specialistStartingPrice?.trim() ?? "",
  });
}

export function appRoleToAuthRole(
  role: AppRole
): PublicAuthRole | "admin" | null {
  if (role === "client" || role === "specialist") return role;
  if (isAdminAppRole(role)) return "admin";
  return null;
}
