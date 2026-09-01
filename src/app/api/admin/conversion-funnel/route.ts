import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminAppRole } from "@/types/auth-roles";
import { buildMarketplaceConversionFunnel } from "@/lib/admin-conversion-funnel-service";
import type { FunnelWindow } from "@/types/admin-conversion-funnel";

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

/** Live marketplace conversion funnel (7d or 30d window). */
export async function GET(request: NextRequest) {
  const supabase = await requireAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const windowParam = searchParams.get("window");
  const windowType: FunnelWindow = windowParam === "30d" ? "30d" : "7d";

  try {
    const funnel = await buildMarketplaceConversionFunnel(supabase, windowType);
    return NextResponse.json({ ok: true, funnel });
  } catch (err: unknown) {
    console.error("[SMOAC API] Conversion funnel error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to generate conversion funnel." },
      { status: 500 }
    );
  }
}
