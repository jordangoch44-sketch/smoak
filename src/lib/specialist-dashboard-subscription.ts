import {
  DEMO_SPECIALIST_SUBSCRIPTION,
  DEMO_SPECIALIST_SUBSCRIPTION_FREE,
} from "@/constants/specialist-dashboard-mock";
import { resolveSessionIsPremium } from "@/lib/dev-auth";
import type { AuthSession } from "@/types/auth";
import type { SpecialistSubscription } from "@/types/specialist-dashboard";

/** DEV — subscription row for specialist dashboard from signed-in session */
export function getSpecialistSubscriptionForSession(
  session: AuthSession | null | undefined
): SpecialistSubscription {
  if (!session || session.role !== "specialist") {
    return { ...DEMO_SPECIALIST_SUBSCRIPTION_FREE };
  }

  if (resolveSessionIsPremium(session)) {
    return { ...DEMO_SPECIALIST_SUBSCRIPTION };
  }

  return {
    ...DEMO_SPECIALIST_SUBSCRIPTION_FREE,
    plan: "Free",
    status: "Active",
  };
}
