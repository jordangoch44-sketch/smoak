import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminAppRole } from "@/types/auth-roles";
import { isStripeConfigured } from "@/lib/stripe/config";
import { getEmailTransportMode } from "@/lib/email/email-transport";
import { getSiteUrlForStripe } from "@/lib/stripe/config";

async function requireAdmin() {
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
  return true;
}

/** Live platform status for Admin → Settings (no fake taxonomy editors). */
export async function GET() {
  const ok = await requireAdmin();
  if (!ok) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const siteUrl = getSiteUrlForStripe();
  const emailMode = getEmailTransportMode();

  return NextResponse.json({
    ok: true,
    siteUrl,
    stripeConfigured: isStripeConfigured(),
    emailMode,
    emailFromConfigured: Boolean(process.env.EMAIL_FROM?.trim()),
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    ),
    ranking: {
      source: "SMOAC client reviews only",
      formula: "rating × 20 + min(reviewCount, 50) × 0.35",
      excludes: ["Google ★", "Sponsored", "Pro"],
    },
  });
}
