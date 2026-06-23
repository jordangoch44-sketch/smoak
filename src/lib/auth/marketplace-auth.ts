import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logAuth } from "@/lib/auth/auth-logger";
import {
  validateDevLogin,
  validateDevSignup,
  getDevSessionFields,
  PUBLIC_INVALID_LOGIN_MESSAGE,
} from "@/lib/dev-auth";
import {
  fetchProfileRow,
  fetchUserRoleRow,
  appRoleToAuthRole,
} from "@/lib/profiles/profile-service";
import type { AuthSession } from "@/types/auth";
import type { PublicAuthRole } from "@/types/auth-roles";
import type { AdminRoleType } from "@/types/admin-permissions";
import { isAdminAppRole } from "@/types/auth-roles";
import type { CreateAccountProfile } from "@/types/create-account";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import {
  saveClientSignupProfile,
  saveMinimalSignupProfile,
  saveSpecialistQuestionnaireProfile,
  saveSpecialistSignupProfile,
} from "@/lib/profiles/profile-service";

export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string }
  | { ok: "confirm_email"; email: string };

let clientSupabaseEnabled: boolean | null = null;

/** Set from SupabaseConfigProvider — fixes stale NEXT_PUBLIC_* in production LAN builds */
export function setClientSupabaseEnabled(enabled: boolean): void {
  clientSupabaseEnabled = enabled;
}

export function isMarketplaceSupabaseActive(): boolean {
  if (clientSupabaseEnabled === true) return true;
  if (clientSupabaseEnabled === false) return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function getMarketplaceAuthClient(): SupabaseClient | null {
  if (!isMarketplaceSupabaseActive()) return null;
  return createSupabaseBrowserClient();
}

function displayNameFromProfile(
  firstName: string,
  lastName: string,
  email: string
): string {
  const full = [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(" ");
  return full || email.split("@")[0] || email;
}

function greetingFirstName(firstName: string, email: string): string {
  const trimmed = firstName.trim();
  if (trimmed) return trimmed;
  return email.split("@")[0] || "there";
}

export async function buildAuthSessionFromSupabaseUser(
  supabase: SupabaseClient,
  user: User
): Promise<AuthSession | null> {
  const roleRow = await fetchUserRoleRow(supabase, user.id);
  if (!roleRow) return null;

  const authRole = appRoleToAuthRole(roleRow.role);
  if (!authRole) return null;

  const profile = await fetchProfileRow(supabase, user.id);
  const email = (user.email ?? profile?.email ?? "").trim().toLowerCase();
  const signedInAt = user.last_sign_in_at ?? new Date().toISOString();
  const firstName = profile?.first_name?.trim() ?? "";
  const clientZipCode = profile?.client_zip_code?.trim() ?? "";
  const clientCity = profile?.client_city?.trim() ?? "";

  const session: AuthSession = {
    userId: user.id,
    role: authRole,
    email,
    signedInAt,
    // Source of truth for dashboard greeting: profiles.first_name.
    // Do not fall back to email prefix when profiles.first_name is empty.
    firstName,
    clientZipCode,
    clientCity,
    isPremium: roleRow.is_premium,
    displayName: profile
      ? displayNameFromProfile(profile.first_name, profile.last_name, email)
      : displayNameFromProfile("", "", email),
  };

  if (authRole === "admin" && isAdminAppRole(roleRow.role)) {
    session.adminRole = roleRow.role as AdminRoleType;
  }

  return session;
}

export async function getCurrentMarketplaceSession(): Promise<AuthSession | null> {
  if (!isMarketplaceSupabaseActive()) {
    return null;
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return buildAuthSessionFromSupabaseUser(supabase, user);
}

async function persistSignupProfile(
  supabase: SupabaseClient,
  userId: string,
  role: PublicAuthRole,
  email: string,
  options?: {
    firstName?: string;
    lastName?: string;
    clientProfile?: CreateAccountProfile;
    specialistProfile?: CreateAccountProfile;
    specialistOnboarding?: SpecialistOnboardingState;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (role === "client" && options?.clientProfile) {
    const result = await saveClientSignupProfile(
      supabase,
      userId,
      options.clientProfile
    );
    return result.ok ? { ok: true } : result;
  }

  if (role === "specialist" && options?.specialistOnboarding) {
    const result = await saveSpecialistSignupProfile(
      supabase,
      userId,
      options.specialistOnboarding
    );
    return result.ok ? { ok: true } : result;
  }

  if (role === "specialist" && options?.specialistProfile) {
    const result = await saveSpecialistQuestionnaireProfile(
      supabase,
      userId,
      options.specialistProfile
    );
    return result.ok ? { ok: true } : result;
  }

  const result = await saveMinimalSignupProfile(supabase, userId, {
    email,
    firstName: options?.firstName ?? "",
    lastName: options?.lastName ?? "",
    role,
  });
  return result.ok ? { ok: true } : result;
}

export async function signInWithPassword(
  role: PublicAuthRole,
  email: string,
  password: string
): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!isMarketplaceSupabaseActive()) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        message:
          "Supabase auth is not active in this build. Run npm run build with .env.local set, then npm run start:lan.",
      };
    }
    const validated = validateDevLogin(role, trimmedEmail, password);
    if (!validated || validated === "admin") {
      return { ok: false, message: PUBLIC_INVALID_LOGIN_MESSAGE };
    }
    const devFields = getDevSessionFields(validated, trimmedEmail);
    return {
      ok: true,
      session: {
        userId: `dev-${trimmedEmail}`,
        role: validated,
        email: trimmedEmail,
        signedInAt: new Date().toISOString(),
        firstName: greetingFirstName("", trimmedEmail),
        ...devFields,
      },
    };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "Authentication client failed to initialize. Rebuild the app after setting Supabase env vars.",
    };
  }

  logAuth("signin.start", { role, email: trimmedEmail });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    logAuth("signin.failed", { message: error.message });
    return { ok: false, message: error.message };
  }

  const user = data.user;
  if (!user) {
    return { ok: false, message: PUBLIC_INVALID_LOGIN_MESSAGE };
  }

  const session = await buildAuthSessionFromSupabaseUser(supabase, user);
  if (!session) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: "Account setup is incomplete. Please contact support.",
    };
  }

  if (session.role !== role) {
    await supabase.auth.signOut();
    return { ok: false, message: PUBLIC_INVALID_LOGIN_MESSAGE };
  }

  logAuth("signin.success", { userId: user.id, role });
  return { ok: true, session };
}

