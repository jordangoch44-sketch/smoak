import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseMembershipPlan,
  type SpecialistMembershipPlan,
} from "@/lib/specialist-premium";
import { setSpecialistProfileMembership } from "@/lib/profiles/specialist-profiles-db";

export interface AdminPlanOverride {
  plan: SpecialistMembershipPlan;
  endsAt: string | null;
  grantedAt: string | null;
}

export function membershipPlanRank(plan: SpecialistMembershipPlan): number {
  if (plan === "platinum") return 2;
  if (plan === "premium") return 1;
  return 0;
}

export function higherMembershipPlan(
  a: SpecialistMembershipPlan,
  b: SpecialistMembershipPlan
): SpecialistMembershipPlan {
  return membershipPlanRank(a) >= membershipPlanRank(b) ? a : b;
}

export function isAdminOverrideActive(
  plan: string | null | undefined,
  endsAt: string | null | undefined,
  now = Date.now()
): plan is SpecialistMembershipPlan {
  if (plan !== "free" && plan !== "premium" && plan !== "platinum") {
    return false;
  }
  if (!endsAt) return true;
  const ms = Date.parse(endsAt);
  return Number.isFinite(ms) && ms > now;
}

export async function readActiveAdminOverride(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminPlanOverride | null> {
  const { data, error } = await supabase
    .from("specialist_billing")
    .select(
      "admin_override_plan, admin_override_ends_at, admin_override_granted_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (
    !isAdminOverrideActive(
      data.admin_override_plan,
      data.admin_override_ends_at
    )
  ) {
    return null;
  }

  return {
    plan: parseMembershipPlan(data.admin_override_plan),
    endsAt: data.admin_override_ends_at ?? null,
    grantedAt: data.admin_override_granted_at ?? null,
  };
}

export async function applySpecialistMembershipEntitlements(
  supabase: SupabaseClient,
  input: {
    userId: string | null;
    specialistProfileId: string;
    plan: SpecialistMembershipPlan;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const isPremium = input.plan !== "free";

  const profileResult = await setSpecialistProfileMembership(
    supabase,
    input.specialistProfileId,
    input.plan
  );
  if (!profileResult.ok) {
    console.warn(
      "[admin plan] specialist_profiles entitlement update failed:",
      profileResult.message
    );
  }

  const { data: profileRow } = await supabase
    .from("specialist_profiles")
    .select("user_id")
    .eq("id", input.specialistProfileId)
    .maybeSingle();
  const userId =
    input.userId ||
    (typeof profileRow?.user_id === "string" ? profileRow.user_id : null);

  if (!userId) return;

  const { error: roleError } = await supabase
    .from("user_roles")
    .update({
      is_premium: isPremium,
      updated_at: now,
    })
    .eq("user_id", userId);
  if (roleError) {
    console.warn(
      "[admin plan] user_roles is_premium update failed:",
      roleError.message
    );
  }
}
