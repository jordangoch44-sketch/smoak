/**
 * DEV ONLY — temporary test login for local/staging dashboard QA.
 * Remove this module when real authentication ships.
 */
import type { AuthRole, AuthSession } from "@/types/auth";
import type { AdminRoleType } from "@/types/admin-permissions";

/** Consumer-facing sign-in copy */
export const PUBLIC_INVALID_LOGIN_MESSAGE =
  "We couldn't sign you in. Check your email and password.";

/** @deprecated Use PUBLIC_INVALID_LOGIN_MESSAGE */
export const DEV_INVALID_LOGIN_MESSAGE = PUBLIC_INVALID_LOGIN_MESSAGE;

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

/** @deprecated Use DEV_OWNER_ADMIN_CREDENTIALS */
export const DEV_ADMIN_CREDENTIALS = DEV_OWNER_ADMIN_CREDENTIALS;

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

function logDevLoginAttempt(payload: {
  selectedRole: AuthRole;
  normalizedEmail: string;
  foundUser: DevTestAccount | null;
  passwordMatches: boolean;
  roleMatches: boolean;
}): void {
  if (process.env.NODE_ENV !== "development") return;

  console.log("[SMOAC dev login]", {
    selectedRole: payload.selectedRole,
    normalizedEmail: payload.normalizedEmail,
    foundUser: payload.foundUser
      ? {
          email: payload.foundUser.email,
          role: payload.foundUser.role,
          isPremium: payload.foundUser.isPremium,
        }
      : null,
    passwordMatches: payload.passwordMatches,
    roleMatches: payload.roleMatches,
  });
}

export type PublicAuthRole = Exclude<AuthRole, "admin">;

/** Marketplace sign-in — role inferred from credentials (client / specialist only) */
export function validateDevPublicLogin(
  email: string,
  password: string
): PublicAuthRole | null {
  const normalizedEmail = normalizeDevEmail(email);
  const normalizedPassword = normalizeDevPassword(password);
  const foundUser = findDevAccountByEmail(normalizedEmail) ?? null;

  if (!foundUser || foundUser.role === "admin") return null;
  if (normalizeDevPassword(foundUser.password) !== normalizedPassword) {
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[SMOAC sign-in]", {
      email: normalizedEmail,
      role: foundUser.role,
    });
  }

  return foundUser.role as PublicAuthRole;
}

/** DEV ONLY — returns matching role when credentials are valid, otherwise null */
export function validateDevLogin(
  role: AuthRole,
  email: string,
  password: string
): AuthRole | null {
  const normalizedEmail = normalizeDevEmail(email);
  const normalizedPassword = normalizeDevPassword(password);

  const foundUser = findDevAccountByEmail(normalizedEmail) ?? null;
  const passwordMatches = foundUser
    ? normalizeDevPassword(foundUser.password) === normalizedPassword
    : false;
  const roleMatches = foundUser ? foundUser.role === role : false;

  logDevLoginAttempt({
    selectedRole: role,
    normalizedEmail,
    foundUser,
    passwordMatches,
    roleMatches,
  });

  if (!foundUser || !passwordMatches || !roleMatches) {
    return null;
  }

  return foundUser.role;
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

export const DEV_MIN_SIGNUP_PASSWORD_LENGTH = MIN_SIGNUP_PASSWORD_LENGTH;
