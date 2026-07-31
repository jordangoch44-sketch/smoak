/**
 * Join / create-account entry — all external navigation should use these helpers
 * so the welcome intro runs on intentional flow start (not inside the wizard).
 */

import { isPublicAuthRole, type PublicAuthRole } from "@/types/auth-roles";

export const JOIN_FLOW_PATH = "/create-account";

/** Query flag — equivalent to React Router `state.showIntro` */
export const JOIN_INTRO_PARAM = "intro";

/** Deep-link role for promo / save-complete CTAs (`?role=specialist|client`) */
export const JOIN_ROLE_PARAM = "role";

export function buildJoinFlowHref(options?: {
  role?: PublicAuthRole;
  intro?: boolean;
}): string {
  const params = new URLSearchParams();
  if (options?.intro !== false) {
    params.set(JOIN_INTRO_PARAM, "1");
  }
  if (options?.role) {
    params.set(JOIN_ROLE_PARAM, options.role);
  }
  const qs = params.toString();
  return qs ? `${JOIN_FLOW_PATH}?${qs}` : JOIN_FLOW_PATH;
}

export function shouldShowJoinIntro(
  searchParams: Pick<URLSearchParams, "get">
): boolean {
  return searchParams.get(JOIN_INTRO_PARAM) === "1";
}

/** Parse `role` from Next searchParams or a raw query value. */
export function parseJoinAccountRole(
  value: string | string[] | undefined
): PublicAuthRole | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !isPublicAuthRole(raw)) return null;
  return raw;
}

type JoinFlowRouter = {
  push: (href: string) => void;
};

type JoinFlowReplaceRouter = {
  replace: (href: string) => void;
};

/** Navigate into join flow with welcome intro (hamburger Join, Create Account, etc.) */
export function startJoinFlow(router: JoinFlowRouter): void {
  router.push(buildJoinFlowHref());
}

/** Strip intro intent from URL after welcome completes — keeps user on questionnaire */
export function clearJoinIntroFromUrl(router: JoinFlowReplaceRouter): void {
  if (typeof window === "undefined") {
    router.replace(JOIN_FLOW_PATH);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.delete(JOIN_INTRO_PARAM);
  const qs = params.toString();
  router.replace(qs ? `${JOIN_FLOW_PATH}?${qs}` : JOIN_FLOW_PATH);
}
