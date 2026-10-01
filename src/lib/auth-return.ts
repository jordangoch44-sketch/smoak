import {
  CLIENT_DASHBOARD_PATH,
  LOGIN_PATH,
  SPECIALIST_DASHBOARD_PATH,
} from "@/lib/auth-routes";
import { JOIN_FLOW_PATH } from "@/lib/join-flow";
import { isPublicAuthRole, type PublicAuthRole } from "@/types/auth-roles";

export const AUTH_RETURN_TO_PARAM = "returnTo";
export const AUTH_RETURN_SAVED = "saved";
export const AUTH_ROLE_PARAM = "role";
export const AUTH_NEXT_PARAM = "next";

export function parseAuthRoleParam(
  value: string | null | undefined
): PublicAuthRole | null {
  if (!value || !isPublicAuthRole(value)) return null;
  return value;
}

/** Same-origin dashboard path only. Drops anything that could leave the site. */
export function sanitizeAuthNextPath(
  value: string | null | undefined,
  role?: PublicAuthRole | null
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("://")
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed, "https://smoac.local");
  } catch {
    return null;
  }
  if (url.origin !== "https://smoac.local") return null;

  const path = url.pathname;
  const specialist =
    path === SPECIALIST_DASHBOARD_PATH ||
    path.startsWith(`${SPECIALIST_DASHBOARD_PATH}/`);
  const client =
    path === CLIENT_DASHBOARD_PATH ||
    path.startsWith(`${CLIENT_DASHBOARD_PATH}/`);
  if (!specialist && !client) return null;
  if (role === "specialist" && !specialist) return null;
  if (role === "client" && !client) return null;
  return `${url.pathname}${url.search}`;
}

/** Login deep link from a dashboard email or an auth bounce. */
export function buildLoginHref(options?: {
  role?: PublicAuthRole;
  next?: string;
}): string {
  const params = new URLSearchParams();
  if (options?.role) params.set(AUTH_ROLE_PARAM, options.role);
  const next = sanitizeAuthNextPath(options?.next, options?.role);
  if (next) params.set(AUTH_NEXT_PARAM, next);
  const qs = params.toString();
  return qs ? `${LOGIN_PATH}?${qs}` : LOGIN_PATH;
}

type SearchParamsLike = Pick<URLSearchParams, "get">;

export function isAuthReturnToSaved(
  searchParams: SearchParamsLike | null | undefined
): boolean {
  return searchParams?.get(AUTH_RETURN_TO_PARAM) === AUTH_RETURN_SAVED;
}

export function isAuthReturnToSavedFromParams(
  params: Record<string, string | string[] | undefined>
): boolean {
  const value = params[AUTH_RETURN_TO_PARAM];
  if (value === AUTH_RETURN_SAVED) return true;
  if (Array.isArray(value)) return value[0] === AUTH_RETURN_SAVED;
  return false;
}

/** Login from saved panel / shortlist entry points */
export function buildLoginHrefForSaved(): string {
  return `${LOGIN_PATH}?${AUTH_RETURN_TO_PARAM}=${AUTH_RETURN_SAVED}`;
}

/** Create-account flow from saved panel */
export function buildJoinFlowHrefForSaved(): string {
  return `${JOIN_FLOW_PATH}?${AUTH_RETURN_TO_PARAM}=${AUTH_RETURN_SAVED}`;
}
