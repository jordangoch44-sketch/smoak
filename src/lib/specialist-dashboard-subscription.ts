import { DEMO_SPECIALIST_SUBSCRIPTION_FREE } from "@/constants/specialist-dashboard-mock";
import { resolveSessionIsPremium } from "@/lib/dev-auth";
import type { AuthSession } from "@/types/auth";
import type { SpecialistSubscription } from "@/types/specialist-dashboard";

/** Subscription row for specialist dashboard from signed-in session. */
export function getSpecialistSubscriptionForSession(
  session: AuthSession | null | undefined
): SpecialistSubscription {
  if (!session || session.role !== "specialist") {
    return { ...DEMO_SPECIALIST_SUBSCRIPTION_FREE };
  }

  if (resolveSessionIsPremium(session)) {
    if (session.premiumTrialActive && session.premiumTrialEndsAt) {
      const renewsOn = new Date(session.premiumTrialEndsAt).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      );
      const days = session.premiumTrialDaysRemaining;
      return {
        plan: "SMOAC Pro · Free trial",
        status:
          typeof days === "number"
            ? `Trial · ${days} day${days === 1 ? "" : "s"} left`
            : "Trial active",
        renewsOn,
        isPremium: true,
      };
    }
    /* Paid Pro / Pro Plus — renew date comes from Stripe billing-summary */
    return {
      plan:
        session.membershipPlan === "platinum" ? "SMOAC Pro Plus" : "SMOAC Pro",
      status: "Active",
      renewsOn: "—",
      isPremium: true,
    };
  }

  return {
    ...DEMO_SPECIALIST_SUBSCRIPTION_FREE,
    plan: "Free",
    status: "Active",
  };
}
