import { LOGIN_PATH } from "@/lib/auth-routes";
import { JOIN_INTRO_PARAM, JOIN_FLOW_PATH } from "@/lib/join-flow";

export const AUTH_RETURN_TO_PARAM = "returnTo";
export const AUTH_RETURN_SAVED = "saved";

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

/** Create-account flow from saved panel (includes welcome intro) */
export function buildJoinFlowHrefForSaved(): string {
  return `${JOIN_FLOW_PATH}?${JOIN_INTRO_PARAM}=1&${AUTH_RETURN_TO_PARAM}=${AUTH_RETURN_SAVED}`;
}
