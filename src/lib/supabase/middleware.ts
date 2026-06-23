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
import {
  INTERNAL_DASHBOARD_PATH,
  INTERNAL_LOGIN_PATH,
  isInternalPath,
} from "@/lib/internal-routes";
import type { AppRole } from "@/types/auth-roles";
import { isAdminAppRole, isPublicAuthRole } from "@/types/auth-roles";

const PROTECTED_PREFIXES = [
  CLIENT_DASHBOARD_PATH,
  SPECIALIST_DASHBOARD_PATH,
  INTERNAL_DASHBOARD_PATH,
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

async function fetchUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.role) return null;
  return data.role as AppRole;
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

  if (!isProtectedPath(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    if (isInternalPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = INTERNAL_LOGIN_PATH;
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  const role = await fetchUserRole(supabase, user.id);

  if (pathname.startsWith(CLIENT_DASHBOARD_PATH)) {
    if (role !== "client") {
      const url = request.nextUrl.clone();
      url.pathname =
        role === "specialist"
          ? SPECIALIST_DASHBOARD_PATH
          : isAdminAppRole(role ?? "")
            ? INTERNAL_DASHBOARD_PATH
            : LOGIN_PATH;
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith(SPECIALIST_DASHBOARD_PATH)) {
    if (role !== "specialist") {
      const url = request.nextUrl.clone();
      url.pathname =
        role === "client"
          ? CLIENT_DASHBOARD_PATH
          : isAdminAppRole(role ?? "")
            ? INTERNAL_DASHBOARD_PATH
            : LOGIN_PATH;
      return NextResponse.redirect(url);
    }
  }

  if (isInternalPath(pathname) && pathname !== INTERNAL_LOGIN_PATH) {
    if (!role || !isAdminAppRole(role)) {
      const url = request.nextUrl.clone();
      url.pathname =
        role && isPublicAuthRole(role) ? getDashboardForRole(role) : LOGIN_PATH;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

function getDashboardForRole(role: string): string {
  return role === "client" ? CLIENT_DASHBOARD_PATH : SPECIALIST_DASHBOARD_PATH;
}
