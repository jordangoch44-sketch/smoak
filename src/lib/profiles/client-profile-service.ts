import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAuthSessionSnapshot,
  setAuthSession,
} from "@/lib/auth-session-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchProfileRow,
  upsertUserRole,
} from "@/lib/profiles/profile-service";
import {
  isClientProfileMinimumComplete,
  profileRowToClientFormState,
} from "@/lib/profiles/client-profile-form";
import { resolveAvatarUrlFromProfile } from "@/lib/profiles/profile-avatar";
import type {
  ClientProfileFormState,
  ClientProfileSaveInput,
  ClientProfileSaveResult,
} from "@/types/client-profile";
import type { ProfileRow } from "@/types/database";

function displayNameFromParts(
  displayName: string,
  firstName: string,
  lastName: string,
  email: string
): string {
  const explicit = displayName.trim();
  if (explicit) return explicit;
  const combined = `${firstName.trim()} ${lastName.trim()}`.trim();
  if (combined) return combined;
  return email.split("@")[0]?.trim() || email;
}

/** Patch shared auth session so dashboard + bottom nav update without refresh. */
export function patchAuthSessionFromClientProfile(input: {
  firstName: string;
  lastName: string;
  displayName: string;
  postalCode: string;
  city: string;
  avatarUrl: string;
  profileCompleted: boolean;
  email?: string;
}): void {
  const session = getAuthSessionSnapshot();
  if (!session) return;

  const email = (input.email ?? session.email).trim().toLowerCase() || session.email;
  setAuthSession({
    ...session,
    email,
    firstName: input.firstName.trim(),
    clientZipCode: input.postalCode.trim() || undefined,
    clientCity: input.city.trim() || undefined,
    avatarUrl: input.avatarUrl.trim() || undefined,
    profileCompletionStatus: input.profileCompleted ? "complete" : "incomplete",
    displayName: displayNameFromParts(
      input.displayName,
      input.firstName,
      input.lastName,
      email
    ),
  });
}

export async function loadClientProfileFormState(
  userId: string,
  authEmail: string
): Promise<ClientProfileFormState> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return profileRowToClientFormState(null, authEmail);
  }

  const profile = await fetchProfileRow(supabase, userId);
  return profileRowToClientFormState(profile, authEmail);
}

/**
 * Ensure a profiles + client role row exists for the signed-in user.
 * Uses maybeSingle-style fetch; safe when the row is missing.
 */
export async function ensureClientProfileRow(
  supabase: SupabaseClient,
  params: { userId: string; email: string; firstName?: string }
): Promise<ProfileRow | null> {
  const existing = await fetchProfileRow(supabase, params.userId);
  if (existing) return existing;

  const roleResult = await upsertUserRole(supabase, params.userId, "client");
  if (!roleResult.ok) {
    console.error("[client-profile] ensure role", roleResult.message);
    return null;
  }

  const email = params.email.trim().toLowerCase();
  if (!email) {
    console.error("[client-profile] refuse to create profile without email");
    return null;
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: params.userId,
      email,
      first_name: params.firstName?.trim() ?? "",
      last_name: "",
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
      profile_completion_status: "incomplete",
      account_source: "client_profile_editor",
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[client-profile] ensure upsert", error.message);
    return null;
  }

  return fetchProfileRow(supabase, params.userId);
}

