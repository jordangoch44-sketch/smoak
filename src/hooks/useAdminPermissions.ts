"use client";

import { useMemo } from "react";
import { ADMIN_SECTIONS, type AdminSectionId } from "@/lib/admin-sections";
import {
  canAccessAdminSection,
  getAdminRoleLabel,
  getDefaultAdminSection,
  getPermissionsForAdminRole,
  resolveAdminRoleFromSession,
} from "@/lib/admin-permissions";
import type { InternalAuthSession } from "@/types/internal-auth";
import type { AdminPermissions, AdminRoleType } from "@/types/admin-permissions";

export interface AdminAccessContext {
  adminRole: AdminRoleType;
  permissions: AdminPermissions;
  roleLabel: string;
  allowedSections: Array<(typeof ADMIN_SECTIONS)[number]>;
  allowedSectionIds: AdminSectionId[];
  defaultSection: AdminSectionId;
  isOwnerAdmin: boolean;
  isStaffAdmin: boolean;
}

export function useAdminPermissions(
  session: InternalAuthSession | null | undefined
): AdminAccessContext | null {
  return useMemo(() => {
    const adminRole = resolveAdminRoleFromSession(session);
    if (!adminRole) return null;

    const permissions = getPermissionsForAdminRole(adminRole);
    const allowedSections = ADMIN_SECTIONS.filter((section) =>
      canAccessAdminSection(section.id, permissions)
    );
    const allowedSectionIds = allowedSections.map((s) => s.id);

    return {
      adminRole,
      permissions,
      roleLabel: getAdminRoleLabel(adminRole),
      allowedSections,
      allowedSectionIds,
      defaultSection: getDefaultAdminSection(permissions),
      isOwnerAdmin: adminRole === "owner_admin",
      isStaffAdmin: adminRole === "staff_admin",
    };
  }, [session]);
}
