/**
 * DEV ONLY — mock credentials when Supabase is not configured (local `npm run dev` only).
 * Production LAN builds require Supabase; see docs/PHASE2_AUTH_ARCHITECTURE.md.
 */
import type { AuthRole, AuthSession } from "@/types/auth";
import type { PublicAuthRole } from "@/types/auth-roles";

export type { PublicAuthRole } from "@/types/auth-roles";
import type { AdminRoleType } from "@/types/admin-permissions";

/** Consumer-facing sign-in copy */
export const PUBLIC_INVALID_LOGIN_MESSAGE =
  "We couldn't sign you in. Check your email and password.";

export interface DevTestAccount {
  id?: string;
  role: AuthRole;
  email: string;
  password: string;
  displayName?: string;
  isPremium?: boolean;
  /** When role is admin — owner vs staff permissions */
  adminRole?: AdminRoleType;
  city?: string;
  specialty?: string;
}

/** DEV ONLY — client test account */
export const DEV_CLIENT_CREDENTIALS: DevTestAccount = {
  role: "client",
  email: "client@smoac.com",
  password: "client123",
};

/** DEV ONLY — premium specialist (full analytics) */
export const DEV_SPECIALIST_CREDENTIALS: DevTestAccount = {
  role: "specialist",
  email: "specialist@smoac.com",
  password: "specialist123",
  displayName: "Anthony Brooks",
  isPremium: true,
};

/** DEV ONLY — owner admin (full platform access) */
export const DEV_OWNER_ADMIN_CREDENTIALS: DevTestAccount = {
  role: "admin",
  email: "admin@smoac.com",
  password: "admin123",
  displayName: "Owner Admin",
  adminRole: "owner_admin",
};

/** DEV ONLY — staff admin (limited sections / permissions) */
export const DEV_STAFF_ADMIN_CREDENTIALS: DevTestAccount = {
  role: "admin",
  email: "staff@smoac.com",
  password: "staff123",
  displayName: "Staff Admin",
  adminRole: "staff_admin",
};

/** DEV ONLY — free specialist (blurred analytics + upgrade CTA) */
export const DEV_FREE_SPECIALIST_CREDENTIALS: DevTestAccount = {
  id: "free-specialist-001",
  role: "specialist",
  email: "free-specialist@smoac.test",
  password: "Test123!",
  displayName: "Free Specialist Test",
  isPremium: false,
  city: "San Diego",
  specialty: "Personal Training",
};

export const DEV_ACCOUNTS: readonly DevTestAccount[] = [
  DEV_CLIENT_CREDENTIALS,
  DEV_SPECIALIST_CREDENTIALS,
  DEV_FREE_SPECIALIST_CREDENTIALS,
  DEV_OWNER_ADMIN_CREDENTIALS,
  DEV_STAFF_ADMIN_CREDENTIALS,
];

export function normalizeDevEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeDevPassword(password: string): string {
  return password.trim();
}

const MIN_SIGNUP_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Match account by normalized email (any role) */
export function findDevAccountByEmail(email: string): DevTestAccount | undefined {
  const normalizedEmail = normalizeDevEmail(email);
  return DEV_ACCOUNTS.find(
    (account) => normalizeDevEmail(account.email) === normalizedEmail
  );
}

function findDevAccount(
  role: AuthRole,
  email: string
): DevTestAccount | undefined {
  const account = findDevAccountByEmail(email);
  if (!account || account.role !== role) return undefined;
  return account;
}

export type DevLoginValidationResult =
  | { status: "ok"; role: AuthRole }
  | { status: "role_mismatch"; expectedRole: AuthRole; actualRole: AuthRole }
  | { status: "invalid_credentials" };

/** DEV ONLY — detailed validation distinguishing wrong credentials from role mismatch */
export function validateDevLoginDetailed(
  role: AuthRole,
  email: string,
  password: string
): DevLoginValidationResult {
  const normalizedEmail = normalizeDevEmail(email);
  const normalizedPassword = normalizeDevPassword(password);
  const foundUser = findDevAccountByEmail(normalizedEmail);

  if (!foundUser) return { status: "invalid_credentials" };
  if (normalizeDevPassword(foundUser.password) !== normalizedPassword) {
    return { status: "invalid_credentials" };
  }
  if (foundUser.role !== role) {
    return {
      status: "role_mismatch",
      expectedRole: role,
      actualRole: foundUser.role,
    };
  }

  return { status: "ok", role: foundUser.role };
}

/** DEV ONLY — returns matching role when credentials are valid, otherwise null */
export function validateDevLogin(
  role: AuthRole,
  email: string,
  password: string
): AuthRole | null {
  const result = validateDevLoginDetailed(role, email, password);
  return result.status === "ok" ? result.role : null;
}

/** DEV — session fields for dashboard tier + greeting (stored on sign-in) */
export function getDevSessionFields(
  role: AuthRole,
  email: string
): Pick<AuthSession, "displayName" | "isPremium" | "adminRole"> {
  const account = findDevAccount(role, email);
  if (account) {
    return {
      displayName: account.displayName,
      isPremium: account.isPremium,
      adminRole: role === "admin" ? account.adminRole : undefined,
    };
  }

  if (role === "specialist") {
    return { isPremium: false };
  }

  return {};
}

/** Resolve tier for persisted sessions created before isPremium was stored */
export function resolveSessionIsPremium(session: AuthSession): boolean {
  if (session.role !== "specialist") return false;
  if (typeof session.isPremium === "boolean") return session.isPremium;
  const account = findDevAccountByEmail(session.email);
  if (account && account.role === session.role && typeof account.isPremium === "boolean") {
    return account.isPremium;
  }
  return false;
}

/** DEV ONLY — lightweight signup validation for the create-account wizard */
export function validateDevSignup(
  role: PublicAuthRole,
  email: string,
  password: string
): PublicAuthRole | null {
  const normalizedEmail = normalizeDevEmail(email);
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) return null;
  if (normalizeDevPassword(password).length < MIN_SIGNUP_PASSWORD_LENGTH) return null;
  return role;
}
