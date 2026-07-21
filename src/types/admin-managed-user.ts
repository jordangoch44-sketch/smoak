import type { AppRole } from "@/types/auth-roles";

/** Real platform account (auth.users + profiles + user_roles) for admin management. */
export interface AdminManagedUser {
  userId: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  /** null — signed up but never completed role assignment */
  role: AppRole | null;
  status: "active" | "deactivated";
  emailConfirmed: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  savedSpecialistsCount: number;
}

export type AdminManagedUsersResult =
  | { ok: true; users: AdminManagedUser[] }
  | { ok: false; message: string };

export type AdminUserMutationResult =
  | { ok: true }
  | { ok: false; message: string };
