import type { AdminSectionId } from "@/lib/admin-sections";
import type { AuthSession } from "@/types/auth";
import type { AdminPermissions, AdminRoleType } from "@/types/admin-permissions";
import {
  DEV_OWNER_ADMIN_CREDENTIALS,
  DEV_STAFF_ADMIN_CREDENTIALS,
} from "@/lib/dev-auth";

const OWNER_ADMIN_PERMISSIONS: AdminPermissions = {
  canViewOverview: true,
  canViewRevenue: true,
  canManageAdmins: true,
  canManageSettings: true,
  canApproveApplications: true,
  canEditSpecialists: true,
  canViewClients: true,
  canFeatureSpecialists: true,
};

const STAFF_ADMIN_PERMISSIONS: AdminPermissions = {
  canViewOverview: true,
  canViewRevenue: false,
  canManageAdmins: false,
  canManageSettings: false,
  canApproveApplications: true,
  canEditSpecialists: true,
  canViewClients: true,
  canFeatureSpecialists: false,
};

export function getPermissionsForAdminRole(
  adminRole: AdminRoleType
): AdminPermissions {
  return adminRole === "owner_admin"
    ? OWNER_ADMIN_PERMISSIONS
    : STAFF_ADMIN_PERMISSIONS;
}

/** Resolve admin tier from session (DEV email fallback for legacy sessions) */
export function resolveAdminRoleFromSession(
  session: AuthSession | null | undefined
): AdminRoleType | null {
  if (!session || session.role !== "admin") return null;
  if (session.adminRole) return session.adminRole;

  const email = session.email.trim().toLowerCase();
  if (email === DEV_STAFF_ADMIN_CREDENTIALS.email) return "staff_admin";
  if (email === DEV_OWNER_ADMIN_CREDENTIALS.email) return "owner_admin";

  return "owner_admin";
}

export function getAdminRoleLabel(adminRole: AdminRoleType): string {
  return adminRole === "owner_admin" ? "Owner Admin" : "Staff Admin";
}

export function canAccessAdminSection(
  sectionId: AdminSectionId,
  permissions: AdminPermissions
): boolean {
  switch (sectionId) {
    case "overview":
      return permissions.canViewOverview;
    case "applications":
    case "specialists":
      return true;
    case "clients":
      return permissions.canViewClients;
    case "revenue":
      return permissions.canViewRevenue;
    case "team":
      return permissions.canManageAdmins;
    case "settings":
      return permissions.canManageSettings;
    default:
      return false;
  }
}

export function getDefaultAdminSection(
  permissions: AdminPermissions
): AdminSectionId {
  const order: AdminSectionId[] = [
    "overview",
    "applications",
    "specialists",
    "clients",
    "revenue",
    "team",
    "settings",
  ];
  const found = order.find((id) => canAccessAdminSection(id, permissions));
  return found ?? "overview";
}
