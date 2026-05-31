import type { PublicAuthRole } from "@/lib/dev-auth";
import {
  CLIENT_DASHBOARD_PATH,
  getDashboardPathForRole,
  SPECIALIST_DASHBOARD_PATH,
} from "@/lib/auth-routes";
import { applyPendingSaveAfterLogin } from "@/lib/specialist-saves";
import type { SaveToastOptions } from "@/lib/saved-ui";

export interface PostLoginNavigation {
  path: string;
  toast?: SaveToastOptions;
}

export interface PostLoginNavigationOptions {
  /** After auth from saved panel, land on /saved instead of dashboard */
  returnToSaved?: boolean;
}

/** DEV ONLY — dashboard route + toast after login with optional pending save */
export function resolvePostLoginNavigation(
  role: PublicAuthRole,
  options?: PostLoginNavigationOptions
): PostLoginNavigation {
  const pendingResult = applyPendingSaveAfterLogin(role);
  const returnToSaved = options?.returnToSaved && role === "client";

  if (pendingResult.kind === "client-saved") {
    return {
      path: returnToSaved ? "/saved" : CLIENT_DASHBOARD_PATH,
      toast: {
        title: "Specialist saved to your shortlist.",
        linkHref: "/saved",
        linkLabel: "View saved specialists →",
      },
    };
  }

  if (returnToSaved) {
    return { path: "/saved" };
  }

  if (pendingResult.kind === "specialist-blocked") {
    return {
      path: SPECIALIST_DASHBOARD_PATH,
      toast: {
        title:
          "Specialist accounts cannot save trainers. Switch to a client account to save specialists.",
        variant: "neutral",
      },
    };
  }

  return {
    path: getDashboardPathForRole(role),
  };
}
