import type { AdminRoleType } from "@/types/admin-permissions";
import type { PublicAuthRole } from "@/types/auth-roles";

export type AuthRole = PublicAuthRole | "admin";

export interface AuthSession {
  /** Supabase Auth user id */
  userId: string;
  role: AuthRole;
  email: string;
  signedInAt: string;
  /** From profiles.first_name — used for dashboard greeting */
  firstName?: string;
  /** From profiles.client_zip_code */
  clientZipCode?: string;
  /** From profiles.client_city — header city label fallback */
  clientCity?: string;
  displayName?: string;
  isPremium?: boolean;
  adminRole?: AdminRoleType;
}
