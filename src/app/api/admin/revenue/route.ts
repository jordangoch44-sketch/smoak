import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminAppRole } from "@/types/auth-roles";
import { fetchStripeMrrCents } from "@/lib/stripe/sync-subscription";

interface BillingRow {
  userId: string;
  specialistProfileId: string | null;
  status: string;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

async function requireAdminCaller() {
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

export async function GET() {
  const supabase = await requireAdminCaller();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const [stripeMrr, billingRes] = await Promise.all([
    fetchStripeMrrCents().catch(() => null),
    supabase
      .from("specialist_billing")
      .select(
        "user_id, specialist_profile_id, status, stripe_subscription_id, cancel_at_period_end, current_period_end"
      )
      .order("updated_at", { ascending: false }),
  ]);

  if (billingRes.error) {
    return NextResponse.json(
      { ok: false, message: billingRes.error.message },
      { status: 502 }
    );
  }

  const billingRows: BillingRow[] = (billingRes.data ?? []).map((row) => ({
    userId: row.user_id as string,
    specialistProfileId: (row.specialist_profile_id as string | null) ?? null,
    status: String(row.status ?? "none"),
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    currentPeriodEnd: (row.current_period_end as string | null) ?? null,
  }));

  return NextResponse.json({
    ok: true,
    stripe:
      stripeMrr?.dataSource === "stripe"
        ? {
            mrrCents: stripeMrr.mrrCents,
            payingCount: stripeMrr.payingCount,
            dataSource: "stripe" as const,
          }
        : null,
    billingRows,
  });
}
