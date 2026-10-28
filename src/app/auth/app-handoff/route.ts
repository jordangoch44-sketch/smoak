import { createHash } from "node:crypto";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  billingHandoffNextPath,
  intentFromHandoffRow,
} from "@/lib/billing-app-handoff";
import { getAuthAppUrl } from "@/lib/auth/site-origin";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const LOGIN_ERROR = `${LOGIN_PATH}?error=billing_handoff&next=${encodeURIComponent("/specialist-dashboard")}`;

function redirectTo(request: Request, pathAndQuery: string) {
  const absolute = getAuthAppUrl(pathAndQuery);
  const response = NextResponse.redirect(absolute ?? new URL(pathAndQuery, request.url));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Safari opens this once. The code is consumed, then a normal session cookie
 * is set and the browser lands on the checkout the app started.
 * generateLink does not send an email. The token is verified here immediately.
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (code.length < 40) return redirectTo(request, LOGIN_ERROR);

  const service = createSupabaseServiceClient();
  const config = getSupabasePublicConfig();
  if (!service || !config) return redirectTo(request, LOGIN_ERROR);

  const { data, error } = await service.rpc("consume_billing_app_handoff", {
    p_code_hash: hashCode(code),
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return redirectTo(request, LOGIN_ERROR);

  const intent = intentFromHandoffRow({
    intent: String(row.intent ?? ""),
    product: row.product ?? null,
    days: row.days ?? null,
    daily_cents: row.daily_cents ?? null,
  });
  if (!intent) return redirectTo(request, LOGIN_ERROR);

  const userId = String(row.user_id ?? "");
  const { data: roleRow } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (roleRow?.role !== "specialist") return redirectTo(request, LOGIN_ERROR);

  const { data: userResult, error: userError } =
    await service.auth.admin.getUserById(userId);
  const email = userResult.user?.email?.trim();
  if (userError || !email) return redirectTo(request, LOGIN_ERROR);

  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return redirectTo(request, LOGIN_ERROR);

  const pending: { name: string; value: string; options: CookieOptions }[] = [];
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookiesToSet) {
        pending.push(...cookiesToSet);
      },
    },
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (verifyError || pending.length === 0) return redirectTo(request, LOGIN_ERROR);

  const response = redirectTo(request, billingHandoffNextPath(intent));
  for (const cookie of pending) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
