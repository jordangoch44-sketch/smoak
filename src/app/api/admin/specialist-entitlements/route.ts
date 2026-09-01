import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-api-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminSpecialistEntitlement } from "@/lib/admin-specialist-trial-service";

/**
 * Complimentary Pro trial + Stripe billing status keyed by specialist profile id.
 * Service-role read so Control can see user_roles trial columns.
 */
export async function GET() {
  if (!(await requireAdminApiAccess())) {
    return NextResponse.json(
      { ok: false, message: "Admin access required." },
      { status: 403 }
    );
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      byProfileId: {} as Record<string, AdminSpecialistEntitlement>,
    });
  }

  const { data: profiles, error: profileError } = await supabase
    .from("specialist_profiles")
    .select("id, user_id");

  if (profileError) {
    return NextResponse.json(
      { ok: false, message: profileError.message },
      { status: 502 }
    );
  }

  const userIds = [
    ...new Set(
      (profiles ?? [])
        .map((row) => String(row.user_id ?? "").trim())
        .filter(Boolean)
    ),
  ];

  const [rolesRes, billingRes] = await Promise.all([
    userIds.length
      ? supabase
          .from("user_roles")
          .select("user_id, premium_trial_started_at, premium_trial_ends_at")
          .eq("role", "specialist")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    userIds.length
      ? supabase
          .from("specialist_billing")
          .select("user_id, specialist_profile_id, status")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const rolesByUser = new Map<
    string,
    { trialStartedAt: string | null; trialEndsAt: string | null }
  >();
  for (const row of rolesRes.data ?? []) {
    const userId = String(
      (row as { user_id?: string }).user_id ?? ""
    ).trim();
    if (!userId) continue;
    rolesByUser.set(userId, {
      trialStartedAt:
        ((row as { premium_trial_started_at?: string | null })
          .premium_trial_started_at ?? null) as string | null,
      trialEndsAt:
        ((row as { premium_trial_ends_at?: string | null })
          .premium_trial_ends_at ?? null) as string | null,
    });
  }

  const billingByUser = new Map<string, string | null>();
  const billingByProfile = new Map<string, string | null>();
  for (const row of billingRes.data ?? []) {
    const userId = String(
      (row as { user_id?: string }).user_id ?? ""
    ).trim();
    const profileId = String(
      (row as { specialist_profile_id?: string | null })
        .specialist_profile_id ?? ""
    ).trim();
    const status = String((row as { status?: string }).status ?? "").trim() || null;
    if (userId) billingByUser.set(userId, status);
    if (profileId) billingByProfile.set(profileId, status);
  }

  const byProfileId: Record<string, AdminSpecialistEntitlement> = {};
  for (const profile of profiles ?? []) {
    const profileId = String(profile.id ?? "").trim();
    if (!profileId) continue;
    const userId = String(profile.user_id ?? "").trim() || null;
    const role = userId ? rolesByUser.get(userId) : undefined;
    byProfileId[profileId] = {
      userId,
      trialStartedAt: role?.trialStartedAt ?? null,
      trialEndsAt: role?.trialEndsAt ?? null,
      billingStatus:
        billingByProfile.get(profileId) ??
        (userId ? billingByUser.get(userId) ?? null : null),
    };
  }

  return NextResponse.json({ ok: true, byProfileId });
}
