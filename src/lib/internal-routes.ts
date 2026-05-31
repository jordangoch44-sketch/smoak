/** Company control portal — not linked from public marketplace chrome */
export const INTERNAL_DASHBOARD_PATH = "/internal";
export const INTERNAL_LOGIN_PATH = "/internal/login";

/** @deprecated Use INTERNAL_DASHBOARD_PATH */
export const ADMIN_DASHBOARD_PATH = INTERNAL_DASHBOARD_PATH;

export function buildInternalLoginHref(): string {
  return INTERNAL_LOGIN_PATH;
}

/** @deprecated Use buildInternalLoginHref */
export function buildDevAdminLoginHref(): string {
  return buildInternalLoginHref();
}

export function isInternalPath(pathname: string): boolean {
  return (
    pathname === INTERNAL_DASHBOARD_PATH ||
    pathname.startsWith(`${INTERNAL_DASHBOARD_PATH}/`)
  );
}
