import type { AdminRoleType } from "@/types/admin-permissions";

export type AuthRole = "client" | "specialist" | "admin";

export interface AuthSession {
  role: AuthRole;
  email: string;
  signedInAt: string;
  /** DEV — dashboard greeting override */
  displayName?: string;
  /** DEV — specialist SMOAC Pro tier (dashboard analytics gating) */
  isPremium?: boolean;
  /** Platform admin tier when role is admin — Supabase `admin_role` later */
  adminRole?: AdminRoleType;
}
