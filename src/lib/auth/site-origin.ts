/**
 * Public site origin for auth redirects (magic link, email confirm, password reset).
 *
 * ONLY source: `NEXT_PUBLIC_SITE_URL` (baked at build time).
 * Never use window.location, request Host, bind address (0.0.0.0), or localhost.
 *
 * LAN: NEXT_PUBLIC_SITE_URL=http://192.168.1.77:3000 then `npm run build`.
 * Allowlist the same origin in Supabase Auth → Redirect URLs.
 */

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

/** Bind / loopback hosts must never appear in auth emails. */
function isUnusableAuthOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "0.0.0.0" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::]" ||
      hostname === "::" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    return true;
  }
}

export function getAuthSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (!raw) {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL. Set it to your public origin (e.g. http://192.168.1.77:3000) before building."
    );
  }

  const configured = normalizeOrigin(raw);
  if (isUnusableAuthOrigin(configured)) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be a reachable public origin, not a bind/loopback host (got "${configured}"). Use e.g. http://192.168.1.77:3000.`
    );
  }

  return configured;
}

/** Absolute auth callback URL with optional next path (must start with /). */
export function getAuthCallbackUrl(nextPath: string): string {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${getAuthSiteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
}

/**
 * Absolute in-app URL after auth (success or failure).
 * Path may include a query string (e.g. `/login?error=auth_callback`).
 */
export function getAuthAppUrl(pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${getAuthSiteOrigin()}${path}`;
}