export async function saveClientProfile(
  userId: string,
  input: ClientProfileSaveInput
): Promise<ClientProfileSaveResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured.", section: "profile" };
  }

  const authEmail = input.email.trim().toLowerCase();
  if (!authEmail) {
    console.error("[client-profile] blocked blank email save");
    return {
      ok: false,
      message: "Your account email is required and cannot be removed.",
      section: "email",
    };
  }

  const profileCompleted = isClientProfileMinimumComplete({
    firstName: input.firstName,
    postalCode: input.postalCode,
    city: input.city,
    goals: input.goals,
  });

  const payload: Record<string, unknown> = {
    user_id: userId,
    email: authEmail,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    display_name: input.displayName.trim(),
    phone: input.phone.trim(),
    client_zip_code: input.postalCode.trim(),
    client_city: input.city.trim(),
    client_state: input.state.trim(),
    avatar_url: input.avatarUrl.trim(),
    avatar_path: input.avatarPath.trim(),
    client_goals: input.goals,
    preferred_radius_miles: input.preferredRadiusMiles,
    preferred_price_min: input.preferredPriceMin,
    preferred_price_max: input.preferredPriceMax,
    client_budget: input.clientBudgetLabel.trim(),
    preferred_professions: input.preferredProfessions,
    preferred_specialties: input.preferredSpecialties,
    preferred_gender: input.preferredGender.trim(),
    preferred_session_format: input.preferredSessionFormat.trim(),
    client_training_style: input.preferredSessionFormat.trim(),
    profile_completion_status: profileCompleted ? "complete" : "incomplete",
  };

  let { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" });

  /* Graceful fallback when migration has not been applied yet. */
  if (
    error &&
    /42703|column.*does not exist|PGRST204/i.test(error.message)
  ) {
    const legacy = {
      user_id: userId,
      email: authEmail,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      avatar_url: input.avatarUrl.trim(),
      client_goals: input.goals,
      client_city: input.city.trim(),
      client_zip_code: input.postalCode.trim(),
      client_budget: input.clientBudgetLabel.trim(),
      client_training_style: input.preferredSessionFormat.trim(),
      profile_completion_status: profileCompleted ? "complete" : "incomplete",
    };
    const retry = await supabase
      .from("profiles")
      .upsert(legacy, { onConflict: "user_id" });
    error = retry.error;
  }

  if (error) {
    return { ok: false, message: error.message, section: "profile" };
  }

  patchAuthSessionFromClientProfile({
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: input.displayName,
    postalCode: input.postalCode,
    city: input.city,
    avatarUrl: input.avatarUrl,
    profileCompleted,
    email: authEmail,
  });

  return { ok: true, profileCompleted };
}

/** Refresh avatar fields on session after upload/remove without full profile save. */
export async function syncClientAvatarToProfile(
  userId: string,
  avatar: { path: string; publicUrl: string; displayUrl?: string }
): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const stableUrl = avatar.publicUrl.split("?")[0] ?? avatar.publicUrl;
  const payload = {
    avatar_path: avatar.path,
    avatar_url: stableUrl,
  };

  console.info("[avatars:profile_update]", {
    userId,
    path: avatar.path,
    publicUrl: stableUrl,
    payload,
  });

  let { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id, avatar_url, avatar_path")
    .maybeSingle();

  console.info("[avatars:profile_update:response]", {
    data,
    error: error
      ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      : null,
  });

  if (
    error &&
    /42703|column.*does not exist|PGRST204/i.test(error.message)
  ) {
    console.warn(
      "[avatars:profile_update] retrying without avatar_path (legacy schema)"
    );
    const retry = await supabase
      .from("profiles")
      .update({ avatar_url: stableUrl })
      .eq("user_id", userId)
      .select("user_id, avatar_url")
      .maybeSingle();
    error = retry.error;
    data = retry.data as typeof data;
    console.info("[avatars:profile_update:retry]", {
      data,
      error: error
        ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        : null,
    });
  }

  if (error) {
    return {
      ok: false,
      message: error.message,
      code: error.code,
    };
  }

  if (!data) {
    return {
      ok: false,
      message:
        "Profile update returned no row. Check that a profiles row exists for this user and RLS allows update.",
    };
  }

  console.info("[avatars:session_refresh]", {
    displayUrl: avatar.displayUrl || stableUrl,
  });

  const session = getAuthSessionSnapshot();
  if (session) {
    setAuthSession({
      ...session,
      avatarUrl: (avatar.displayUrl || stableUrl) || undefined,
    });
  }

  return { ok: true };
}

export async function clearClientAvatarOnProfile(
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured." };
  }

  let { error } = await supabase
    .from("profiles")
    .update({ avatar_path: "", avatar_url: "" })
    .eq("user_id", userId);

  if (
    error &&
    /42703|column.*does not exist|PGRST204/i.test(error.message)
  ) {
    const retry = await supabase
      .from("profiles")
      .update({ avatar_url: "" })
      .eq("user_id", userId);
    error = retry.error;
  }

  if (error) {
    return { ok: false, message: error.message };
  }

  const session = getAuthSessionSnapshot();
  if (session) {
    setAuthSession({
      ...session,
      avatarUrl: undefined,
    });
  }

  return { ok: true };
}

export function resolveClientAvatarPreview(
  profile: ProfileRow | null,
  formAvatarUrl: string
): string {
  const fromForm = formAvatarUrl.trim();
  if (fromForm) return fromForm;
  return resolveAvatarUrlFromProfile(profile) ?? "";
}
