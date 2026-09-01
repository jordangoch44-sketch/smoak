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

/** Lean columns for auth/session — skip bulky onboarding_data (embedded photos). */
const PROFILE_SESSION_COLUMNS = [
  "user_id",
  "email",
  "first_name",
  "last_name",
  "display_name",
  /* Skip avatar_url — legacy rows may store multi‑MB data URLs that time out on mobile */
  "avatar_path",
  "client_city",
  "client_zip_code",
  "profile_completion_status",
  "password_setup_status",
].join(", ");

/**
 * Full client profile editor columns — must include goals, budget, radius, etc.
 * Do not reuse PROFILE_SESSION_COLUMNS here or edits appear not to save.
 */
export const CLIENT_PROFILE_EDITOR_COLUMNS = [
  "user_id",
  "email",
  "first_name",
  "last_name",
  "display_name",
  "phone",
  "avatar_url",
  "avatar_path",
  "client_goals",
  "client_city",
  "client_neighborhood",
  "client_zip_code",
  "client_state",
  "client_budget",
  "client_training_style",
  "preferred_radius_miles",
  "preferred_price_min",
  "preferred_price_max",
  "preferred_professions",
  "preferred_specialties",
  "preferred_gender",
  "preferred_session_format",
  "profile_completion_status",
  "password_setup_status",
].join(", ");

/** Lean subset when preference columns are not migrated yet. */
const CLIENT_PROFILE_EDITOR_COLUMNS_LEGACY = [
  "user_id",
  "email",
  "first_name",
  "last_name",
  "avatar_url",
  "client_goals",
  "client_city",
  "client_neighborhood",
  "client_zip_code",
  "client_budget",
  "client_training_style",
  "profile_completion_status",
  "password_setup_status",
].join(", ");

function isInlineDataUrl(value: string): boolean {
  return value.trim().toLowerCase().startsWith("data:");
}

/** Prefer http(s) avatars only — data URLs blow up profile rows and time out on mobile. */
function publicAvatarUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || isInlineDataUrl(trimmed)) return "";
  return trimmed;
}

/**
 * Persist onboarding metadata without embedding multi‑MB data-URL photos.
 * Photos belong in Storage / https avatar_url, not jsonb.
 */
function specialistOnboardingForStorage(
  state: SpecialistOnboardingState
): Record<string, unknown> {
  const media = { ...state.media };
  if (isInlineDataUrl(media.profilePhotoUrl ?? "")) {
    media.profilePhotoUrl = "";
  }
  if (isInlineDataUrl(media.profilePhotoOriginalUrl ?? "")) {
    media.profilePhotoOriginalUrl = "";
  }
  return {
    ...state,
    password: "",
    media,
  };
}

function logProfileFetchIssue(label: string, message: string): void {
  /* warn — Next.js error overlay treats console.error as a blocking "Issue" on mobile */
  console.warn(`[profiles] ${label}`, message);
}

/** Columns that exist on public.profiles — role lives in user_roles only. */
type ProfileUpsertPayload = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
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
  profile_completion_status?: string;
  account_source?: string;
  password_setup_status?: string;
};

function emptyProfileFields(): Omit<
  ProfileUpsertPayload,
  "user_id" | "email" | "first_name" | "last_name"
> {
  return {
    avatar_url: "",
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
    const { onboarding_data: _onboarding, ...rest } = payload;
    logAuth("profiles.upsert_payload", {
      ...rest,
      onboarding_data: _onboarding ? "[omitted]" : null,
    });
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

  if (
    error &&
    /password_setup_status|42703|column.*does not exist|PGRST204/i.test(
      error.message
    ) &&
    "password_setup_status" in payload
  ) {
    const rest = { ...payload };
    delete rest.password_setup_status;
    const retry = await supabase
      .from("profiles")
      .upsert(rest, { onConflict: "user_id" });
    if (retry.error) {
      return { ok: false, message: retry.error.message };
    }
    return { ok: true };
  }

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
    logProfileFetchIssue("fetchUserRoleRow", error.message);
    return null;
  }

  return data as UserRoleRow | null;
}

