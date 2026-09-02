import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logAuth } from "@/lib/auth/auth-logger";
import {
  validateDevLoginDetailed,
  validateDevSignup,
  getDevSessionFields,
  PUBLIC_INVALID_LOGIN_MESSAGE,
} from "@/lib/dev-auth";
import {
  fetchProfileRow,
  fetchUserRoleRow,
  appRoleToAuthRole,
  saveClientSignupProfile,
  saveMinimalSignupProfile,
  saveSpecialistQuestionnaireProfile,
  saveSpecialistSignupProfile,
} from "@/lib/profiles/profile-service";
import { resolveAvatarUrlFromProfile } from "@/lib/profiles/profile-avatar";
import type { AuthRole, AuthSession } from "@/types/auth";
import type { PublicAuthRole } from "@/types/auth-roles";
import type { AdminRoleType } from "@/types/admin-permissions";
import { isAdminAppRole } from "@/types/auth-roles";
import {
  clearPendingMarketplaceSignup,
  peekPendingMarketplaceSignupForEmail,
  writePendingMarketplaceSignup,
} from "@/lib/auth/pending-marketplace-signup";
import type { CreateAccountProfile } from "@/types/create-account";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import {
  AUTH_SITE_ORIGIN_ERROR,
  getAuthCallbackUrl,
  getAuthSiteOrigin,
} from "@/lib/auth/site-origin";
import { updatePasswordSetupStatus } from "@/lib/auth/password-setup-status";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { resetAuthSessionCache, setAuthSession } from "@/lib/auth-session-store";
import { clearAuthClientState } from "@/lib/auth/clear-auth-client-state";
import { clearSavedTrainersActiveSession } from "@/lib/saved-trainers-store";

function marketplaceSignupRedirectTo(role: PublicAuthRole): string | null {
  const next = getDashboardPathForRole(role);
  return getAuthCallbackUrl(next);
}

export type AuthResult =
  | { ok: true; session: AuthSession }
  | {
      ok: false;
      message: string;
      reason?: "role_mismatch" | "invalid_credentials" | "other";
      expectedRole?: PublicAuthRole;
      actualRole?: AuthRole;
    }
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
  email: string,
  displayName?: string
): string {
  const explicit = displayName?.trim() ?? "";
  if (explicit) return explicit;
  const full = [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(" ");
  return full || email.split("@")[0] || email;
}

function greetingFirstName(firstName: string, email: string): string {
  const trimmed = firstName.trim();
  if (trimmed) return trimmed;
  return email.split("@")[0] || "there";
}

async function resolveSpecialistMembershipPlan(
  supabase: SupabaseClient,
  userId: string,
  isPremium: boolean
): Promise<"free" | "premium" | "platinum"> {
  const { data: billing } = await supabase
    .from("specialist_billing")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  if (billing?.plan === "platinum" || billing?.plan === "premium") {
    return billing.plan;
  }
  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select("membership_plan")
    .eq("user_id", userId)
    .maybeSingle();
  if (
    profile?.membership_plan === "platinum" ||
    profile?.membership_plan === "premium"
  ) {
    return profile.membership_plan;
  }
  return isPremium ? "premium" : "free";
}

export async function buildAuthSessionFromSupabaseUser(
  supabase: SupabaseClient,
  user: User
): Promise<AuthSession | null> {
  const roleRow = await fetchUserRoleRow(supabase, user.id);
  if (!roleRow) return null;

  const authRole = appRoleToAuthRole(roleRow.role);
  if (!authRole) return null;

  let isPremium = roleRow.is_premium;
  let premiumIsPaid = false;
  let premiumTrialUsed = false;
  let premiumTrialEndsAt: string | undefined;
  let premiumTrialActive = false;
  let premiumTrialDaysRemaining: number | undefined;
  let premiumTrialJustEnded = false;

  if (authRole === "specialist") {
    const { resolveAndSyncSpecialistPremiumAccess } = await import(
      "@/lib/specialist-premium-trial"
    );
    const access = await resolveAndSyncSpecialistPremiumAccess(
      supabase,
      user.id
    );
    isPremium = access.isPremium;
    premiumIsPaid = access.isPaid;
    premiumTrialUsed = Boolean(access.trialStartedAt);
    premiumTrialEndsAt = access.trialEndsAt ?? undefined;
    premiumTrialActive = access.isTrialing;
    premiumTrialDaysRemaining = access.daysRemaining ?? undefined;
    premiumTrialJustEnded = access.trialJustEnded;
  }

  const profile = await fetchProfileRow(supabase, user.id);
  const email = (user.email ?? profile?.email ?? "").trim().toLowerCase();
  /* Prefer stable timestamps — never Date.now() (churns session signature). */
  const signedInAt =
    user.last_sign_in_at ?? user.created_at ?? "1970-01-01T00:00:00.000Z";
  const firstName = profile?.first_name?.trim() ?? "";
  const clientZipCode = profile?.client_zip_code?.trim() ?? "";
  const clientCity = profile?.client_city?.trim() ?? "";
  const avatarUrl = resolveAvatarUrlFromProfile(profile);

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
    avatarUrl,
    profileCompletionStatus:
      profile?.profile_completion_status?.trim() || undefined,
    passwordSetupStatus:
      profile?.password_setup_status?.trim() || undefined,
    isPremium,
    membershipPlan:
      authRole === "specialist"
        ? await resolveSpecialistMembershipPlan(supabase, user.id, isPremium)
        : undefined,
    premiumIsPaid,
    premiumTrialUsed,
    premiumTrialEndsAt,
    premiumTrialActive,
    premiumTrialDaysRemaining,
    premiumTrialJustEnded,
    displayName: profile
      ? displayNameFromProfile(
          profile.first_name,
          profile.last_name,
          email,
          profile.display_name
        )
      : displayNameFromProfile("", "", email),
  };

  if (authRole === "admin" && isAdminAppRole(roleRow.role)) {
    session.adminRole = roleRow.role as AdminRoleType;
  }

  return session;
}

