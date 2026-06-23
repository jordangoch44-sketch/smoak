/** Marketplace-facing account roles (excludes platform admin) */
export type PublicAuthRole = "client" | "specialist";

/** All roles stored in `user_roles` */
export type AppRole =
  | PublicAuthRole
  | "owner_admin"
  | "staff_admin";

export function isPublicAuthRole(role: string): role is PublicAuthRole {
  return role === "client" || role === "specialist";
}

export function isAdminAppRole(role: string): role is "owner_admin" | "staff_admin" {
  return role === "owner_admin" || role === "staff_admin";
}
