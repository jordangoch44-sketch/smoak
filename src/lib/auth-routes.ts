import type { PublicAuthRole } from "@/types/auth-roles";
import { isInternalPath } from "@/lib/internal-routes";

export const CLIENT_DASHBOARD_PATH = "/client-dashboard";
export const SPECIALIST_DASHBOARD_PATH = "/specialist-dashboard";
export const SPECIALIST_DASHBOARD_OVERVIEW_HREF = `${SPECIALIST_DASHBOARD_PATH}?tab=overview`;
export const SPECIALIST_DASHBOARD_PROFILE_TAB_HREF = `${SPECIALIST_DASHBOARD_PATH}?tab=profile`;
export const LOGIN_PATH = "/login";

export function getDashboardPathForRole(role: PublicAuthRole): string {
  return role === "client"
    ? CLIENT_DASHBOARD_PATH
    : SPECIALIST_DASHBOARD_PROFILE_TAB_HREF;
}

/** Marketplace account dashboards only — not company portal */
export function isDashboardPath(pathname: string): boolean {
  if (isInternalPath(pathname)) return false;
  return (
    pathname === CLIENT_DASHBOARD_PATH ||
    pathname === SPECIALIST_DASHBOARD_PATH ||
    pathname.startsWith(`${CLIENT_DASHBOARD_PATH}/`) ||
    pathname.startsWith(`${SPECIALIST_DASHBOARD_PATH}/`)
  );
}
