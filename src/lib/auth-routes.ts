import type { AuthRole } from "@/types/auth";

export const CLIENT_DASHBOARD_PATH = "/client-dashboard";
export const SPECIALIST_DASHBOARD_PATH = "/specialist-dashboard";
export const LOGIN_PATH = "/login";

export function getDashboardPathForRole(role: AuthRole): string {
  return role === "client" ? CLIENT_DASHBOARD_PATH : SPECIALIST_DASHBOARD_PATH;
}

export function isDashboardPath(pathname: string): boolean {
  return (
    pathname === CLIENT_DASHBOARD_PATH ||
    pathname === SPECIALIST_DASHBOARD_PATH
  );
}
