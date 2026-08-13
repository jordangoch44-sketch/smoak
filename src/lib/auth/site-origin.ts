/**
 * Public site origin for auth redirects (magic link, email confirm, password reset).
 *
 * ONLY source: `NEXT_PUBLIC_SITE_URL` (baked at build time).
 * Never use window.location, request Host, bind address (0.0.0.0), or localhost.
 *
 * LAN: NEXT_PUBLIC_SITE_URL=http://192.168.1.77:3000 then `npm run build`.
 * Allowlist the same origin in Supabase Auth → Redirect URLs.
 *
 * Soft-fails (returns null / result) so auth UI can show an error instead of
 * throwing into a white screen.
 */

export const AUTH_SITE_ORIGIN_ERROR =
  "Sign-in links are temporarily unavailable. Please try again later.";

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

export type AuthSiteOriginResult =
  | { ok: true; origin: string }
  | { ok: false; message: string };

export function resolveAuthSiteOrigin(): AuthSiteOriginResult {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (!raw) {
    return {
      ok: false,
      message:
        "Missing NEXT_PUBLIC_SITE_URL. Set it to your public origin before building.",
    };
  }

  const configured = normalizeOrigin(raw);
  if (isUnusableAuthOrigin(configured)) {
    return {
      ok: false,
      message: `NEXT_PUBLIC_SITE_URL must be a reachable public origin, not a bind/loopback host (got "${configured}").`,
    };
  }

  return { ok: true, origin: configured };
}

/** Public origin, or null when misconfigured (never throws). */
export function getAuthSiteOrigin(): string | null {
  const result = resolveAuthSiteOrigin();
  return result.ok ? result.origin : null;
}

/** Absolute auth callback URL with optional next path (must start with /). */
export function getAuthCallbackUrl(nextPath: string): string | null {
  const origin = getAuthSiteOrigin();
  if (!origin) return null;
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/**
 * Absolute in-app URL after auth (success or failure).
 * Path may include a query string (e.g. `/login?error=auth_callback`).
 */
export function getAuthAppUrl(pathAndQuery: string): string | null {
  const origin = getAuthSiteOrigin();
  if (!origin) return null;
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${origin}${path}`;
}
