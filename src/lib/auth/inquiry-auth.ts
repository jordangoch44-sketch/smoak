import {
  buildAuthSessionFromSupabaseUser,
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
  signInWithPassword,
  signUpWithPassword,
  type AuthResult,
} from "@/lib/auth/marketplace-auth";
import { logAuth } from "@/lib/auth/auth-logger";
import { saveInquiryClientProfile } from "@/lib/profiles/profile-service";
import {
  readPendingInquirySignup,
  writePendingInquirySignup,
  clearPendingInquirySignup,
  setInquiryAutoSendFlag,
  setSaveAutoApplyFlag,
  peekInquiryAutoSendFlag,
  peekSaveAutoApplyFlag,
  type QuickAccountSource,
} from "@/lib/inquiry/inquiry-session-flags";
import type { AuthSession } from "@/types/auth";
import {
  AUTH_SITE_ORIGIN_ERROR,
  getAuthCallbackUrl,
} from "@/lib/auth/site-origin";
import { buildCompleteAccountNextPath } from "@/lib/auth/account-setup";

export type QuickClientAuthResult =
  | { ok: true; session: AuthSession; mode: "session" }
  | { ok: "email_sent"; email: string }
  | { ok: false; message: string; code?: "existing_account" };

export const QUICK_CLIENT_PASSWORD_MIN_LENGTH = 8;
export const QUICK_CLIENT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function existingAccountMessage(source: QuickAccountSource): string {
  if (source === "saved_specialist") {
    return "This email already has an account. Log in to save this specialist.";
  }
  if (source === "account_menu") {
    return "This email already has an account. Log in to continue.";
  }
  return "This email already has an account. Sign in to send your message.";
}

function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  return local.replace(/[._+-]+/g, " ").slice(0, 40) || "there";
}

function mapPasswordSignupResult(
  result: AuthResult & { userId?: string },
  email: string,
  alreadyMsg: string
): QuickClientAuthResult {
  if (result.ok === true) {
    return { ok: true, session: result.session, mode: "session" };
  }
  if (result.ok === "confirm_email") {
    return { ok: "email_sent", email };
  }
  if (/already/i.test(result.message)) {
    return { ok: false, message: alreadyMsg, code: "existing_account" };
  }
  return { ok: false, message: result.message };
}

function writePendingAndResumeFlags(params: {
  firstName: string;
  email: string;
  accountSource: QuickAccountSource;
  resumeQuery: "inquiry" | "save" | "account";
}): void {
  writePendingInquirySignup({
    firstName: params.firstName,
    email: params.email,
    accountSource: params.accountSource,
  });

  if (params.resumeQuery === "inquiry") {
    setInquiryAutoSendFlag(true);
    setSaveAutoApplyFlag(false);
    return;
  }
  if (params.resumeQuery === "save") {
    setSaveAutoApplyFlag(true);
    setInquiryAutoSendFlag(false);
    return;
  }
  setSaveAutoApplyFlag(false);
  setInquiryAutoSendFlag(false);
}

async function startQuickClientAccountWithPassword(params: {
  firstName: string;
  email: string;
  password: string;
  returnPath: string;
  accountSource: QuickAccountSource;
  resumeQuery: "inquiry" | "save" | "account";
}): Promise<QuickClientAuthResult> {
  const alreadyMsg = existingAccountMessage(params.accountSource);
  const nextPath = params.returnPath.startsWith("/")
    ? params.returnPath
    : `/${params.returnPath}`;
  const emailRedirectTo = getAuthCallbackUrl(nextPath) ?? undefined;

  if (!isMarketplaceSupabaseActive()) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        message:
          "Sign-up is not available in this build. Configure Supabase and rebuild.",
      };
    }

    const result = await signUpWithPassword("client", params.email, params.password, {
      firstName: params.firstName,
    });
    return mapPasswordSignupResult(result, params.email, alreadyMsg);
  }

  const result = await signUpWithPassword("client", params.email, params.password, {
    firstName: params.firstName,
    emailRedirectTo,
  });
  const mapped = mapPasswordSignupResult(result, params.email, alreadyMsg);
  if (mapped.ok !== true) {
    return mapped;
  }

  const supabase = getMarketplaceAuthClient();
  if (supabase) {
    const profile = await saveInquiryClientProfile(
      supabase,
      mapped.session.userId,
      {
        email: params.email,
        firstName: params.firstName,
        accountSource: params.accountSource,
        passwordSetupStatus: "complete",
      }
    );
    if (!profile.ok) {
      return { ok: false, message: profile.message };
    }
  }

  return mapped;
}

