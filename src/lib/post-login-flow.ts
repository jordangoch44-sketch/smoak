import type { AuthRole } from "@/types/auth";
import {
  CLIENT_DASHBOARD_PATH,
  getDashboardPathForRole,
  SPECIALIST_DASHBOARD_PATH,
} from "@/lib/auth-routes";
import { applyPendingSaveAfterLogin } from "@/lib/specialist-saves";
import type { SaveToastOptions } from "@/contexts/SaveToastContext";

export interface PostLoginNavigation {
  path: string;
  toast?: SaveToastOptions;
}

/** DEV ONLY — dashboard route + toast after login with optional pending save */
export function resolvePostLoginNavigation(
  role: AuthRole
): PostLoginNavigation {
  const pendingResult = applyPendingSaveAfterLogin(role);

  if (pendingResult.kind === "client-saved") {
    return {
      path: CLIENT_DASHBOARD_PATH,
      toast: {
        title: "Specialist saved to your shortlist.",
        linkHref: "/saved",
        linkLabel: "View saved specialists →",
      },
    };
  }

  if (pendingResult.kind === "specialist-blocked") {
    return {
      path: SPECIALIST_DASHBOARD_PATH,
      toast: {
        title:
          "Specialist accounts cannot save trainers. Switch to a client account to save specialists.",
      },
    };
  }

  return {
    path: getDashboardPathForRole(role),
  };
}
