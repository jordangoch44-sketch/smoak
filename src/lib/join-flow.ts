/**
 * Join / create-account entry — Sign up clicks land on the questionnaire.
 * Route loading uses a matching skeleton.
 */

import { isPublicAuthRole, type PublicAuthRole } from "@/types/auth-roles";

export const JOIN_FLOW_PATH = "/create-account";

/** Deep-link role for promo / save-complete CTAs (`?role=specialist|client`) */
export const JOIN_ROLE_PARAM = "role";

/** Signed-in specialists with an unsubmitted form. */
export const SPECIALIST_ONBOARDING_RESUME_HREF = buildJoinFlowHref({
  role: "specialist",
});

export function buildJoinFlowHref(options?: {
  role?: PublicAuthRole;
}): string {
  const params = new URLSearchParams();
  if (options?.role) {
    params.set(JOIN_ROLE_PARAM, options.role);
  }
  const qs = params.toString();
  return qs ? `${JOIN_FLOW_PATH}?${qs}` : JOIN_FLOW_PATH;
}

/** Parse `role` from Next searchParams or a raw query value. */
export function parseJoinAccountRole(
  value: string | string[] | undefined
): PublicAuthRole | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !isPublicAuthRole(raw)) return null;
  return raw;
}
