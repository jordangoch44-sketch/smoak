import type { AdminRoleType } from "@/types/admin-permissions";

/** Company portal session — separate from marketplace auth */
export interface InternalAuthSession {
  email: string;
  signedInAt: string;
  adminRole: AdminRoleType;
  displayName?: string;
}
