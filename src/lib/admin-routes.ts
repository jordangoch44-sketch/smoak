export const ADMIN_DASHBOARD_PATH = "/admin";

/** DEV — login shows admin role picker only with this query flag */
export const DEV_ADMIN_LOGIN_QUERY = "devAdmin";

export function buildDevAdminLoginHref(): string {
  return `/login?${DEV_ADMIN_LOGIN_QUERY}=1`;
}

export function isDevAdminLoginEnabled(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): boolean {
  return searchParams.get(DEV_ADMIN_LOGIN_QUERY) === "1";
}
