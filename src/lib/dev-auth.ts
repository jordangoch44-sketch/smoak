/**
 * DEV ONLY — temporary test login for local/staging dashboard QA.
 * Remove this module when real authentication ships.
 */
import type { AuthRole } from "@/types/auth";

export const DEV_INVALID_LOGIN_MESSAGE =
  "Invalid test login. Check role, email, and password.";

/** DEV ONLY — client test account */
export const DEV_CLIENT_CREDENTIALS = {
  role: "client" as const satisfies AuthRole,
  email: "client@smoac.com",
  password: "client123",
};

/** DEV ONLY — specialist test account */
export const DEV_SPECIALIST_CREDENTIALS = {
  role: "specialist" as const satisfies AuthRole,
  email: "specialist@smoac.com",
  password: "specialist123",
};

const DEV_ACCOUNTS = [DEV_CLIENT_CREDENTIALS, DEV_SPECIALIST_CREDENTIALS] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const MIN_SIGNUP_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** DEV ONLY — returns matching role when credentials are valid, otherwise null */
export function validateDevLogin(
  role: AuthRole,
  email: string,
  password: string
): AuthRole | null {
  const normalizedEmail = normalizeEmail(email);
  const match = DEV_ACCOUNTS.find(
    (account) =>
      account.role === role &&
      normalizeEmail(account.email) === normalizedEmail &&
      account.password === password
  );
  return match?.role ?? null;
}

/** DEV ONLY — lightweight signup validation for the create-account wizard */
export function validateDevSignup(
  role: AuthRole,
  email: string,
  password: string
): AuthRole | null {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) return null;
  if (password.length < MIN_SIGNUP_PASSWORD_LENGTH) return null;
  return role;
}

export const DEV_MIN_SIGNUP_PASSWORD_LENGTH = MIN_SIGNUP_PASSWORD_LENGTH;