const SESSION_LOOKUP_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export type MarketplaceSessionLookup =
  | { status: "signed_out" }
  | { status: "ok"; session: AuthSession }
  | { status: "transient_error"; message: string };

/**
 * Resolve the current Supabase user into an AuthSession.
 * Distinguishes signed-out from transient role/profile failures so callers
 * do not wipe a valid session on temporary network/DB errors.
 */
export async function lookupMarketplaceSession(): Promise<MarketplaceSessionLookup> {
  if (!isMarketplaceSupabaseActive()) {
    return { status: "signed_out" };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) return { status: "signed_out" };

  try {
    const {
      data: { user },
      error,
    } = await withTimeout(
      supabase.auth.getUser(),
      SESSION_LOOKUP_TIMEOUT_MS,
      "getUser"
    );

    if (error || !user) return { status: "signed_out" };

    const session = await withTimeout(
      buildAuthSessionFromSupabaseUser(supabase, user),
      SESSION_LOOKUP_TIMEOUT_MS,
      "buildAuthSession"
    );

    if (!session) {
      return {
        status: "transient_error",
        message: "Account profile is still syncing. Try again shortly.",
      };
    }

    return { status: "ok", session };
  } catch (error) {
    return {
      status: "transient_error",
      message:
        error instanceof Error ? error.message : "Session lookup failed",
    };
  }
}

