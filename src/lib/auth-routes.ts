import type { AuthRole } from "@/types/auth";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-routes";

export const CLIENT_DASHBOARD_PATH = "/client-dashboard";
export const SPECIALIST_DASHBOARD_PATH = "/specialist-dashboard";
export const LOGIN_PATH = "/login";

export function getDashboardPathForRole(role: AuthRole): string {
  if (role === "admin") return ADMIN_DASHBOARD_PATH;
  return role === "client" ? CLIENT_DASHBOARD_PATH : SPECIALIST_DASHBOARD_PATH;
}

export function isDashboardPath(pathname: string): boolean {
  return (
    pathname === CLIENT_DASHBOARD_PATH ||
    pathname === SPECIALIST_DASHBOARD_PATH ||
    pathname === ADMIN_DASHBOARD_PATH ||
    pathname.startsWith(`${ADMIN_DASHBOARD_PATH}/`)
  );
}