/**
 * Lean profile fetch for auth/session (no onboarding_data blob).
 * Avoids statement timeouts when specialist photos were stored as data URLs.
 */
export async function fetchProfileRow(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SESSION_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logProfileFetchIssue("fetchProfileRow", error.message);
    return null;
  }

  if (!data) return null;

  return data as unknown as ProfileRow;
}

/**
 * Full profile row for the client account editor (goals, budget, radius, etc.).
 */
export async function fetchClientProfileEditorRow(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileRow | null> {
  const primary = await supabase
    .from("profiles")
    .select(CLIENT_PROFILE_EDITOR_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (
    primary.error &&
    /42703|column.*does not exist|PGRST204/i.test(primary.error.message)
  ) {
    const legacy = await supabase
      .from("profiles")
      .select(CLIENT_PROFILE_EDITOR_COLUMNS_LEGACY)
      .eq("user_id", userId)
      .maybeSingle();
    if (legacy.error) {
      logProfileFetchIssue(
        "fetchClientProfileEditorRow.legacy",
        legacy.error.message
      );
      return null;
    }
    return (legacy.data as unknown as ProfileRow) ?? null;
  }

  if (primary.error) {
    logProfileFetchIssue("fetchClientProfileEditorRow", primary.error.message);
    return null;
  }

  return (primary.data as unknown as ProfileRow) ?? null;
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

  /* Pro trial starts on admin activate — not signup — so pending days don't burn the trial */

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
    password_setup_status: "complete",
  });
}

/**
 * Lightweight client from specialist inquiry — incomplete profile, no questionnaire.
 * Safe to call repeatedly after magic-link / OTP verification.
 */
export async function saveInquiryClientProfile(
  supabase: SupabaseClient,
  userId: string,
  params: {
    email: string;
    firstName: string;
    accountSource?: string;
  }
): Promise<ProfileUpsertResult> {
  const existing = await fetchProfileRow(supabase, userId);
  const roleResult = await upsertUserRole(supabase, userId, "client");
  if (!roleResult.ok) return roleResult;

  const firstName =
    params.firstName.trim() || existing?.first_name?.trim() || "";
  const email =
    params.email.trim().toLowerCase() || existing?.email?.trim().toLowerCase() || "";

  if (existing) {
    const nextFirst = existing.first_name.trim() || firstName;
    const existingSource =
      typeof existing.account_source === "string"
        ? existing.account_source.trim()
        : "";
    const existingStatus =
      typeof existing.profile_completion_status === "string"
        ? existing.profile_completion_status.trim()
        : "";
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: nextFirst,
        email: email || existing.email,
        account_source:
          existingSource || params.accountSource || "specialist_inquiry",
        profile_completion_status: existingStatus || "incomplete",
      })
      .eq("user_id", userId);

    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  return upsertProfileRow(supabase, {
    user_id: userId,
    email,
    first_name: firstName,
    last_name: "",
    ...emptyProfileFields(),
    profile_completion_status: "incomplete",
    password_setup_status: "pending",
    account_source: params.accountSource ?? "specialist_inquiry",
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

  const avatarUrl = publicAvatarUrl(state.media?.profilePhotoUrl);

  return upsertProfileRow(supabase, {
    user_id: userId,
    email: trimmedEmail,
    first_name: firstName,
    last_name: lastName,
    ...emptyProfileFields(),
    avatar_url: avatarUrl,
    client_zip_code: zip,
    specialist_type: state.professionalType?.trim() ?? "",
    specialist_city: state.city?.trim() ?? "",
    specialist_neighborhood: state.neighborhood?.trim() ?? "",
    specialist_format: state.serviceType?.trim() ?? "",
    specialist_starting_price:
      state.pricing?.oneOnOnePrice?.trim() ||
      state.pricing?.onlineCoachingPrice?.trim() ||
      "",
    onboarding_data: specialistOnboardingForStorage(state),
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
