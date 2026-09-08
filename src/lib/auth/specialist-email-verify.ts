/**
 * Client helpers for specialist onboarding email OTP (paste-a-code gate).
 */

export type SpecialistEmailOtpSendClientResult =
  | { ok: true; alreadyVerified: true }
  | { ok: true; alreadyVerified: false; email: string }
  | { ok: false; message: string };

export type SpecialistEmailOtpVerifyClientResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

export async function sendSpecialistEmailVerificationCode(params: {
  email: string;
  password: string;
  firstName?: string;
}): Promise<SpecialistEmailOtpSendClientResult> {
  try {
    const response = await fetch("/api/auth/specialist-email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "send",
        email: params.email,
        password: params.password,
        firstName: params.firstName ?? "",
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | SpecialistEmailOtpSendClientResult
      | null;
    if (!payload) {
      return { ok: false, message: "Could not start email verification." };
    }
    return payload;
  } catch {
    return { ok: false, message: "Network error sending verification code." };
  }
}

export async function abandonUnconfirmedSpecialistSignupClient(params: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = params.email.trim().toLowerCase();
  const password = params.password;
  if (!email.includes("@") || password.length < 8) {
    return { ok: true };
  }
  try {
    const response = await fetch("/api/auth/specialist-email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        action: "abandon",
        email,
        password,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null;
    if (!payload?.ok) {
      return { ok: false, message: payload?.message || "Could not clear signup." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error clearing signup." };
  }
}

export async function verifySpecialistEmailVerificationCode(params: {
  email: string;
  password: string;
  code: string;
}): Promise<SpecialistEmailOtpVerifyClientResult> {
  try {
    const response = await fetch("/api/auth/specialist-email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "verify",
        email: params.email,
        password: params.password,
        code: params.code,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | SpecialistEmailOtpVerifyClientResult
      | null;
    if (!payload) {
      return { ok: false, message: "Could not verify that code." };
    }
    return payload;
  } catch {
    return { ok: false, message: "Network error verifying code." };
  }
}
