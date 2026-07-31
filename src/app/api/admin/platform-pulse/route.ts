import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminAppRole } from "@/types/auth-roles";
import { buildAdminPlatformPulse } from "@/lib/admin-platform-pulse-service";

async function requireAdminSupabase() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!roleRow || !isAdminAppRole(String(roleRow.role))) return null;
  return supabase;
}

/** Live admin Snapshot pulse — server-side so Stripe MRR can resolve. */
export async function GET() {
  const supabase = await requireAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const pulse = await buildAdminPlatformPulse(supabase);
  return NextResponse.json({ ok: true, pulse });
}