export async function signUpWithPassword(
  role: PublicAuthRole,
  email: string,
  password: string,
  options?: {
    firstName?: string;
    lastName?: string;
    clientProfile?: CreateAccountProfile;
    specialistProfile?: CreateAccountProfile;
    specialistOnboarding?: SpecialistOnboardingState;
  }
): Promise<AuthResult & { userId?: string }> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!validateDevSignup(role, trimmedEmail, password)) {
    return {
      ok: false,
      message: "Enter a valid email and password (minimum 8 characters).",
    };
  }

  if (!isMarketplaceSupabaseActive()) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        message:
          "Supabase signup is not active in this build. Run npm run build with .env.local configured.",
      };
    }
    logAuth("signup.dev_fallback", { role, email: trimmedEmail });
    const devFields = getDevSessionFields(role, trimmedEmail);
    return {
      ok: true,
      session: {
        userId: `dev-${trimmedEmail}`,
        role,
        email: trimmedEmail,
        signedInAt: new Date().toISOString(),
        firstName: greetingFirstName(options?.firstName ?? "", trimmedEmail),
        ...devFields,
      },
      userId: `dev-${trimmedEmail}`,
    };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "Authentication client failed to initialize. Rebuild the app after setting Supabase env vars.",
    };
  }

  logAuth("signup.start", { role, email: trimmedEmail });

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        role,
        first_name: options?.firstName?.trim() ?? "",
        last_name: options?.lastName?.trim() ?? "",
      },
    },
  });

  if (error) {
    logAuth("signup.failed", { message: error.message });
    const message = /already registered|already exists/i.test(error.message)
      ? "An account with this email already exists. Try signing in."
      : error.message;
    return { ok: false, message };
  }

  const user = data.user;
  if (!user) {
    logAuth("signup.failed", { message: "no_user_returned" });
    return { ok: false, message: "Sign up failed — no user returned." };
  }

  logAuth("signup.auth_user_created", { userId: user.id, email: trimmedEmail });

  if (!data.session) {
    logAuth("signup.confirm_email", { userId: user.id, email: trimmedEmail });
    return { ok: "confirm_email", email: trimmedEmail };
  }

  const profileResult = await persistSignupProfile(
    supabase,
    user.id,
    role,
    trimmedEmail,
    options
  );

  if (!profileResult.ok) {
    logAuth("signup.profile_failed", {
      userId: user.id,
      message: profileResult.message,
    });
    await supabase.auth.signOut();
    return { ok: false, message: profileResult.message };
  }

  const session = await buildAuthSessionFromSupabaseUser(supabase, user);
  if (!session || session.role !== role) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: "Account created but role setup failed. Contact support.",
    };
  }

  logAuth("signup.success", { userId: user.id, email: trimmedEmail, role });
  return { ok: true, session, userId: user.id };
}

export async function signOutMarketplace(): Promise<void> {
  if (!isMarketplaceSupabaseActive()) return;
  const supabase = getMarketplaceAuthClient();
  if (supabase) {
    await supabase.auth.signOut();
    logAuth("signout");
  }
}

export async function resetPasswordForEmail(email: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) {
    return { ok: false, message: "Enter your email address." };
  }

  if (!isMarketplaceSupabaseActive()) {
    return {
      ok: false,
      message: "Password reset requires Supabase. Configure .env.local first.",
    };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const redirectTo = `${siteUrl.replace(/\/$/, "")}/login/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
  };
}

export async function updatePassword(newPassword: string): Promise<{
  ok: boolean;
  message: string;
}> {
  if (newPassword.trim().length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  if (!isMarketplaceSupabaseActive()) {
    return { ok: false, message: "Password reset requires Supabase." };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Password updated. You can sign in now." };
}

export async function signInAdminWithPassword(
  adminRole: AdminRoleType,
  email: string,
  password: string
): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!isMarketplaceSupabaseActive()) {
    return { ok: false, message: "Configure Supabase for admin sign-in." };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const user = data.user;
  if (!user) {
    return { ok: false, message: "Sign-in failed. Check your email and password." };
  }

  const roleRow = await fetchUserRoleRow(supabase, user.id);
  if (!roleRow || !isAdminAppRole(roleRow.role) || roleRow.role !== adminRole) {
    await supabase.auth.signOut();
    return { ok: false, message: "Sign-in failed. Check your email and password." };
  }

  const profile = await fetchProfileRow(supabase, user.id);
  const session = await buildAuthSessionFromSupabaseUser(supabase, user);
  if (!session || session.role !== "admin") {
    await supabase.auth.signOut();
    return { ok: false, message: "Sign-in failed. Check your email and password." };
  }

  return {
    ok: true,
    session: {
      ...session,
      adminRole: roleRow.role,
      displayName: profile
        ? displayNameFromProfile(
            profile.first_name,
            profile.last_name,
            trimmedEmail
          )
        : session.displayName,
    },
  };
}

export async function signOutAdmin(): Promise<void> {
  await signOutMarketplace();
}
