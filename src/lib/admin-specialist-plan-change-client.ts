import { patchAdminSpecialistMeta } from "@/lib/admin-specialist-meta-store";
import { refreshAdminSpecialistDirectoryFromRemote } from "@/lib/admin-specialists-service";
import {
  patchApprovedSpecialistProfileFields,
  refreshApprovedSpecialistProfilesFromRemoteAsync,
} from "@/lib/approved-specialist-profiles-store";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { requestPublicCatalogRevalidate } from "@/lib/profiles/request-catalog-revalidate";
import { membershipPlanLabel } from "@/lib/stripe/products";
import type { SpecialistMembershipPlan } from "@/lib/specialist-premium";
import type {
  AdminPlanChangeDuration,
  AdminPlanChangeMethod,
  AdminPlanChangeResult,
} from "@/types/admin-specialist-plan-change";

function applyLocalPlan(specialistId: string, plan: SpecialistMembershipPlan) {
  patchAdminSpecialistMeta(specialistId, {
    isPremium: plan !== "free",
    membershipPlan: plan,
  });
  patchApprovedSpecialistProfileFields(specialistId, {
    isPremium: plan !== "free",
    membershipPlan: plan,
    verified: plan !== "free",
  });
}

export async function changeAdminSpecialistPlan(input: {
  specialistId: string;
  plan: SpecialistMembershipPlan;
  method: AdminPlanChangeMethod;
  duration?: AdminPlanChangeDuration;
}): Promise<AdminPlanChangeResult> {
  if (!isMarketplaceSupabaseActive()) {
    if (input.method === "checkout_link") {
      return {
        ok: false,
        message:
          "Checkout links need a live specialist login and Stripe. Use admin override in this environment.",
      };
    }
    applyLocalPlan(input.specialistId, input.plan);
    const planLabel = membershipPlanLabel(input.plan);
    return {
      ok: true,
      method: "admin_override",
      plan: input.plan,
      planLabel,
      overrideEndsAt:
        input.duration?.kind === "days"
          ? new Date(
              Date.now() + input.duration.days * 24 * 60 * 60 * 1000
            ).toISOString()
          : null,
      message: `Applied ${planLabel} locally (dev).`,
    };
  }

  try {
    const res = await fetch("/api/admin/specialists/change-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        specialistId: input.specialistId,
        plan: input.plan,
        method: input.method,
        duration: input.duration,
      }),
    });
    const data = (await res.json()) as AdminPlanChangeResult;
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        message:
          ("message" in data && data.message) ||
          "Could not change this plan.",
      };
    }

    if (data.method === "admin_override") {
      applyLocalPlan(input.specialistId, data.plan);
      requestPublicCatalogRevalidate();
      await refreshApprovedSpecialistProfilesFromRemoteAsync();
      await refreshAdminSpecialistDirectoryFromRemote();
    }

    return data;
  } catch {
    return { ok: false, message: "Network error. Try again." };
  }
}
