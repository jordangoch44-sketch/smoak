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

export type QuickClientAuthResult =
  | { ok: true; session: AuthSession; mode: "session" }
  | { ok: "email_sent"; email: string }
  | { ok: false; message: string; code?: "existing_account" };

function siteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function existingAccountMessage(source: QuickAccountSource): string {
  return source === "saved_specialist"
    ? "This email already has an account. Log in to save this specialist."
    : "This email already has an account. Sign in to send your message.";
}

/**
 * Shared low-friction client signup for inquiry + save flows.
 * Prefer magic link / OTP; falls back to ephemeral password when needed.
 */
export async function startQuickClientAccount(params: {
  firstName: string;
  email: string;
  returnPath: string;
  accountSource: QuickAccountSource;
  /** Query flag restored after magic-link callback */
  resumeQuery: "inquiry" | "save";
}): Promise<QuickClientAuthResult> {
  const firstName = params.firstName.trim();
  const email = params.email.trim().toLowerCase();
  const alreadyMsg = existingAccountMessage(params.accountSource);

  if (!firstName) {
    return { ok: false, message: "Enter your first name." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  writePendingInquirySignup({
    firstName,
    email,
    accountSource: params.accountSource,
  });

  if (params.resumeQuery === "inquiry") {
    setInquiryAutoSendFlag(true);
    setSaveAutoApplyFlag(false);
  } else {
    setSaveAutoApplyFlag(true);
    setInquiryAutoSendFlag(false);
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

  const nextPath = params.returnPath.startsWith("/")
    ? params.returnPath
    : `/${params.returnPath}`;
  const flag = params.resumeQuery === "save" ? "save=1" : "inquiry=1";
  const redirectTo = `${siteOrigin()}/auth/callback?next=${encodeURIComponent(
    `${nextPath}${nextPath.includes("?") ? "&" : "?"}${flag}`
  )}`;

  logAuth("quick_otp.start", {
    email,
    source: params.accountSource,
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        role: "client",
        first_name: firstName,
        account_source: params.accountSource,
      },
      shouldCreateUser: true,
    },
  });

  if (error) {
    logAuth("quick_otp.failed", { message: error.message });

    if (/otp|magic|email|disabled|not allowed/i.test(error.message)) {
      const generated = `Smoac-${crypto.randomUUID().slice(0, 10)}!aA1`;
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
  firstName: string;
  email: string;
  returnPath: string;
}): Promise<QuickClientAuthResult> {
  return startQuickClientAccount({
    ...params,
    accountSource: "saved_specialist",
    resumeQuery: "save",
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

  return {
    ok: true,
    session: {
      ...session,
      firstName: firstName || session.firstName,
      email,
      profileCompletionStatus: "incomplete",
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
