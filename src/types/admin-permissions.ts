/**
 * Platform admin roles — maps to Supabase `admin_role` / RLS later.
 * Auth session stays `role: "admin"`; use `adminRole` for permissions.
 */
export type AdminRoleType = "owner_admin" | "staff_admin";

export interface AdminPermissions {
  canViewOverview: boolean;
  canViewRevenue: boolean;
  canManageAdmins: boolean;
  canManageSettings: boolean;
  canApproveApplications: boolean;
  canEditSpecialists: boolean;
  canViewClients: boolean;
  canFeatureSpecialists: boolean;
}