/**
 * Shared low-friction client signup for inquiry + save flows.
 * Password signup (save / account menu) creates the client immediately.
 * Inquiry still prefers magic link / OTP, with an ephemeral password fallback.
 */
export async function startQuickClientAccount(params: {
  firstName?: string;
  email: string;
  password?: string;
  returnPath: string;
  accountSource: QuickAccountSource;
  /** Query flag restored after magic-link callback */
  resumeQuery: "inquiry" | "save" | "account";
}): Promise<QuickClientAuthResult> {
  const email = params.email.trim().toLowerCase();
  const password = params.password?.trim() ?? "";
  const firstName =
    params.firstName?.trim() || (password ? firstNameFromEmail(email) : "");
  const alreadyMsg = existingAccountMessage(params.accountSource);

  if (!password && !firstName) {
    return { ok: false, message: "Enter your first name." };
  }
  if (!QUICK_CLIENT_EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (password && password.length < QUICK_CLIENT_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${QUICK_CLIENT_PASSWORD_MIN_LENGTH} characters.`,
    };
  }

  writePendingAndResumeFlags({
    firstName,
    email,
    accountSource: params.accountSource,
    resumeQuery: params.resumeQuery,
  });

  if (password) {
    return startQuickClientAccountWithPassword({
      firstName,
      email,
      password,
      returnPath: params.returnPath,
      accountSource: params.accountSource,
      resumeQuery: params.resumeQuery,
    });
  }

  if (!isMarketplaceSupabaseActive()) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        message:
          "Sign-up is not available in this build. Configure Supabase and rebuild.",
      };
    }

    const result = await signUpWithPassword("client", email, `Smoac!${Date.now()}x9`, {
      firstName,
    });
    if (result.ok === true) {
      return { ok: true, session: result.session, mode: "session" };
    }
    if (result.ok === "confirm_email") {
      return { ok: "email_sent", email };
    }
    if (/already/i.test(result.message)) {
      return { ok: false, message: alreadyMsg, code: "existing_account" };
    }
    return { ok: false, message: result.message };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const nextPath = buildCompleteAccountNextPath(params.resumeQuery);
  const redirectTo = getAuthCallbackUrl(nextPath);
  if (!redirectTo) {
    return { ok: false, message: AUTH_SITE_ORIGIN_ERROR };
  }

  logAuth("quick_otp.start", {
    email,
    source: params.accountSource,
    redirectTo,
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        role: "client",
        first_name: firstName,
        account_source: params.accountSource,
        password_setup_status: "pending",
      },
      shouldCreateUser: true,
    },
  });

  if (error) {
    logAuth("quick_otp.failed", { message: error.message });

    if (/otp|magic|email|disabled|not allowed/i.test(error.message)) {
      /* randomUUID is unavailable in non-secure contexts (LAN HTTP) */
      const randomPart =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID().slice(0, 10)
          : Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) =>
              b.toString(16).padStart(2, "0")
            ).join("");
      const generated = `Smoac-${randomPart}!aA1`;
      const signup = await signUpWithPassword("client", email, generated, {
        firstName,
      });
      if (signup.ok === true) {
        const profile = await saveInquiryClientProfile(
          supabase,
          signup.session.userId,
          {
            email,
            firstName,
            accountSource: params.accountSource,
          }
        );
        if (!profile.ok) {
          return { ok: false, message: profile.message };
        }
        return { ok: true, session: signup.session, mode: "session" };
      }
      if (signup.ok === "confirm_email") {
        return { ok: "email_sent", email };
      }
      if (/already/i.test(signup.message)) {
        return { ok: false, message: alreadyMsg, code: "existing_account" };
      }
      return { ok: false, message: signup.message };
    }

    if (/already|registered|exists/i.test(error.message)) {
      return { ok: false, message: alreadyMsg, code: "existing_account" };
    }

    return { ok: false, message: error.message };
  }

  return { ok: "email_sent", email };
}

export async function startInquiryQuickAccount(params: {
  firstName: string;
  email: string;
  returnPath: string;
}): Promise<QuickClientAuthResult> {
  return startQuickClientAccount({
    ...params,
    accountSource: "specialist_inquiry",
    resumeQuery: "inquiry",
  });
}

export async function startSaveQuickAccount(params: {
  firstName?: string;
  email: string;
  password?: string;
  returnPath: string;
}): Promise<QuickClientAuthResult> {
  return startQuickClientAccount({
    ...params,
    accountSource: "saved_specialist",
    resumeQuery: "save",
  });
}

export async function startMenuQuickAccount(params: {
  firstName?: string;
  email: string;
  password?: string;
  returnPath: string;
}): Promise<QuickClientAuthResult> {
  return startQuickClientAccount({
    ...params,
    accountSource: "account_menu",
    resumeQuery: "account",
  });
}

function resolveAccountSource(): QuickAccountSource {
  const pending = readPendingInquirySignup();
  if (pending?.accountSource) return pending.accountSource;
  if (peekSaveAutoApplyFlag()) return "saved_specialist";
  return "specialist_inquiry";
}

/** After magic-link session exists — ensure minimal client profile row. */
export async function ensureInquiryClientProfileAfterAuth(session: AuthSession): Promise<{
  ok: true;
  session: AuthSession;
} | { ok: false; message: string }> {
  if (session.role !== "client") {
    return {
      ok: false,
      message: "Use a client account to continue.",
    };
  }

  if (!isMarketplaceSupabaseActive()) {
    clearPendingInquirySignup();
    return { ok: true, session };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const pending = readPendingInquirySignup();
  const firstName =
    pending?.firstName.trim() || session.firstName?.trim() || "";
  const email = pending?.email.trim().toLowerCase() || session.email;
  const accountSource = resolveAccountSource();

  const result = await saveInquiryClientProfile(supabase, session.userId, {
    email,
    firstName,
    accountSource,
  });

  if (!result.ok) {
    return result;
  }

  clearPendingInquirySignup();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const rebuilt = await buildAuthSessionFromSupabaseUser(supabase, user);
    if (rebuilt && rebuilt.role === "client") {
      return { ok: true, session: rebuilt };
    }
  }

  return {
    ok: true,
    session: {
      ...session,
      firstName: firstName || session.firstName,
      email,
      profileCompletionStatus: "incomplete",
      passwordSetupStatus:
        session.passwordSetupStatus === "complete" ||
        session.passwordSetupStatus === "skipped"
          ? session.passwordSetupStatus
          : "pending",
    },
  };
}

/**
 * Bootstrap a client session when magic-link auth succeeded but profiles/user_roles
 * were not created yet.
 */
export async function bootstrapInquiryClientFromPendingSignup(): Promise<{
  ok: true;
  session: AuthSession;
} | { ok: false; message: string } | { ok: "noop" }> {
  if (
    !peekInquiryAutoSendFlag() &&
    !peekSaveAutoApplyFlag() &&
    !readPendingInquirySignup()
  ) {
    return { ok: "noop" };
  }

  if (!isMarketplaceSupabaseActive()) {
    return { ok: "noop" };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: "noop" };
  }

  const pending = readPendingInquirySignup();
  const firstName =
    pending?.firstName.trim() ||
    (typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "") ||
    "";
  const email = (pending?.email || user.email || "").trim().toLowerCase();
  const accountSource = resolveAccountSource();

  if (!email) {
    return { ok: false, message: "Missing email for account setup." };
  }

  const profileResult = await saveInquiryClientProfile(supabase, user.id, {
    email,
    firstName,
    accountSource,
  });
  if (!profileResult.ok) {
    return profileResult;
  }

  const session = await buildAuthSessionFromSupabaseUser(supabase, user);
  if (!session || session.role !== "client") {
    return {
      ok: false,
      message: "Account created but client role setup failed.",
    };
  }

  clearPendingInquirySignup();
  return {
    ok: true,
    session: {
      ...session,
      firstName: firstName || session.firstName,
      profileCompletionStatus: "incomplete",
    },
  };
}

export async function signInClientForInquiry(
  email: string,
  password: string
): Promise<AuthResult> {
  setInquiryAutoSendFlag(true);
  setSaveAutoApplyFlag(false);
  return signInWithPassword("client", email, password);
}

export async function signInClientForSave(
  email: string,
  password: string
): Promise<AuthResult> {
  setSaveAutoApplyFlag(true);
  setInquiryAutoSendFlag(false);
  return signInWithPassword("client", email, password);
}

export async function signInClientForAccount(
  email: string,
  password: string
): Promise<AuthResult> {
  setSaveAutoApplyFlag(false);
  setInquiryAutoSendFlag(false);
  return signInWithPassword("client", email, password);
}
