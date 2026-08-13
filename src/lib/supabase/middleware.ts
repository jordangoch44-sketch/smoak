import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import {
  CLIENT_DASHBOARD_PATH,
  LOGIN_PATH,
  SPECIALIST_DASHBOARD_PATH,
} from "@/lib/auth-routes";
import { COMPLETE_ACCOUNT_PATH } from "@/lib/auth/account-setup";
import {
  INTERNAL_DASHBOARD_PATH,
  INTERNAL_LOGIN_PATH,
  isInternalPath,
} from "@/lib/internal-routes";
import type { AppRole } from "@/types/auth-roles";
import { isAdminAppRole, isPublicAuthRole } from "@/types/auth-roles";
import { getAuthAppUrl } from "@/lib/auth/site-origin";

/** Prefer SITE_URL when the request host is a bind/loopback address. */
function redirectToAppPath(request: NextRequest, pathname: string) {
  const host = request.nextUrl.hostname;
  if (
    host === "0.0.0.0" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::" ||
    host === "::1"
  ) {
    const absolute = getAuthAppUrl(pathname);
    if (absolute) {
      return NextResponse.redirect(absolute);
    }
  }
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

const PROTECTED_PREFIXES = [
  CLIENT_DASHBOARD_PATH,
  SPECIALIST_DASHBOARD_PATH,
  INTERNAL_DASHBOARD_PATH,
] as const;

function isProtectedPath(pathname: string): boolean {
  /* Login must stay public — otherwise unauthenticated /internal/login loops forever */
  if (pathname === INTERNAL_LOGIN_PATH) return false;

  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

type RoleLookup =
  | { status: "ok"; role: AppRole }
  | { status: "missing" }
  | { status: "error" };

async function fetchUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<RoleLookup> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { status: "error" };
  if (!data?.role) return { status: "missing" };
  return { status: "ok", role: data.role as AppRole };
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  /* Internal login is always reachable (no auth gate / no password-setup divert). */
  if (pathname === INTERNAL_LOGIN_PATH) {
    return supabaseResponse;
  }

  if (pathname === LOGIN_PATH && user) {
    const pendingPassword =
      user.user_metadata?.password_setup_status === "pending";
    if (pendingPassword) {
      return redirectToAppPath(request, COMPLETE_ACCOUNT_PATH);
    }
    /* Admin sessions have no public-site account — let them reach /login
     * to sign in as a client/specialist instead of bouncing home. */
    const roleLookup = await fetchUserRole(supabase, user.id);
    if (roleLookup.status === "error") {
      return supabaseResponse;
    }
    const role = roleLookup.status === "ok" ? roleLookup.role : null;
    if (role && isAdminAppRole(role)) {
      return supabaseResponse;
    }
    if (role && isPublicAuthRole(role)) {
      return redirectToAppPath(request, getDashboardForRole(role));
    }
    return redirectToAppPath(request, "/");
  }

  if (pathname === COMPLETE_ACCOUNT_PATH) {
    if (!user) {
      return redirectToAppPath(request, LOGIN_PATH);
    }
    return supabaseResponse;
  }

  /* Force password creation before browsing for quick-signup users. */
  if (
    user &&
    user.user_metadata?.password_setup_status === "pending" &&
    !pathname.startsWith("/auth/")
  ) {
    return redirectToAppPath(request, COMPLETE_ACCOUNT_PATH);
  }

  if (!isProtectedPath(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    if (isInternalPath(pathname)) {
      return redirectToAppPath(request, INTERNAL_LOGIN_PATH);
    }
    return redirectToAppPath(request, LOGIN_PATH);
  }

  const roleLookup = await fetchUserRole(supabase, user.id);

  /* Transient DB/RLS blips must not kick an authenticated session off protected routes. */
  if (roleLookup.status === "error") {
    return supabaseResponse;
  }

  const role = roleLookup.status === "ok" ? roleLookup.role : null;

  if (pathname.startsWith(CLIENT_DASHBOARD_PATH)) {
    if (role !== "client") {
      return redirectToAppPath(
        request,
        role === "specialist"
          ? SPECIALIST_DASHBOARD_PATH
          : isAdminAppRole(role ?? "")
            ? INTERNAL_DASHBOARD_PATH
            : LOGIN_PATH
      );
    }
  }

  if (pathname.startsWith(SPECIALIST_DASHBOARD_PATH)) {
    if (role !== "specialist") {
      return redirectToAppPath(
        request,
        role === "client"
          ? CLIENT_DASHBOARD_PATH
          : isAdminAppRole(role ?? "")
            ? INTERNAL_DASHBOARD_PATH
            : LOGIN_PATH
      );
    }
  }

  if (isInternalPath(pathname) && pathname !== INTERNAL_LOGIN_PATH) {
    if (!role || !isAdminAppRole(role)) {
      return redirectToAppPath(
        request,
        role && isPublicAuthRole(role) ? getDashboardForRole(role) : LOGIN_PATH
      );
    }
  }

  return supabaseResponse;
}

function getDashboardForRole(role: string): string {
  return role === "client" ? CLIENT_DASHBOARD_PATH : SPECIALIST_DASHBOARD_PATH;
}