export async function getCurrentMarketplaceSession(): Promise<AuthSession | null> {
  const result = await lookupMarketplaceSession();
  if (result.status === "ok") return result.session;
  return null;
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

/**
 * Completes profiles/roles after email confirmation when the first session
 * arrives without a prior successful persistSignupProfile call.
 */
export async function ensureMarketplaceSignupProfile(
  supabase: SupabaseClient,
  user: User,
  expectedRole?: PublicAuthRole
): Promise<AuthSession | null> {
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return null;

  const pending = peekPendingMarketplaceSignupForEmail(email);
  const metaRole = String(user.user_metadata?.role ?? "").trim();
  const roleCandidate = expectedRole ?? pending?.role ?? metaRole;
  if (roleCandidate !== "client" && roleCandidate !== "specialist") {
    return null;
  }
  const role = roleCandidate;

  const existingRole = await fetchUserRoleRow(supabase, user.id);
  if (!existingRole) {
    let specialistOnboarding: SpecialistOnboardingState | undefined;
    if (role === "specialist" && typeof window !== "undefined") {
      try {
        const { loadSpecialistOnboardingDraft } = await import(
          "@/lib/specialist-application-storage"
        );
        specialistOnboarding = loadSpecialistOnboardingDraft() ?? undefined;
      } catch {
        specialistOnboarding = undefined;
      }
    }

    const profileResult = await persistSignupProfile(
      supabase,
      user.id,
      role,
      email,
      {
        firstName:
          pending?.firstName ??
          String(user.user_metadata?.first_name ?? "").trim() ??
          "",
        lastName:
          pending?.lastName ??
          String(user.user_metadata?.last_name ?? "").trim() ??
          "",
        clientProfile: pending?.clientProfile,
        specialistProfile: pending?.specialistProfile,
        specialistOnboarding,
      }
    );
    if (!profileResult.ok) {
      logAuth("signup.ensure_profile_failed", {
        userId: user.id,
        message: profileResult.message,
      });
      return null;
    }

    if (role === "client") {
      const { sendClientWelcomeEmail } = await import(
        "@/lib/email/confirmation-email-service"
      );
      void sendClientWelcomeEmail({
        to: email,
        firstName:
          pending?.firstName ??
          String(user.user_metadata?.first_name ?? "").trim() ??
          "",
      });
    }
  }

  return buildAuthSessionFromSupabaseUser(supabase, user);
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
    const devResult = validateDevLoginDetailed(role, trimmedEmail, password);
    if (devResult.status === "role_mismatch") {
      const message =
        role === "specialist" && devResult.actualRole === "client"
          ? "This email is registered as a client account. Please log in with specialist credentials, switch to client login, or apply as a specialist."
          : role === "client" && devResult.actualRole === "specialist"
          ? "This email is registered as a specialist account. Please log in with client credentials, switch to specialist login, or create a client account."
          : devResult.actualRole === "admin"
          ? "This email is registered as an admin account. Please use the admin portal to sign in."
          : "The selected account type does not match your credentials.";

      return {
        ok: false,
        reason: "role_mismatch",
        expectedRole: role,
        actualRole: devResult.actualRole,
        message,
      };
    }
    if (devResult.status !== "ok" || devResult.role === "admin") {
      return { ok: false, message: PUBLIC_INVALID_LOGIN_MESSAGE };
    }
    const validated = devResult.role;
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

  let session = await buildAuthSessionFromSupabaseUser(supabase, user);
  if (!session) {
    const recovered = await ensureMarketplaceSignupProfile(supabase, user, role);
    if (recovered) {
      logAuth("signin.recovered_incomplete_signup", {
        userId: user.id,
        requestedRole: role,
        actualRole: recovered.role,
      });
      if (!peekPendingMarketplaceSignupForEmail(trimmedEmail)?.submitSpecialistApplication) {
        clearPendingMarketplaceSignup();
      }
      session = recovered;
    } else {
      await supabase.auth.signOut({ scope: "local" });
      return {
        ok: false,
        message: "Account setup is incomplete. Please contact support.",
      };
    }
  }

  /* Role enforcement */
  if (session.role !== role) {
    logAuth("signin.role_mismatch_rejected", {
      userId: user.id,
      requestedRole: role,
      actualRole: session.role,
    });
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
    clearAuthClientState();
    clearSavedTrainersActiveSession();
    resetAuthSessionCache();
    setAuthSession(null);

    const message =
      role === "specialist" && session.role === "client"
        ? "This email is registered as a client account. Please log in with specialist credentials, switch to client login, or apply as a specialist."
        : role === "client" && session.role === "specialist"
        ? "This email is registered as a specialist account. Please log in with client credentials, switch to specialist login, or create a client account."
        : session.role === "admin"
        ? "This email is registered as an admin account. Please use the admin portal to sign in."
        : "The selected account type does not match your credentials.";

    return {
      ok: false,
      reason: "role_mismatch",
      expectedRole: role,
      actualRole: session.role,
      message,
    };
  }

  /* Finish role/profile if pending payload exists (email-confirm path).
   * Keep pending when a specialist application still needs submitting. */
  const pending = peekPendingMarketplaceSignupForEmail(trimmedEmail);
  if (pending) {
    const profileRole: PublicAuthRole =
      session.role === "specialist" || session.role === "client"
        ? session.role
        : role;
    await ensureMarketplaceSignupProfile(supabase, user, profileRole);
    if (!pending.submitSpecialistApplication) {
      clearPendingMarketplaceSignup();
    }
  }

  logAuth("signin.success", { userId: user.id, role: session.role });
  return { ok: true, session };
}

export type MagicLinkLoginResult =
  | { ok: true; email: string; message: string }
  | { ok: false; message: string };

/** Post-auth landing path for magic-link login from /login. */
export function resolveMagicLinkLoginNextPath(
  role: PublicAuthRole,
  returnToSaved: boolean
): string {
  if (returnToSaved && role === "client") return "/saved";
  return getDashboardPathForRole(role);
}

/** Passwordless sign-in for existing accounts — does not create new users. */
export async function sendMagicLinkForLogin(params: {
  email: string;
  role: PublicAuthRole;
  returnToSaved?: boolean;
}): Promise<MagicLinkLoginResult> {
  const trimmedEmail = params.email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (!isMarketplaceSupabaseActive()) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        message:
          "Magic-link sign-in requires Supabase. Configure .env.local and rebuild.",
      };
    }
    return {
      ok: false,
      message: "Magic-link sign-in is not available without Supabase.",
    };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const nextPath = resolveMagicLinkLoginNextPath(
    params.role,
    params.returnToSaved ?? false
  );
  const emailRedirectTo = getAuthCallbackUrl(nextPath);
  if (!emailRedirectTo) {
    return { ok: false, message: AUTH_SITE_ORIGIN_ERROR };
  }

  logAuth("magic_link_login.start", {
    email: trimmedEmail,
    role: params.role,
    nextPath,
    emailRedirectTo,
  });

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
      data: { role: params.role },
    },
  });

  if (error) {
    logAuth("magic_link_login.failed", { message: error.message });

    if (
      /signups?.*not allowed|user not found|invalid login|not found/i.test(
        error.message
      )
    ) {
      return {
        ok: false,
        message:
          "No account found for that email. Create an account or sign in with a password.",
      };
    }

    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    email: trimmedEmail,
    message: "If an account exists for that email, a sign-in link has been sent.",
  };
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
    /** Override confirm-email / magic-link return URL */
    emailRedirectTo?: string;
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

  const emailRedirectTo =
    options?.emailRedirectTo ?? marketplaceSignupRedirectTo(role);
  if (!emailRedirectTo) {
    return { ok: false, message: AUTH_SITE_ORIGIN_ERROR };
  }

  logAuth("signup.start", { role, email: trimmedEmail });

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      emailRedirectTo,
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

  /* Persist pending payload so confirm-email → first login can finish setup */
  writePendingMarketplaceSignup({
    role,
    email: trimmedEmail,
    firstName: options?.firstName,
    lastName: options?.lastName,
    clientProfile: options?.clientProfile,
    specialistProfile: options?.specialistProfile,
    submitSpecialistApplication: role === "specialist" && Boolean(options?.specialistOnboarding),
  });

  if (!data.session) {
    logAuth("signup.confirm_email", { userId: user.id, email: trimmedEmail });
    return { ok: "confirm_email", email: trimmedEmail, userId: user.id };
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

  clearPendingMarketplaceSignup();

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
  if (!supabase) return;

  try {
    await withTimeout(
      supabase.auth.signOut({ scope: "local" }),
      8_000,
      "signOut"
    );
    logAuth("signout");
  } catch (error) {
    logAuth("signout.failed", {
      message: error instanceof Error ? error.message : "signOut failed",
    });
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* best-effort */
    }
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

  const siteUrl = getAuthSiteOrigin();
  if (!siteUrl) {
    return { ok: false, message: AUTH_SITE_ORIGIN_ERROR };
  }
  const redirectTo = `${siteUrl}/login/reset-password`;

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

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: { password_setup_status: "complete" },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await updatePasswordSetupStatus(supabase, user.id, "complete");
  }

  return { ok: true, message: "Password saved." };
}

export async function updateAuthEmail(newEmail: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const trimmed = newEmail.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (!isMarketplaceSupabaseActive()) {
    return { ok: false, message: "Email updates require Supabase." };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const current = (user?.email ?? "").trim().toLowerCase();
  if (current && current === trimmed) {
    return { ok: false, message: "That is already your email address." };
  }

  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message:
      "Check your new inbox to confirm the email change. Your current email stays active until then.",
  };
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
            trimmedEmail,
            profile.display_name
          )
        : session.displayName,
    },
  };
}

export async function signOutAdmin(): Promise<void> {
  await signOutMarketplace();
}
