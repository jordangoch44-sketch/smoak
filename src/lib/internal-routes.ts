/** Company control portal — not linked from public marketplace chrome */
export const INTERNAL_DASHBOARD_PATH = "/internal";
export const INTERNAL_LOGIN_PATH = "/internal/login";

export function buildInternalLoginHref(): string {
  return INTERNAL_LOGIN_PATH;
}

export function isInternalPath(pathname: string): boolean {
  return (
    pathname === INTERNAL_DASHBOARD_PATH ||
    pathname.startsWith(`${INTERNAL_DASHBOARD_PATH}/`)
  );
}
