import { createHash, randomInt } from "node:crypto";
import {
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import { sendOutboundEmail } from "@/lib/email/email-transport";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createClient, type User } from "@supabase/supabase-js";

const OTP_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 8;
const META_KEY = "specialist_email_otp";

type OtpMeta = {
  hash: string;
  exp: number;
  sentAt: number;
  attempts: number;
};

function otpPepper(): string {
  return (
    process.env.SPECIALIST_EMAIL_OTP_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "smoac-dev-otp-pepper"
  );
}

function hashOtp(email: string, code: string): string {
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${code}:${otpPepper()}`)
    .digest("hex");
}

function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

function readOtpMeta(user: User): OtpMeta | null {
  const raw = user.user_metadata?.[META_KEY];
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const hash = typeof obj.hash === "string" ? obj.hash : "";
  const exp = typeof obj.exp === "number" ? obj.exp : 0;
  const sentAt = typeof obj.sentAt === "number" ? obj.sentAt : 0;
  const attempts = typeof obj.attempts === "number" ? obj.attempts : 0;
  if (!hash || !exp) return null;
  return { hash, exp, sentAt, attempts };
}

function buildOtpEmail(email: string, code: string, firstName: string) {
  const name = firstName.trim() || "there";
  const text = `Hi ${name},

Use this code to verify your email for your SMOAC specialist application:

${code}

This code expires in 15 minutes. If you didn’t start an application, you can ignore this email.

— The SMOAC team`;

  const html = wrapTransactionalEmailHtml({
    preheader: `Your SMOAC verification code is ${code}`,
    eyebrow: "Email verification",
    title: "Your verification code",
    bodyHtml:
      renderEmailParagraphs([
        `Hi ${name},`,
        "Use this code to verify your email and continue your SMOAC specialist application.",
      ]) +
      `<p style="margin:8px 0 24px;font-size:32px;letter-spacing:0.28em;font-weight:700;color:#f5f5f7;text-align:center;">${code}</p>` +
      renderEmailParagraphs([
        "This code expires in 15 minutes. If you didn’t start an application, you can ignore this email.",
      ]),
    footerNote: "Enter this code in the specialist application to continue.",
  });

  return {
    to: email,
    subject: `${code} is your SMOAC verification code`,
    text,
    html,
    kind: "specialist_email_otp",
  };
}

async function findAuthUserByEmail(
  service: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  email: string
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw new Error(error.message);
  return (
    (data?.users ?? []).find(
      (u) => (u.email || "").trim().toLowerCase() === normalized
    ) ?? null
  );
}

async function tryPasswordSignIn(
  email: string,
  password: string
): Promise<
  | { status: "ok" }
  | { status: "unconfirmed" }
  | { status: "invalid" }
  | { status: "error"; message: string }
> {
  const config = getSupabasePublicConfig();
  if (!config) return { status: "error", message: "Supabase is not configured." };
  const anon = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.auth.signInWithPassword({ email, password });
  if (!error) {
    await anon.auth.signOut();
    return { status: "ok" };
  }
  if (/not confirmed|confirm/i.test(error.message)) {
    return { status: "unconfirmed" };
  }
  if (/invalid|credentials|password/i.test(error.message)) {
    return { status: "invalid" };
  }
  return { status: "error", message: error.message };
}

export type SpecialistOtpSendResult =
  | { ok: true; alreadyVerified: true }
  | { ok: true; alreadyVerified: false; email: string }
  | { ok: false; message: string };

export type SpecialistOtpVerifyResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

/** Create/update specialist Auth user and email a 6-digit SMOAC verification code. */
export async function sendSpecialistEmailOtp(params: {
  email: string;
  password: string;
  firstName?: string;
}): Promise<SpecialistOtpSendResult> {
  const email = params.email.trim().toLowerCase();
  const password = params.password;
  const firstName = params.firstName?.trim() ?? "";

  if (!email.includes("@") || password.length < 8) {
    return {
      ok: false,
      message: "Enter a valid email and a password with at least 8 characters.",
    };
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return { ok: false, message: "Authentication is not available on the server." };
  }

  let user = await findAuthUserByEmail(service, email);

  if (!user) {
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        role: "specialist",
        first_name: firstName,
      },
    });
    if (error || !data.user) {
      return {
        ok: false,
        message: error?.message || "Could not create your specialist account.",
      };
    }
    user = data.user;
  } else {
    const login = await tryPasswordSignIn(email, password);
    if (login.status === "ok") {
      /* Already confirmed + correct password — no OTP needed. */
      return { ok: true, alreadyVerified: true };
    }
    if (login.status === "invalid") {
      return {
        ok: false,
        message:
          "An account with this email already exists. Sign in with your password, or reset it from the login page.",
      };
    }
    if (login.status === "error") {
      return { ok: false, message: login.message };
    }

    /* Unconfirmed — refresh password + metadata, then send code. */
    const { error: updateError } = await service.auth.admin.updateUserById(
      user.id,
      {
        password,
        user_metadata: {
          ...user.user_metadata,
          role: "specialist",
          first_name: firstName || user.user_metadata?.first_name || "",
        },
      }
    );
    if (updateError) {
      return { ok: false, message: updateError.message };
    }
  }

  const existingMeta = readOtpMeta(user);
  if (
    existingMeta &&
    Date.now() - existingMeta.sentAt < RESEND_COOLDOWN_MS &&
    existingMeta.exp > Date.now()
  ) {
    return { ok: true, alreadyVerified: false, email };
  }

  const code = generateOtpCode();
  const meta: OtpMeta = {
    hash: hashOtp(email, code),
    exp: Date.now() + OTP_TTL_MS,
    sentAt: Date.now(),
    attempts: 0,
  };

  const { error: metaError } = await service.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      role: "specialist",
      first_name: firstName || user.user_metadata?.first_name || "",
      [META_KEY]: meta,
    },
  });
  if (metaError) {
    return { ok: false, message: metaError.message };
  }

  const emailPayload = buildOtpEmail(email, code, firstName);
  const sent = await sendOutboundEmail(emailPayload);
  if (!sent.success) {
    return {
      ok: false,
      message:
        sent.mode === "console"
          ? "Email delivery isn’t configured. Set RESEND_API_KEY to send verification codes."
          : "Could not send the verification email. Try again in a moment.",
    };
  }

  if (sent.mode === "console") {
    console.info("[SMOAC OTP] specialist verification code (dev)", {
      email,
      code,
    });
  }

  return { ok: true, alreadyVerified: false, email };
}

/** Validate the pasted code, confirm the Auth email, and clear the OTP challenge. */
export async function verifySpecialistEmailOtp(params: {
  email: string;
  password: string;
  code: string;
}): Promise<SpecialistOtpVerifyResult> {
  const email = params.email.trim().toLowerCase();
  const code = params.code.replace(/\s+/g, "").trim();
  const password = params.password;

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, message: "Enter the 6-digit code from your email." };
  }
  if (!email.includes("@") || password.length < 8) {
    return { ok: false, message: "Email and password are required." };
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return { ok: false, message: "Authentication is not available on the server." };
  }

  const user = await findAuthUserByEmail(service, email);
  if (!user) {
    return {
      ok: false,
      message: "No pending verification for that email. Go back and continue again.",
    };
  }

  const login = await tryPasswordSignIn(email, password);
  if (login.status === "ok") {
    /* Already confirmed — treat as verified. */
    await service.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        [META_KEY]: null,
      },
    });
    return { ok: true, email };
  }
  if (login.status === "invalid") {
    return {
      ok: false,
      message: "Password doesn’t match. Check your password on this step.",
    };
  }
  if (login.status === "error") {
    return { ok: false, message: login.message };
  }

  const meta = readOtpMeta(user);
  if (!meta) {
    return {
      ok: false,
      message: "No verification code found. Tap Resend code and try again.",
    };
  }
  if (meta.exp < Date.now()) {
    return {
      ok: false,
      message: "That code expired. Tap Resend code for a new one.",
    };
  }
  if (meta.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      message: "Too many attempts. Tap Resend code for a new one.",
    };
  }

  if (meta.hash !== hashOtp(email, code)) {
    await service.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        [META_KEY]: { ...meta, attempts: meta.attempts + 1 },
      },
    });
    return { ok: false, message: "That code doesn’t match. Check the email and try again." };
  }

  const { error } = await service.auth.admin.updateUserById(user.id, {
    email_confirm: true,
    user_metadata: {
      ...user.user_metadata,
      role: "specialist",
      [META_KEY]: null,
    },
  });
  if (error) {
    return { ok: false, message: error.message };
  }

  /* Session builder requires user_roles — set it as soon as email is verified. */
  const { error: roleError } = await service.from("user_roles").upsert(
    {
      user_id: user.id,
      role: "specialist",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (roleError) {
    console.warn("[SMOAC OTP] user_roles upsert failed:", roleError.message);
  }

  const firstName =
    typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "";
  const { error: profileError } = await service.from("profiles").upsert(
    {
      user_id: user.id,
      email,
      first_name: firstName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (profileError) {
    console.warn("[SMOAC OTP] profiles upsert failed:", profileError.message);
  }

  return { ok: true, email };
}
