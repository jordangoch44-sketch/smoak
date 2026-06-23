import type { PublicAuthRole } from "@/types/auth-roles";
import {
  CLIENT_DASHBOARD_PATH,
  getDashboardPathForRole,
  SPECIALIST_DASHBOARD_PATH,
} from "@/lib/auth-routes";
import { peekPendingSave } from "@/lib/pending-save-storage";
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
  const pendingId = peekPendingSave();
  const returnToSaved = options?.returnToSaved && role === "client";

  if (pendingId && role === "client") {
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

  if (pendingId && role === "specialist") {
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
