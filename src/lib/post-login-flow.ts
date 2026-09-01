import type { PublicAuthRole } from "@/types/auth-roles";
import { getDashboardPathForRole } from "@/lib/auth-routes";
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
  const returnToSaved =
    Boolean(options?.returnToSaved) &&
    (role === "client" || role === "specialist");

  if (pendingId && (role === "client" || role === "specialist")) {
    return {
      path: returnToSaved ? "/saved" : getDashboardPathForRole(role),
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

  return {
    path: getDashboardPathForRole(role),
  };
}

/** Hard navigation after auth so proxy/cookies see the new session (avoids soft-nav bounce to /login). */
export function navigateAfterAuth(path: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(path);
}
