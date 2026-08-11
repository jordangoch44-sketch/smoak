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
